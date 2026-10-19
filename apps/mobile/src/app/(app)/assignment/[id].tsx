import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, ProgressBar } from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { dueLabel, formatDue, isOverdue } from '../../../lib/format';
import { colors } from '../../../lib/theme';
import type { AssignmentDetail } from '../../../lib/types';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItem(await api.getAssignment(id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '과제를 불러오지 못했어요');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleSubmitted() {
    if (!item) return;
    setBusy(true);
    try {
      await api.updateAssignment(item.id, { submitted: !item.submittedAt });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '변경하지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!item) return;
    const extra = item.subtasks.length ? `\n세부 작업 ${item.subtasks.length}개도 함께 삭제돼요.` : '';
    Alert.alert('과제를 삭제할까요?', `"${item.title}"을(를) 삭제하면 되돌릴 수 없어요.${extra}`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: remove },
    ]);
  }

  async function remove() {
    if (!item) return;
    setBusy(true);
    try {
      await api.deleteAssignment(item.id);
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '삭제하지 못했어요');
      setBusy(false);
    }
  }

  if (!item) {
    return <View style={styles.content}>{error ? <Banner>{error}</Banner> : <Text style={styles.muted}>불러오는 중…</Text>}</View>;
  }

  const overdue = isOverdue(item);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: item.courseName }} />
      {!!error && <Banner>{error}</Banner>}

      <View style={styles.card}>
        <Text style={styles.course}>{item.courseName}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.due, overdue && { color: colors.danger }]}>
          {formatDue(item.dueAt)} 마감 · {item.submittedAt ? '제출 완료' : overdue ? `지연 (${dueLabel(item.dueAt)})` : dueLabel(item.dueAt)}
        </Text>
        {!!item.memo && <Text style={styles.memo}>{item.memo}</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.section}>세부 작업</Text>
          <Text style={styles.muted}>
            {item.progress.percent}% · {item.progress.done}/{item.progress.total}
          </Text>
        </View>
        <ProgressBar percent={item.progress.percent} />
        {item.subtasks.length === 0 ? (
          <Text style={styles.muted}>세부 작업이 없어요. 추가·체크 기능은 9주차에 연결됩니다.</Text>
        ) : (
          item.subtasks.map((s) => (
            <Text key={s.id} style={[styles.subtask, s.isDone && styles.subtaskDone]}>
              {s.isDone ? '☑' : '☐'} {s.title}
            </Text>
          ))
        )}
      </View>

      <Button
        label={item.submittedAt ? '제출 완료 되돌리기' : '제출 완료로 표시'}
        variant={item.submittedAt ? 'secondary' : 'primary'}
        onPress={toggleSubmitted}
        busy={busy}
      />
      <Text style={styles.muted}>진행률이 100%여도 자동으로 제출 완료되지 않아요. 실제로 제출한 뒤 눌러 주세요.</Text>

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button
            label="수정"
            variant="secondary"
            onPress={() => router.push({ pathname: '/edit/[id]', params: { id: item.id } })}
            disabled={busy}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="삭제" variant="danger" onPress={confirmDelete} disabled={busy} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8 },
  course: { fontSize: 13, fontWeight: '600', color: colors.accent },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  due: { fontSize: 14, color: colors.ink2 },
  memo: { fontSize: 14, color: colors.ink2, marginTop: 4, lineHeight: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink },
  subtask: { fontSize: 15, color: colors.ink },
  subtaskDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  muted: { fontSize: 13, color: colors.ink3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
