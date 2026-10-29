// Checklist of an assignment's subtasks (R03) with its progress (R04).
// Every change goes to the API; the response's progress replaces the shown one,
// so the bar never drifts from the server's calculation. A checkbox flips
// immediately and flips back if the request fails.
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '../lib/api';
import { colors } from '../lib/theme';
import type { Progress, Subtask } from '../lib/types';
import { Banner, ProgressBar } from './ui';

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export function SubtaskList({
  assignmentId,
  subtasks,
  progress,
  submitted,
  onChange,
}: {
  assignmentId: string;
  subtasks: Subtask[];
  progress: Progress;
  submitted: boolean;
  onChange: (subtasks: Subtask[], progress: Progress) => void;
}) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api.addSubtask(assignmentId, title);
      onChange([...subtasks, res.subtask], res.progress);
      setDraft('');
    } catch (err) {
      setError(message(err, '세부 작업을 추가하지 못했어요'));
    } finally {
      setAdding(false);
    }
  }

  async function toggle(s: Subtask) {
    setError(null);
    const flipped = subtasks.map((x) => (x.id === s.id ? { ...x, isDone: !s.isDone } : x));
    onChange(flipped, progress);
    try {
      const res = await api.updateSubtask(assignmentId, s.id, { isDone: !s.isDone });
      onChange(
        flipped.map((x) => (x.id === s.id ? res.subtask : x)),
        res.progress,
      );
    } catch (err) {
      onChange(subtasks, progress);
      setError(message(err, '변경하지 못했어요'));
    }
  }

  async function rename() {
    if (!editing) return;
    const current = subtasks.find((x) => x.id === editing.id);
    const title = editing.title.trim();
    setEditing(null);
    if (!current || !title || title === current.title) return;
    try {
      const res = await api.updateSubtask(assignmentId, current.id, { title });
      onChange(
        subtasks.map((x) => (x.id === current.id ? res.subtask : x)),
        res.progress,
      );
    } catch (err) {
      setError(message(err, '이름을 바꾸지 못했어요'));
    }
  }

  function confirmRemove(s: Subtask) {
    Alert.alert('세부 작업을 삭제할까요?', `"${s.title}"`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.deleteSubtask(assignmentId, s.id);
            onChange(
              subtasks.filter((x) => x.id !== s.id),
              res.progress,
            );
          } catch (err) {
            setError(message(err, '삭제하지 못했어요'));
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.section}>세부 작업</Text>
        <Text testID="progress-text" style={styles.count}>
          {progress.percent}% · {progress.done}/{progress.total}
        </Text>
      </View>
      <ProgressBar percent={progress.percent} />
      {!!error && <Banner>{error}</Banner>}

      {subtasks.length === 0 ? (
        <Text style={styles.muted}>할 일을 작게 나눠 추가해 보세요. 완료한 만큼 진행률이 올라가요.</Text>
      ) : (
        subtasks.map((s, i) => (
          <View key={s.id} style={styles.item}>
            <Pressable
              testID={`subtask-check-${i}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.isDone }}
              accessibilityLabel={`${s.title} 완료`}
              hitSlop={8}
              onPress={() => toggle(s)}
              style={[styles.box, s.isDone && styles.boxOn]}
            >
              {s.isDone && <Text style={styles.tick}>✓</Text>}
            </Pressable>
            {editing?.id === s.id ? (
              <TextInput
                testID={`subtask-edit-${i}`}
                autoFocus
                value={editing.title}
                onChangeText={(title) => setEditing({ id: s.id, title })}
                onSubmitEditing={rename}
                onBlur={rename}
                returnKeyType="done"
                maxLength={200}
                style={[styles.itemText, styles.editInput]}
              />
            ) : (
              <Pressable style={{ flex: 1 }} onPress={() => setEditing({ id: s.id, title: s.title })} accessibilityHint="눌러서 이름 바꾸기">
                <Text style={[styles.itemText, s.isDone && styles.itemDone]}>{s.title}</Text>
              </Pressable>
            )}
            <Pressable
              testID={`subtask-delete-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${s.title} 삭제`}
              hitSlop={8}
              onPress={() => confirmRemove(s)}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.addRow}>
        <TextInput
          testID="subtask-input"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="세부 작업 추가 (예: 자료 조사)"
          placeholderTextColor={colors.ink3}
          maxLength={200}
          style={styles.addInput}
        />
        <Pressable
          testID="subtask-add"
          accessibilityRole="button"
          onPress={add}
          disabled={!draft.trim() || adding}
          style={[styles.addButton, (!draft.trim() || adding) && { opacity: 0.4 }]}
        >
          <Text style={styles.addText}>추가</Text>
        </Pressable>
      </View>

      {progress.total > 0 && progress.percent === 100 && !submitted && (
        <Banner tone="info">모든 세부 작업을 마쳤어요. 실제로 제출했다면 아래에서 제출 완료로 표시해 주세요.</Banner>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink },
  count: { fontSize: 13, color: colors.ink3, fontVariant: ['tabular-nums'] },
  muted: { fontSize: 13, color: colors.ink3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ok, borderColor: colors.ok },
  tick: { color: '#fff', fontSize: 14, fontWeight: '800' },
  itemText: { fontSize: 15, color: colors.ink },
  itemDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  editInput: { flex: 1, borderBottomWidth: 1, borderColor: colors.accent, paddingVertical: 2 },
  remove: { fontSize: 15, color: colors.ink3, paddingHorizontal: 4 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  addButton: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
});
