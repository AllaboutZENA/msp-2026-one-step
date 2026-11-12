import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDue } from '../../lib/format';
import { API_BASE_URL, checkApi, checkDb, type CheckResult } from '../../lib/health';
import {
  permissionState,
  remindersEnabled,
  requestPermission,
  scheduledSummary,
  sendTestReminder,
  setRemindersEnabled,
  syncReminders,
  type PermissionState,
} from '../../lib/reminders';
import { colors } from '../../lib/theme';

const STATE_COLOR: Record<CheckResult['state'], string> = { ok: colors.ok, error: colors.danger, unconfigured: colors.warn };

function StatusRow({ label, result }: { label: string; result: CheckResult | null }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: result ? STATE_COLOR[result.state] : colors.line }]} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusDetail}>{result ? result.detail : '확인 중…'}</Text>
    </View>
  );
}

interface ReminderInfo {
  permission: PermissionState;
  enabled: boolean;
  count: number;
  next: { title: string; fireAt: string } | null;
}

async function reminderInfo(): Promise<ReminderInfo> {
  const [permission, enabled, summary] = await Promise.all([permissionState(), remindersEnabled(), scheduledSummary()]);
  return { permission, enabled, ...summary };
}

async function checkAll(): Promise<[CheckResult, CheckResult]> {
  const a = await checkApi();
  return [a, a.state === 'ok' ? await checkDb() : { state: a.state, detail: 'API 확인 후 검사' }];
}

export default function SettingsScreen() {
  const { state, logOut } = useAuth();
  const [apiStatus, setApiStatus] = useState<CheckResult | null>(null);
  const [dbStatus, setDbStatus] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState<ReminderInfo | null>(null);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  // Re-sync with the open list, then show what the phone now holds.
  const resync = useCallback(async () => {
    try {
      await syncReminders(await api.listAssignments('open'));
      setReminderMsg(null);
    } catch {
      setReminderMsg('알림을 예약하지 못했어요. 과제는 그대로 저장되어 있어요.');
    }
    setReminders(await reminderInfo());
  }, []);

  const runChecks = useCallback(async () => {
    setApiStatus(null);
    setDbStatus(null);
    const [a, d] = await checkAll();
    setApiStatus(a);
    setDbStatus(d);
  }, []);

  // State starts as "확인 중…", so the first check only fills in results.
  useEffect(() => {
    let alive = true;
    checkAll().then(([a, d]) => {
      if (!alive) return;
      setApiStatus(a);
      setDbStatus(d);
    });
    // Sync first so the summary reflects the latest list, even if home's sync is still running.
    api
      .listAssignments('open')
      .then(syncReminders)
      .catch(() => null)
      .then(reminderInfo)
      .then((info) => alive && setReminders(info));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.section}>계정</Text>
        {state.status === 'signedIn' && (
          <>
            <Text style={styles.value}>{state.user.displayName}</Text>
            <Text style={styles.muted}>{state.user.email}</Text>
          </>
        )}
        <Button
          label="로그아웃"
          variant="secondary"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            await logOut();
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>서버 연결</Text>
        <StatusRow label="API" result={apiStatus} />
        <StatusRow label="DB" result={dbStatus} />
        <Text style={styles.muted}>{API_BASE_URL ?? 'API 주소 미설정'}</Text>
        <Button label="다시 확인" variant="secondary" onPress={runChecks} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>알림</Text>
        <View style={styles.switchRow}>
          <Text style={styles.value}>마감 하루 전 알림</Text>
          <Switch
            testID="reminder-switch"
            accessibilityLabel="마감 하루 전 알림"
            value={reminders?.enabled ?? true}
            disabled={!reminders}
            onValueChange={async (on) => {
              await setRemindersEnabled(on);
              await resync();
            }}
          />
        </View>
        {reminders?.permission === 'undetermined' && (
          <Button
            label="알림 허용하기"
            variant="secondary"
            onPress={async () => {
              await requestPermission().catch(() => null);
              await resync();
            }}
          />
        )}
        {reminders?.permission === 'denied' && (
          <>
            <Text style={styles.muted}>
              알림이 꺼져 있어요. 휴대폰 설정에서 Expo Go 알림을 허용하면 마감 하루 전에 알려 드려요. 알림 없이도 다른 기능은 그대로 쓸 수
              있어요.
            </Text>
            <Button label="휴대폰 설정 열기" variant="secondary" onPress={() => Linking.openSettings()} />
          </>
        )}
        {reminders?.permission === 'granted' && reminders.enabled && (
          <>
            <Text testID="reminder-summary" style={styles.muted}>
              {reminders.count > 0 && reminders.next
                ? `예약된 알림 ${reminders.count}개 · 다음 ${formatDue(reminders.next.fireAt)} · ${reminders.next.title}`
                : '예약된 알림이 없어요. 마감까지 하루 넘게 남은 미제출 과제가 생기면 예약돼요.'}
            </Text>
            <Button
              label="테스트 알림 보내기 (5초 뒤)"
              variant="secondary"
              onPress={async () => {
                await sendTestReminder(5);
                setReminderMsg('5초 뒤에 알림이 와요. 홈 화면으로 나가서 확인해 보세요.');
              }}
            />
          </>
        )}
        {!!reminderMsg && <Text style={styles.muted}>{reminderMsg}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>데이터 안내</Text>
        <Text style={styles.muted}>과제는 학교 프로젝트용 서버(AWS)에 저장돼요. 학기 시연용이므로 중요한 개인정보는 입력하지 마세요.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink },
  value: { fontSize: 16, color: colors.ink },
  muted: { fontSize: 13, color: colors.ink3, lineHeight: 19 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { width: 36, fontWeight: '600', color: colors.ink2 },
  statusDetail: { flex: 1, color: colors.ink2 },
});
