import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AssignmentForm } from '../../../components/AssignmentForm';
import { Banner } from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { colors } from '../../../lib/theme';
import type { Assignment } from '../../../lib/types';

export default function EditAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAssignment(id)
      .then(setItem)
      .catch((err) => setError(err instanceof ApiError ? err.message : '과제를 불러오지 못했어요'));
  }, [id]);

  if (!item) {
    return <View style={styles.content}>{error ? <Banner>{error}</Banner> : <Text style={styles.muted}>불러오는 중…</Text>}</View>;
  }

  return (
    <AssignmentForm
      initial={{ courseName: item.courseName, title: item.title, dueAt: new Date(item.dueAt), memo: item.memo ?? '' }}
      submitLabel="변경 저장"
      onSubmit={async (input) => {
        await api.updateAssignment(item.id, input);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  muted: { fontSize: 13, color: colors.ink3 },
});
