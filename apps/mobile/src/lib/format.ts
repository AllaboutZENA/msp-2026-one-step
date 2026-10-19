// Dates are stored as UTC instants and shown in the phone's local time zone.
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDue(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isOverdue(a: { dueAt: string; submittedAt: string | null }, now = new Date()): boolean {
  return a.submittedAt === null && new Date(a.dueAt).getTime() < now.getTime();
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Calendar-day distance in local time: "오늘 마감", "D-3", "2일 지남".
export function dueLabel(iso: string, now = new Date()): string {
  const due = new Date(iso);
  if (due.getTime() < now.getTime()) {
    const days = Math.round((startOfDay(now) - startOfDay(due)) / DAY_MS);
    return days === 0 ? '오늘 마감 지남' : `${days}일 지남`;
  }
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS);
  return days === 0 ? '오늘 마감' : `D-${days}`;
}

export function defaultDue(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 0, 0);
  return d;
}
