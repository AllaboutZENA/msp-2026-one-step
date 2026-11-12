// Rules for deadline reminders (R07). Times are fixed so the tests never depend on the clock.
import { describe, expect, it } from 'vitest';

import { diffReminders, planReminders, REMINDER_PREFIX } from '../src/lib/reminderPlan';

const now = new Date('2026-11-12T03:00:00Z'); // 12:00 KST
const a = (id: string, dueAt: string, submittedAt: string | null = null) => ({
  id,
  courseName: '운영체제',
  title: `과제 ${id}`,
  dueAt,
  submittedAt,
});

describe('planReminders', () => {
  it('reminds one day before each open deadline, soonest first', () => {
    const plan = planReminders([a('b', '2026-11-20T14:59:00Z'), a('a', '2026-11-14T14:59:00Z')], now);
    expect(plan.map((p) => [p.identifier, p.fireAt])).toEqual([
      [REMINDER_PREFIX + 'a', '2026-11-13T14:59:00.000Z'],
      [REMINDER_PREFIX + 'b', '2026-11-19T14:59:00.000Z'],
    ]);
    expect(plan[0]).toMatchObject({ assignmentId: 'a', title: '내일 마감 · 과제 a' });
    expect(plan[0].body).toMatch(/^운영체제 · .+ 마감$/);
  });

  it('skips reminders whose time has already passed (T10)', () => {
    const plan = planReminders(
      [
        a('past', '2026-11-10T14:59:00Z'), // deadline already over
        a('soon', '2026-11-12T20:00:00Z'), // due in 17 hours: reminder time was yesterday
        a('edge', '2026-11-13T03:00:00Z'), // reminder exactly now: not in the future
        a('ok', '2026-11-13T03:01:00Z'),
      ],
      now,
    );
    expect(plan.map((p) => p.assignmentId)).toEqual(['ok']);
  });

  it('skips submitted assignments (T11)', () => {
    expect(planReminders([a('done', '2026-11-20T14:59:00Z', '2026-11-11T00:00:00Z')], now)).toEqual([]);
  });
});

describe('diffReminders (T11)', () => {
  const plan = planReminders([a('keep', '2026-11-20T14:59:00Z'), a('moved', '2026-11-25T14:59:00Z'), a('new', '2026-11-30T14:59:00Z')], now);
  const byId = Object.fromEntries(plan.map((p) => [p.assignmentId, p]));

  it('keeps identical reminders, replaces changed ones, cancels unwanted ones', () => {
    const scheduled = [
      { identifier: byId.keep.identifier, fireAt: byId.keep.fireAt, title: byId.keep.title },
      { identifier: byId.moved.identifier, fireAt: '2026-11-21T14:59:00.000Z', title: byId.moved.title }, // deadline edited
      { identifier: REMINDER_PREFIX + 'deleted', fireAt: '2026-11-22T14:59:00.000Z', title: '내일 마감 · 지운 과제' },
      { identifier: 'not-ours', fireAt: 'x', title: 'x' }, // e.g. the test notification
    ];
    const { toCancel, toSchedule } = diffReminders(plan, scheduled);
    expect(toCancel.sort()).toEqual([REMINDER_PREFIX + 'deleted', REMINDER_PREFIX + 'moved']);
    expect(toSchedule.map((p) => p.assignmentId).sort()).toEqual(['moved', 'new']);
  });

  it('re-schedules when the title changed', () => {
    const { toCancel, toSchedule } = diffReminders([byId.keep], [{ identifier: byId.keep.identifier, fireAt: byId.keep.fireAt, title: '내일 마감 · 옛 제목' }]);
    expect(toCancel).toEqual([byId.keep.identifier]);
    expect(toSchedule).toEqual([byId.keep]);
  });

  it('cancels everything of ours when nothing is planned (e.g. all submitted)', () => {
    const { toCancel, toSchedule } = diffReminders([], [{ identifier: byId.keep.identifier, fireAt: byId.keep.fireAt, title: byId.keep.title }]);
    expect(toCancel).toEqual([byId.keep.identifier]);
    expect(toSchedule).toEqual([]);
  });
});
