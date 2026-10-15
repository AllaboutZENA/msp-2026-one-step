import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Field } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { defaultDue, formatDue } from '../../lib/format';
import { colors } from '../../lib/theme';

export default function NewAssignmentScreen() {
  const [courseName, setCourseName] = useState('');
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState(defaultDue());
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  // Editing a field clears its error message.
  const edit = (key: string, setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (fields[key]) setFields(({ [key]: _removed, ...rest }) => rest);
  };

  async function save() {
    setError(null);
    const local: Record<string, string> = {};
    if (!courseName.trim()) local.courseName = '과목명을 입력해 주세요';
    if (!title.trim()) local.title = '제목을 입력해 주세요';
    setFields(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      await api.createAssignment({ courseName: courseName.trim(), title: title.trim(), dueAt: dueAt.toISOString(), memo: memo.trim() || null });
      router.back();
    } catch (err) {
      // Keep everything the user typed so they can retry (T12).
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.status === 0 ? `${err.message}. 입력한 내용은 그대로 남아 있어요.` : err.message);
      } else {
        setError('저장하지 못했어요. 다시 시도해 주세요');
      }
    } finally {
      setBusy(false);
    }
  }

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: dueAt,
      mode: 'date',
      onChange: (_e, date) =>
        date &&
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (_e2, time) => time && setDueAt(time),
        }),
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!!error && <Banner>{error}</Banner>}
        <Field label="과목명" testID="course-input" value={courseName} onChangeText={edit('courseName', setCourseName)} placeholder="예: 모바일 SW" maxLength={100} error={fields.courseName} />
        <Field label="제목" testID="title-input" value={title} onChangeText={edit('title', setTitle)} placeholder="예: 주간 보고서 작성" maxLength={200} error={fields.title} />

        <View style={styles.dueBox}>
          <Text style={styles.label}>마감 일시</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={dueAt}
              mode="datetime"
              display="compact"
              onChange={(_e, date) => date && setDueAt(date)}
              accessibilityLabel="마감 일시"
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <Pressable accessibilityRole="button" onPress={openAndroidPicker} style={styles.androidDue}>
              <Text style={styles.androidDueText}>{formatDue(dueAt.toISOString())}</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>{formatDue(dueAt.toISOString())} (휴대폰 현지 시간)</Text>
          {!!fields.dueAt && <Text style={styles.error}>{fields.dueAt}</Text>}
        </View>

        <Field label="메모 (선택)" testID="memo-input" value={memo} onChangeText={edit('memo', setMemo)} multiline maxLength={2000} placeholder="제출 방법, 분량 등" error={fields.memo} />
        <Button label="저장" onPress={save} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  dueBox: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  hint: { fontSize: 12.5, color: colors.ink3 },
  error: { fontSize: 12.5, color: colors.danger },
  androidDue: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12 },
  androidDueText: { fontSize: 16, color: colors.ink },
});
