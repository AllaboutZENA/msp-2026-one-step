import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, Field } from '../components/ui';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

export default function LoginScreen() {
  const { state, logIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const edit = (key: string, setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (fields[key]) setFields(({ [key]: _removed, ...rest }) => rest);
  };

  if (state.status === 'signedIn') return <Redirect href="/" />;

  async function submit() {
    setError(null);
    setFields({});
    const local: Record<string, string> = {};
    if (!email.trim()) local.email = '이메일을 입력해 주세요';
    if (mode === 'signup' && password.length < 8) local.password = '비밀번호는 8자 이상이어야 해요';
    if (mode === 'login' && !password) local.password = '비밀번호를 입력해 주세요';
    if (Object.keys(local).length) return setFields(local);

    setBusy(true);
    try {
      if (mode === 'login') await logIn(email.trim(), password);
      else await signUp(email.trim(), password, displayName.trim() || undefined);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.message);
      } else {
        setError('알 수 없는 오류가 발생했어요');
      }
    } finally {
      setBusy(false);
    }
  }

  const notice = state.status === 'signedOut' ? state.notice : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text style={styles.title}>마감한칸</Text>
            <Text style={styles.subtitle}>과제를 작은 할 일로 나누고 마감과 진행률을 확인해요</Text>
          </View>

          <View style={styles.tabs} accessibilityRole="tablist">
            {(['login', 'signup'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => {
                  setMode(m);
                  setError(null);
                  setFields({});
                }}
                style={[styles.tab, mode === m && styles.tabOn]}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'login' ? '로그인' : '회원가입'}</Text>
              </Pressable>
            ))}
          </View>

          {!!notice && <Banner tone="info">{notice}</Banner>}
          {!!error && <Banner>{error}</Banner>}

          <Field
            label="이메일"
            testID="email-input"
            value={email}
            onChangeText={edit('email', setEmail)}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            error={fields.email}
          />
          <Field
            label="비밀번호"
            testID="password-input"
            value={password}
            onChangeText={edit('password', setPassword)}
            secureTextEntry
            textContentType={mode === 'login' ? 'password' : 'newPassword'}
            placeholder={mode === 'signup' ? '8자 이상' : undefined}
            error={fields.password}
          />
          {mode === 'signup' && (
            <Field label="이름 (선택)" testID="name-input" value={displayName} onChangeText={edit('displayName', setDisplayName)} placeholder="앱에 표시할 이름" error={fields.displayName} />
          )}

          <Button label={mode === 'login' ? '로그인' : '가입하고 시작하기'} onPress={submit} busy={busy} />
          <Text style={styles.hint}>HTTPS 연결 전까지는 실제로 쓰는 비밀번호 대신 테스트용 비밀번호를 사용해 주세요.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, gap: 16, paddingTop: 48 },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.ink2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: colors.surface },
  tabText: { color: colors.ink3, fontWeight: '600' },
  tabTextOn: { color: colors.ink },
  hint: { fontSize: 12.5, color: colors.ink3, lineHeight: 18 },
});
