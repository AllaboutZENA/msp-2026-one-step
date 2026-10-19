export interface Progress {
  done: number;
  total: number;
  percent: number;
}

// Completed subtasks / all subtasks × 100, rounded. No subtasks means 0%.
// 100% never implies "submitted"; submission is tracked separately.
export function calculateProgress(done: number, total: number): Progress {
  if (total <= 0) return { done: 0, total: 0, percent: 0 };
  return { done, total, percent: Math.round((done / total) * 100) };
}
