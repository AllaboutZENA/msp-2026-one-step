// Which deadline reminders should exist right now, and what has to change to
// get there. Pure (no React Native imports) so the rules are unit-tested.
import { formatDue } from './format';

export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // R07: one day before the deadline
export const REMINDER_PREFIX = 'due-';

export interface ReminderSource {
  id: string;
  courseName: string;
  title: string;
  dueAt: string;
  submittedAt: string | null;
}

export interface PlannedReminder {
  identifier: string;
  assignmentId: string;
  fireAt: string; // ISO instant
  title: string;
  body: string;
}

/** What the OS currently holds for one of our reminders (from its content.data). */
export interface ScheduledReminder {
  identifier: string;
  fireAt?: unknown;
  title?: unknown;
}

export function planReminders(assignments: ReminderSource[], now = new Date()): PlannedReminder[] {
  return assignments
    .filter((a) => a.submittedAt === null) // submitted work needs no reminder (T11)
    .map((a) => ({ a, fireAt: new Date(new Date(a.dueAt).getTime() - REMINDER_LEAD_MS) }))
    .filter(({ fireAt }) => fireAt.getTime() > now.getTime()) // never schedule a reminder in the past (T10)
    .sort((x, y) => x.fireAt.getTime() - y.fireAt.getTime())
    .map(({ a, fireAt }) => ({
      identifier: REMINDER_PREFIX + a.id,
      assignmentId: a.id,
      fireAt: fireAt.toISOString(),
      title: `내일 마감 · ${a.title}`,
      body: `${a.courseName} · ${formatDue(a.dueAt)} 마감`,
    }));
}

/**
 * Cancel reminders that are no longer wanted or changed, schedule new or
 * changed ones, and leave identical ones alone (T11: re-schedule only when needed).
 */
export function diffReminders(planned: PlannedReminder[], scheduled: ScheduledReminder[]) {
  const ours = scheduled.filter((s) => s.identifier.startsWith(REMINDER_PREFIX));
  const wanted = new Map(planned.map((p) => [p.identifier, p]));
  const unchanged = new Set(
    ours.filter((s) => {
      const p = wanted.get(s.identifier);
      return p && p.fireAt === s.fireAt && p.title === s.title;
    }).map((s) => s.identifier),
  );
  return {
    toCancel: ours.filter((s) => !unchanged.has(s.identifier)).map((s) => s.identifier),
    toSchedule: planned.filter((p) => !unchanged.has(p.identifier)),
  };
}
