// Local deadline reminders on the phone (R07). The server never pushes; the app
// keeps the OS schedule in line with the open assignments it last loaded.
// Reminder failures never affect saved data: callers get an error to show.
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { diffReminders, planReminders, REMINDER_PREFIX, type PlannedReminder, type ReminderSource } from './reminderPlan';

const PREF_KEY = 'magam-hankan.reminders'; // 'off' when the user turned reminders off

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function permissionState(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function remindersEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PREF_KEY).catch(() => null)) !== 'off';
}

export async function setRemindersEnabled(on: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREF_KEY, on ? 'on' : 'off');
}

async function ourScheduled() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((r) => r.identifier.startsWith(REMINDER_PREFIX));
}

export async function cancelAllReminders(): Promise<void> {
  for (const r of await ourScheduled()) await Notifications.cancelScheduledNotificationAsync(r.identifier);
}

export interface SyncResult {
  state: 'scheduled' | 'off' | PermissionState;
  count: number;
  next: PlannedReminder | null;
}

/** Make the OS schedule match the given open assignments. */
export async function syncReminders(open: ReminderSource[]): Promise<SyncResult> {
  const permission = await permissionState();
  if (!(await remindersEnabled()) || permission !== 'granted') {
    await cancelAllReminders();
    return { state: permission === 'granted' ? 'off' : permission, count: 0, next: null };
  }
  const planned = planReminders(open);
  const scheduled = (await ourScheduled()).map((r) => ({
    identifier: r.identifier,
    fireAt: r.content.data?.fireAt,
    title: r.content.title,
  }));
  const { toCancel, toSchedule } = diffReminders(planned, scheduled);
  for (const id of toCancel) await Notifications.cancelScheduledNotificationAsync(id);
  for (const p of toSchedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.identifier,
      content: { title: p.title, body: p.body, data: { assignmentId: p.assignmentId, fireAt: p.fireAt } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(p.fireAt) },
    });
  }
  return { state: 'scheduled', count: planned.length, next: planned[0] ?? null };
}

/** What is scheduled right now, soonest first (for the settings screen). */
export async function scheduledSummary(): Promise<{ count: number; next: { title: string; fireAt: string } | null }> {
  const items = (await ourScheduled())
    .map((r) => ({ title: String(r.content.title ?? ''), fireAt: String(r.content.data?.fireAt ?? '') }))
    .filter((r) => r.fireAt)
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt));
  return { count: items.length, next: items[0] ?? null };
}

/** A one-off reminder a few seconds from now, to check delivery on a real phone. */
export async function sendTestReminder(seconds = 5): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: '마감한칸 알림 테스트', body: '마감 하루 전에 이런 알림이 와요.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}
