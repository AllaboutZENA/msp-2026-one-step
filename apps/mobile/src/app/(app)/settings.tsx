import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { API_BASE_URL, checkApi, checkDb, type CheckResult } from '../../lib/health';
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

export default function SettingsScreen() {
  const { state, logOut } = useAuth();
  const [apiStatus, setApiStatus] = useState<CheckResult | null>(null);
  const [dbStatus, setDbStatus] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);

  const runChecks = useCallback(async () => {
    setApiStatus(null);
    setDbStatus(null);
    const a = await checkApi();
    setApiStatus(a);
    setDbStatus(a.state === 'ok' ? await checkDb() : { state: a.state, detail: 'API 확인 후 검사' });
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

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
        <Text style={styles.muted}>마감 하루 전 로컬 알림은 10주차에 연결합니다. 실제 휴대폰에서 권한·예약을 먼저 실험합니다.</Text>
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
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { width: 36, fontWeight: '600', color: colors.ink2 },
  statusDetail: { flex: 1, color: colors.ink2 },
});
