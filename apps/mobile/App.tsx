import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL, checkApi, checkDb, type CheckResult } from './src/api/health';

const PLANNED_SCREENS = [
  { name: '홈', desc: '미제출 과제 마감순 목록 · 지연 표시' },
  { name: '등록·수정', desc: '과목명 · 제목 · 마감 · 메모' },
  { name: '상세', desc: '세부 작업 체크리스트 · 진행률 · 제출 완료' },
  { name: '설정', desc: '알림 권한 상태 · 앱 정보' },
];

const STATE_COLOR: Record<CheckResult['state'], string> = {
  ok: '#1f9d55',
  error: '#d64545',
  unconfigured: '#b7791f',
};

function StatusRow({ label, result }: { label: string; result: CheckResult | null }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: result ? STATE_COLOR[result.state] : '#a0aec0' }]} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusDetail}>{result ? result.detail : '확인 중…'}</Text>
    </View>
  );
}

export default function App() {
  const [api, setApi] = useState<CheckResult | null>(null);
  const [db, setDb] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setApi(null);
    setDb(null);
    const apiResult = await checkApi();
    setApi(apiResult);
    setDb(apiResult.state === 'ok' ? await checkDb() : { state: apiResult.state, detail: 'API 확인 후 검사' });
    setChecking(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>마감한칸</Text>
          <Text style={styles.subtitle}>과제를 작은 할 일로 나누고 마감과 진행률을 확인해요</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>개발 서버 연결</Text>
            <StatusRow label="API" result={api} />
            <StatusRow label="DB" result={db} />
            <Text style={styles.meta}>{API_BASE_URL ?? 'API 주소가 설정되지 않았습니다'}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={runChecks}
              disabled={checking}
              style={({ pressed }) => [styles.button, (pressed || checking) && styles.buttonPressed]}
            >
              {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>다시 확인</Text>}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>구현 예정 화면</Text>
            {PLANNED_SCREENS.map((s) => (
              <View key={s.name} style={styles.screenRow}>
                <Text style={styles.screenName}>{s.name}</Text>
                <Text style={styles.screenDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#1a202c', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#4a5568' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { width: 36, fontWeight: '600', color: '#2d3748' },
  statusDetail: { flex: 1, color: '#4a5568' },
  meta: { fontSize: 12, color: '#718096' },
  button: { backgroundColor: '#2b6cb0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonPressed: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  screenRow: { gap: 2 },
  screenName: { fontWeight: '600', color: '#2d3748' },
  screenDesc: { fontSize: 13, color: '#718096' },
});
