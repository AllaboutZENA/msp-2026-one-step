import * as Notifications from 'expo-notifications';
import { Redirect, router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function AppLayout() {
  const { state } = useAuth();
  const response = Notifications.useLastNotificationResponse();
  const signedIn = state.status === 'signedIn';

  // Tapping a deadline reminder opens that assignment.
  useEffect(() => {
    const id = response?.notification.request.content.data?.assignmentId;
    if (!signedIn || typeof id !== 'string') return;
    Notifications.clearLastNotificationResponse();
    router.push({ pathname: '/assignment/[id]', params: { id } });
  }, [response, signedIn]);
  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (state.status === 'signedOut') return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.ink },
        headerBackTitle: '뒤로',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: '마감한칸' }} />
      <Stack.Screen name="new" options={{ title: '과제 등록', presentation: 'modal' }} />
      <Stack.Screen name="assignment/[id]" options={{ title: '과제 상세' }} />
      <Stack.Screen name="edit/[id]" options={{ title: '과제 수정', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: '설정' }} />
    </Stack>
  );
}
