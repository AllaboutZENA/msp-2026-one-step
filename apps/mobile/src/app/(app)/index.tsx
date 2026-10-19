import { Link, Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, ProgressBar } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { dueLabel, formatDue, isOverdue } from '../../lib/format';
import { colors } from '../../lib/theme';
import type { Assignment } from '../../lib/types';

type Tab = 'open' | 'submitted';

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('open');
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Course filter is applied on the phone: the list is already per-user and small.
  const [course, setCourse] = useState<string | null>(null);
  const courses = useMemo(() => {
    const names = new Set((items ?? []).map((a) => a.courseName));
    if (course) names.add(course);
    return [...names].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [items, course]);
  const visible = useMemo(() => (course ? (items ?? []).filter((a) => a.courseName === course) : (items ?? [])), [items, course]);

  const load = useCallback(async (which: Tab) => {
    try {
      setItems(await api.listAssignments(which));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '목록을 불러오지 못했어요');
    }
  }, []);

  // Re-fetch whenever the screen regains focus (e.g. after creating one).
  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [load, tab]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityRole="button" hitSlop={10}>
                <Text style={styles.headerLink}>설정</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <View style={styles.tabs}>
        {(['open', 'submitted'] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => {
              setTab(t);
              setItems(null);
            }}
            style={[styles.tab, tab === t && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'open' ? '미제출 · 마감순' : '제출 완료'}</Text>
          </Pressable>
        ))}
      </View>

      {courses.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipBar}>
          {[null, ...courses].map((c) => (
            <Pressable
              key={c ?? '__all'}
              testID={c ? `filter-${c}` : 'filter-all'}
              accessibilityRole="button"
              accessibilityLabel={`과목 필터 ${c ?? '전체'}`}
              accessibilityState={{ selected: course === c }}
              onPress={() => setCourse(c)}
              style={[styles.chip, course === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, course === c && styles.chipTextOn]}>{c ?? '전체'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {!!error && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Banner>{error}</Banner>
        </View>
      )}

      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          items === null ? (
            <Text style={styles.empty}>불러오는 중…</Text>
          ) : course ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{`'${course}' 과목의 ${tab === 'open' ? '남은' : '제출한'} 과제가 없어요`}</Text>
              <Pressable accessibilityRole="button" onPress={() => setCourse(null)} hitSlop={8}>
                <Text style={styles.headerLink}>전체 과목 보기</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{tab === 'open' ? '남은 과제가 없어요' : '아직 제출한 과제가 없어요'}</Text>
              {tab === 'open' && <Text style={styles.empty}>아래 버튼으로 첫 과제를 등록해 보세요.</Text>}
            </View>
          )
        }
        renderItem={({ item }) => <AssignmentRow item={item} />}
      />

      <View style={styles.footer}>
        <Button label="+ 과제 등록" onPress={() => router.push('/new')} />
      </View>
    </View>
  );
}

function AssignmentRow({ item }: { item: Assignment }) {
  const overdue = isOverdue(item);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/assignment/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${item.courseName} ${item.title}, ${formatDue(item.dueAt)} 마감${overdue ? ', 지연' : ''}, 진행률 ${item.progress.percent}%`}
      style={({ pressed }) => [styles.row, overdue && styles.rowOverdue, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowTop}>
        <Text style={styles.course}>{item.courseName}</Text>
        {item.submittedAt ? (
          <Text style={[styles.badge, styles.badgeOk]}>제출 완료</Text>
        ) : (
          <Text style={[styles.badge, overdue ? styles.badgeLate : styles.badgeDue]}>{overdue ? `지연 · ${dueLabel(item.dueAt)}` : dueLabel(item.dueAt)}</Text>
        )}
      </View>
      <Text style={styles.rowTitle}>{item.title}</Text>
      <Text style={styles.due}>{formatDue(item.dueAt)} 마감</Text>
      <View style={styles.progressRow}>
        <View style={{ flex: 1 }}>
          <ProgressBar percent={item.progress.percent} />
        </View>
        <Text style={styles.percent}>
          {item.progress.percent}% · {item.progress.done}/{item.progress.total}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerLink: { color: colors.accent, fontSize: 16 },
  tabs: { flexDirection: 'row', margin: 16, marginBottom: 8, backgroundColor: colors.line, borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: colors.surface },
  tabText: { color: colors.ink3, fontWeight: '600' },
  tabTextOn: { color: colors.ink },
  chipBar: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13.5, color: colors.ink2, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  list: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 100 },
  row: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.surface },
  rowOverdue: { borderColor: colors.danger },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  course: { fontSize: 12.5, fontWeight: '600', color: colors.accent },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  badgeDue: { color: colors.ink2, backgroundColor: colors.bg },
  badgeLate: { color: '#fff', backgroundColor: colors.danger },
  badgeOk: { color: '#fff', backgroundColor: colors.ok },
  rowTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  due: { fontSize: 13, color: colors.ink2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  percent: { fontSize: 12.5, color: colors.ink3, fontVariant: ['tabular-nums'] },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink2 },
  empty: { fontSize: 14, color: colors.ink3, textAlign: 'center' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 28 },
});
