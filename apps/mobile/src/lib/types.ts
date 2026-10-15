export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Progress {
  done: number;
  total: number;
  percent: number;
}

export interface Assignment {
  id: string;
  courseName: string;
  title: string;
  dueAt: string;
  memo: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: Progress;
}

export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
}

export interface AssignmentDetail extends Assignment {
  subtasks: Subtask[];
}

export interface AssignmentInput {
  courseName: string;
  title: string;
  dueAt: string;
  memo?: string | null;
}
