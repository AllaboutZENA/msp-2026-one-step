// Assignment CRUD. Every query is scoped by user_id = req.userId, so another
// user's assignment id behaves exactly like a missing one (404).
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import type { Queryable } from '../db.js';
import { calculateProgress } from '../domain/progress.js';
import { asBody, HttpError, UUID_RE, Validator } from '../http.js';
import { subtasksRouter, toSubtask } from './subtasks.js';

interface AssignmentRow {
  id: string;
  course_name: string;
  title: string;
  due_at: Date;
  memo: string | null;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  done_count: number;
  total_count: number;
}

const SELECT_WITH_PROGRESS = `
  SELECT a.id, a.course_name, a.title, a.due_at, a.memo, a.submitted_at, a.created_at, a.updated_at,
         count(s.id) FILTER (WHERE s.is_done)::int AS done_count,
         count(s.id)::int AS total_count
  FROM assignments a
  LEFT JOIN subtasks s ON s.assignment_id = a.id`;

const ORDER = {
  open: 'a.due_at ASC, a.created_at ASC, a.id ASC',
  submitted: 'a.submitted_at DESC, a.id ASC',
  all: 'a.due_at ASC, a.created_at ASC, a.id ASC',
} as const;

function toAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    courseName: row.course_name,
    title: row.title,
    dueAt: row.due_at.toISOString(),
    memo: row.memo,
    submittedAt: row.submitted_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    progress: calculateProgress(row.done_count, row.total_count),
  };
}

function assignmentId(raw: string): string {
  if (!UUID_RE.test(raw)) throw new HttpError(404, '과제를 찾을 수 없습니다');
  return raw;
}

export function assignmentsRouter(db: Queryable) {
  const r = Router();
  r.use(requireAuth(db));
  r.use('/:id/subtasks', subtasksRouter(db));

  async function findOwned(userId: string, id: string): Promise<AssignmentRow> {
    const { rows } = await db.query<AssignmentRow>(
      `${SELECT_WITH_PROGRESS} WHERE a.id = $1 AND a.user_id = $2 GROUP BY a.id`,
      [id, userId],
    );
    if (!rows[0]) throw new HttpError(404, '과제를 찾을 수 없습니다');
    return rows[0];
  }

  r.get('/', async (req, res) => {
    const status = (req.query.status ?? 'open') as string;
    if (!(status in ORDER)) throw new HttpError(400, 'status는 open, submitted, all 중 하나여야 합니다');
    const filter = status === 'open' ? 'AND a.submitted_at IS NULL' : status === 'submitted' ? 'AND a.submitted_at IS NOT NULL' : '';
    const { rows } = await db.query<AssignmentRow>(
      `${SELECT_WITH_PROGRESS} WHERE a.user_id = $1 ${filter} GROUP BY a.id ORDER BY ${ORDER[status as keyof typeof ORDER]}`,
      [req.userId],
    );
    res.json({ assignments: rows.map(toAssignment) });
  });

  r.post('/', async (req, res) => {
    const v = new Validator(asBody(req.body));
    const courseName = v.text('courseName', '과목명', { max: 100 });
    const title = v.text('title', '제목', { max: 200 });
    const dueAt = v.instant('dueAt', '마감 일시');
    const memo = v.text('memo', '메모', { required: false, max: 2000 });
    v.done();
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO assignments (user_id, course_name, title, due_at, memo)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.userId, courseName, title, dueAt, memo ?? null],
    );
    res.status(201).json({ assignment: toAssignment(await findOwned(req.userId!, rows[0].id)) });
  });

  r.get('/:id', async (req, res) => {
    const row = await findOwned(req.userId!, assignmentId(req.params.id));
    const { rows: subtasks } = await db.query<{ id: string; title: string; is_done: boolean; sort_order: number }>(
      'SELECT id, title, is_done, sort_order FROM subtasks WHERE assignment_id = $1 ORDER BY sort_order, created_at, id',
      [row.id],
    );
    res.json({
      assignment: {
        ...toAssignment(row),
        subtasks: subtasks.map(toSubtask),
      },
    });
  });

  r.patch('/:id', async (req, res) => {
    const id = assignmentId(req.params.id);
    const v = new Validator(asBody(req.body));
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (v.has('courseName')) set('course_name', v.text('courseName', '과목명', { max: 100 }));
    if (v.has('title')) set('title', v.text('title', '제목', { max: 200 }));
    if (v.has('dueAt')) set('due_at', v.instant('dueAt', '마감 일시'));
    if (v.has('memo')) set('memo', v.text('memo', '메모', { required: false, max: 2000 }) ?? null);
    const submitted = v.bool('submitted', '제출 완료');
    v.done();
    // Submitting keeps the first submission time; undoing clears it.
    if (submitted === true) sets.push('submitted_at = COALESCE(submitted_at, now())');
    if (submitted === false) sets.push('submitted_at = NULL');
    if (!sets.length) throw new HttpError(400, '변경할 항목이 없습니다');

    values.push(id, req.userId);
    const { rowCount } = await db.query(
      `UPDATE assignments SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values,
    );
    if (!rowCount) throw new HttpError(404, '과제를 찾을 수 없습니다');
    res.json({ assignment: toAssignment(await findOwned(req.userId!, id)) });
  });

  r.delete('/:id', async (req, res) => {
    const { rowCount } = await db.query('DELETE FROM assignments WHERE id = $1 AND user_id = $2', [
      assignmentId(req.params.id),
      req.userId,
    ]);
    if (!rowCount) throw new HttpError(404, '과제를 찾을 수 없습니다');
    res.status(204).end();
  });

  return r;
}
