// Subtasks of one assignment, mounted at /assignments/:id/subtasks behind
// requireAuth. The assignment must belong to req.userId; otherwise every route
// answers 404 exactly like a missing assignment. Responses carry the
// assignment's recalculated progress so the app can update it right away.
import { Router } from 'express';
import type { Queryable } from '../db.js';
import { calculateProgress } from '../domain/progress.js';
import { asBody, HttpError, UUID_RE, Validator } from '../http.js';

export const MAX_SUBTASKS = 100;

interface SubtaskRow {
  id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
}

export function toSubtask(row: SubtaskRow) {
  return { id: row.id, title: row.title, isDone: row.is_done, sortOrder: row.sort_order };
}

export function subtasksRouter(db: Queryable) {
  const r = Router({ mergeParams: true });
  // :id comes from the parent route (mergeParams), so the types are declared here.
  type Params = { id: string };
  type ItemParams = Params & { subtaskId: string };

  async function ownedAssignment(userId: string, raw: string): Promise<string> {
    const missing = new HttpError(404, '과제를 찾을 수 없습니다');
    if (!UUID_RE.test(raw)) throw missing;
    const { rowCount } = await db.query('SELECT 1 FROM assignments WHERE id = $1 AND user_id = $2', [raw, userId]);
    if (!rowCount) throw missing;
    return raw;
  }

  function subtaskId(raw: string): string {
    if (!UUID_RE.test(raw)) throw new HttpError(404, '세부 작업을 찾을 수 없습니다');
    return raw;
  }

  async function progressOf(assignmentId: string) {
    const { rows } = await db.query<{ done: number; total: number }>(
      'SELECT count(*) FILTER (WHERE is_done)::int AS done, count(*)::int AS total FROM subtasks WHERE assignment_id = $1',
      [assignmentId],
    );
    return calculateProgress(rows[0].done, rows[0].total);
  }

  r.post<Params>('/', async (req, res) => {
    const id = await ownedAssignment(req.userId!, req.params.id);
    const v = new Validator(asBody(req.body));
    const title = v.text('title', '세부 작업', { max: 200 });
    v.done();
    // New subtasks go last. HAVING keeps the per-assignment limit in the same statement.
    const { rows } = await db.query<SubtaskRow>(
      `INSERT INTO subtasks (assignment_id, title, sort_order)
       SELECT $1, $2, COALESCE(max(sort_order) + 1, 0) FROM subtasks WHERE assignment_id = $1
       HAVING count(*) < $3
       RETURNING id, title, is_done, sort_order`,
      [id, title, MAX_SUBTASKS],
    );
    if (!rows[0]) throw new HttpError(400, `세부 작업은 과제당 ${MAX_SUBTASKS}개까지 추가할 수 있습니다`);
    res.status(201).json({ subtask: toSubtask(rows[0]), progress: await progressOf(id) });
  });

  r.patch<ItemParams>('/:subtaskId', async (req, res) => {
    const id = await ownedAssignment(req.userId!, req.params.id);
    const sid = subtaskId(req.params.subtaskId);
    const v = new Validator(asBody(req.body));
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (v.has('title')) set('title', v.text('title', '세부 작업', { max: 200 }));
    const isDone = v.bool('isDone', '완료 여부');
    if (isDone !== undefined) set('is_done', isDone);
    v.done();
    if (!sets.length) throw new HttpError(400, '변경할 항목이 없습니다');

    values.push(sid, id);
    const { rows } = await db.query<SubtaskRow>(
      `UPDATE subtasks SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${values.length - 1} AND assignment_id = $${values.length}
       RETURNING id, title, is_done, sort_order`,
      values,
    );
    if (!rows[0]) throw new HttpError(404, '세부 작업을 찾을 수 없습니다');
    res.json({ subtask: toSubtask(rows[0]), progress: await progressOf(id) });
  });

  r.delete<ItemParams>('/:subtaskId', async (req, res) => {
    const id = await ownedAssignment(req.userId!, req.params.id);
    const { rowCount } = await db.query('DELETE FROM subtasks WHERE id = $1 AND assignment_id = $2', [
      subtaskId(req.params.subtaskId),
      id,
    ]);
    if (!rowCount) throw new HttpError(404, '세부 작업을 찾을 수 없습니다');
    res.json({ progress: await progressOf(id) });
  });

  return r;
}
