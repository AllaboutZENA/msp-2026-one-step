// Integration tests against a real PostgreSQL database (TEST_DATABASE_URL).
// The schema is dropped and recreated, so never point this at real data.
// All accounts and assignments are synthetic.
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/migrations.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('API with PostgreSQL', () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    if (/magam_hankan$/.test(url!)) throw new Error('TEST_DATABASE_URL must not be the main database');
    pool = new pg.Pool({ connectionString: url });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const client = await pool.connect();
    try {
      await runMigrations(client);
    } finally {
      client.release();
    }
    app = createApp({ db: pool });
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE users CASCADE');
  });

  async function signup(email: string) {
    const res = await request(app).post('/auth/signup').send({ email, password: 'test-password-1', displayName: '테스트' });
    expect(res.status).toBe(201);
    return res.body.token as string;
  }
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const create = (token: string, body: object) => request(app).post('/assignments').set(auth(token)).send(body);

  describe('auth (R08)', () => {
    it('signs up, logs in, reads /me, and logs out', async () => {
      const token = await signup('A@Example.com');
      const me = await request(app).get('/auth/me').set(auth(token));
      expect(me.body.user).toMatchObject({ email: 'a@example.com', displayName: '테스트' });

      const login = await request(app).post('/auth/login').send({ email: 'a@example.com', password: 'test-password-1' });
      expect(login.status).toBe(200);
      expect(login.body.token).not.toBe(token);

      expect((await request(app).post('/auth/logout').set(auth(token))).status).toBe(204);
      expect((await request(app).get('/auth/me').set(auth(token))).status).toBe(401);
      expect((await request(app).get('/auth/me').set(auth(login.body.token))).status).toBe(200);
    });

    it('rejects duplicate emails case-insensitively', async () => {
      await signup('dup@example.com');
      const res = await request(app).post('/auth/signup').send({ email: 'DUP@example.com', password: 'another-pass-1' });
      expect(res.status).toBe(409);
    });

    it('validates email and password length', async () => {
      const res = await request(app).post('/auth/signup').send({ email: 'not-an-email', password: 'short' });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.fields).sort()).toEqual(['email', 'password']);
    });

    it('gives the same 401 for a wrong password and an unknown email', async () => {
      await signup('b@example.com');
      const wrong = await request(app).post('/auth/login').send({ email: 'b@example.com', password: 'nope-nope-1' });
      const unknown = await request(app).post('/auth/login').send({ email: 'x@example.com', password: 'nope-nope-1' });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('stores only hashes of passwords and tokens', async () => {
      const token = await signup('c@example.com');
      const { rows: [u] } = await pool.query("SELECT password_hash FROM users WHERE email = 'c@example.com'");
      expect(u.password_hash).toMatch(/^scrypt\$/);
      expect(u.password_hash).not.toContain('test-password-1');
      const { rows } = await pool.query('SELECT token_hash FROM sessions');
      expect(rows.every((r) => !Buffer.from(r.token_hash).toString().includes(token))).toBe(true);
    });

    it('rejects expired sessions', async () => {
      const token = await signup('d@example.com');
      await pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'");
      expect((await request(app).get('/assignments').set(auth(token))).status).toBe(401);
    });

    it('requires a token for assignments', async () => {
      expect((await request(app).get('/assignments')).status).toBe(401);
      expect((await request(app).get('/assignments').set({ Authorization: 'Bearer not-a-real-token-value-xx' })).status).toBe(401);
    });
  });

  describe('assignments', () => {
    it('validates required fields with per-field messages (T01)', async () => {
      const token = await signup('e@example.com');
      const res = await create(token, { courseName: '  ', title: '', dueAt: '2026-10-20 10:00' });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.fields).sort()).toEqual(['courseName', 'dueAt', 'title']);
    });

    it('creates and lists open assignments by due date, then creation order (T07)', async () => {
      const token = await signup('f@example.com');
      const due = '2026-10-20T14:59:00.000Z';
      await create(token, { courseName: '자료구조', title: '두 번째', dueAt: due });
      await create(token, { courseName: '모바일 SW', title: '첫 번째', dueAt: '2026-10-18T00:00:00+09:00' });
      await create(token, { courseName: '자료구조', title: '세 번째', dueAt: due, memo: '같은 마감' });
      const res = await request(app).get('/assignments').set(auth(token));
      expect(res.body.assignments.map((a: { title: string }) => a.title)).toEqual(['첫 번째', '두 번째', '세 번째']);
      expect(res.body.assignments[0]).toMatchObject({
        dueAt: '2026-10-17T15:00:00.000Z',
        submittedAt: null,
        progress: { done: 0, total: 0, percent: 0 },
      });
    });

    it('hides other users’ assignments: read, update, delete all 404 (T13)', async () => {
      const owner = await signup('owner@example.com');
      const other = await signup('other@example.com');
      const { body } = await create(owner, { courseName: 'DB', title: 'ERD', dueAt: '2026-10-21T00:00:00Z' });
      const id = body.assignment.id;

      expect((await request(app).get(`/assignments/${id}`).set(auth(other))).status).toBe(404);
      expect((await request(app).patch(`/assignments/${id}`).set(auth(other)).send({ title: 'hacked' })).status).toBe(404);
      expect((await request(app).delete(`/assignments/${id}`).set(auth(other))).status).toBe(404);
      expect((await request(app).get('/assignments').set(auth(other))).body.assignments).toEqual([]);

      const mine = await request(app).get(`/assignments/${id}`).set(auth(owner));
      expect(mine.body.assignment.title).toBe('ERD');
    });

    it('returns 404 for malformed ids', async () => {
      const token = await signup('g@example.com');
      expect((await request(app).get('/assignments/123').set(auth(token))).status).toBe(404);
    });

    it('updates fields and toggles submission without auto-submitting at 100% (T08)', async () => {
      const token = await signup('h@example.com');
      const { body } = await create(token, { courseName: 'OS', title: '과제', dueAt: '2026-10-22T00:00:00Z' });
      const id = body.assignment.id;
      await pool.query(`INSERT INTO subtasks (assignment_id, title, is_done) VALUES ($1, '한 개', true)`, [id]);

      const detail = await request(app).get(`/assignments/${id}`).set(auth(token));
      expect(detail.body.assignment.progress.percent).toBe(100);
      expect(detail.body.assignment.submittedAt).toBeNull();

      const submitted = await request(app).patch(`/assignments/${id}`).set(auth(token)).send({ submitted: true, title: '과제 (최종)' });
      expect(submitted.body.assignment.submittedAt).not.toBeNull();
      expect(submitted.body.assignment.title).toBe('과제 (최종)');
      expect((await request(app).get('/assignments').set(auth(token))).body.assignments).toHaveLength(0);
      expect((await request(app).get('/assignments?status=submitted').set(auth(token))).body.assignments).toHaveLength(1);

      const undone = await request(app).patch(`/assignments/${id}`).set(auth(token)).send({ submitted: false });
      expect(undone.body.assignment.submittedAt).toBeNull();
    });

    it('edits due date, title and memo; the list re-sorts by the new due date (T03)', async () => {
      const token = await signup('k@example.com');
      const first = await create(token, { courseName: 'OS', title: '먼저 마감', dueAt: '2026-10-22T00:00:00Z', memo: '메모' });
      await create(token, { courseName: 'OS', title: '나중 마감', dueAt: '2026-10-25T00:00:00Z' });
      const id = first.body.assignment.id;

      const edited = await request(app)
        .patch(`/assignments/${id}`)
        .set(auth(token))
        .send({ title: '미뤄진 과제', dueAt: '2026-10-28T14:59:00+09:00', memo: null });
      expect(edited.status).toBe(200);

      const detail = await request(app).get(`/assignments/${id}`).set(auth(token));
      expect(detail.body.assignment).toMatchObject({ title: '미뤄진 과제', dueAt: '2026-10-28T05:59:00.000Z', memo: null });
      const list = await request(app).get('/assignments').set(auth(token));
      expect(list.body.assignments.map((a: { title: string }) => a.title)).toEqual(['나중 마감', '미뤄진 과제']);
    });

    it('reports subtask progress and deletes subtasks with the assignment (T04, T05)', async () => {
      const token = await signup('i@example.com');
      const { body } = await create(token, { courseName: 'AI', title: '보고서', dueAt: '2026-10-23T00:00:00Z' });
      const id = body.assignment.id;
      await pool.query(
        `INSERT INTO subtasks (assignment_id, title, is_done, sort_order)
         VALUES ($1, '자료 조사', true, 0), ($1, '초안', false, 1), ($1, '제출', false, 2)`,
        [id],
      );
      const detail = await request(app).get(`/assignments/${id}`).set(auth(token));
      expect(detail.body.assignment.progress).toEqual({ done: 1, total: 3, percent: 33 });
      expect(detail.body.assignment.subtasks.map((s: { title: string }) => s.title)).toEqual(['자료 조사', '초안', '제출']);

      expect((await request(app).delete(`/assignments/${id}`).set(auth(token))).status).toBe(204);
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM subtasks WHERE assignment_id = $1', [id]);
      expect(rows[0].n).toBe(0);
    });

    it('rejects an empty PATCH and bad JSON', async () => {
      const token = await signup('j@example.com');
      const { body } = await create(token, { courseName: 'X', title: 'Y', dueAt: '2026-10-24T00:00:00Z' });
      expect((await request(app).patch(`/assignments/${body.assignment.id}`).set(auth(token)).send({})).status).toBe(400);
      const bad = await request(app).post('/assignments').set(auth(token)).set('Content-Type', 'application/json').send('{"oops"');
      expect(bad.status).toBe(400);
    });
  });
});
