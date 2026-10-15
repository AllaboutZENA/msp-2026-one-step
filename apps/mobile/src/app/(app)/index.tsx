import { Link, Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

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

      {!!error && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Banner>{error}</Banner>
        </View>
      )}

      <FlatList
        data={items ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          items === null ? (
            <Text style={styles.empty}>불러오는 중…</Text>
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
