import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createSession, deleteSession } from '../auth/sessions.js';
import type { Queryable } from '../db.js';
import { asBody, HttpError, Validator } from '../http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
}

const toUser = (u: Pick<UserRow, 'id' | 'email' | 'display_name'>) => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
});

function credentials(body: unknown) {
  const v = new Validator(asBody(body));
  const email = v.text('email', '이메일', { max: 254 })?.toLowerCase();
  if (email && !EMAIL_RE.test(email)) v.errors.email = '이메일 형식이 올바르지 않습니다';
  const password = typeof asBody(body).password === 'string' ? (asBody(body).password as string) : '';
  return { v, email: email ?? '', password };
}

export function authRouter(db: Queryable) {
  const r = Router();

  r.post('/signup', async (req, res) => {
    const { v, email, password } = credentials(req.body);
    if (password.length < 8 || password.length > 128) v.errors.password = '비밀번호는 8자 이상 128자 이하로 입력해 주세요';
    const displayName = v.text('displayName', '이름', { required: false, max: 30 }) || email.split('@')[0];
    v.done();

    const passwordHash = await hashPassword(password);
    let user: UserRow;
    try {
      ({ rows: [user] } = await db.query<UserRow>(
        `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3)
         RETURNING id, email, display_name, password_hash`,
        [email, passwordHash, displayName],
      ));
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new HttpError(409, '이미 가입된 이메일입니다', { email: '이미 가입된 이메일입니다' });
      throw err;
    }
    const session = await createSession(db, user.id);
    res.status(201).json({ token: session.token, expiresAt: session.expiresAt, user: toUser(user) });
  });

  r.post('/login', async (req, res) => {
    const { email, password } = credentials(req.body);
    const { rows } = await db.query<UserRow>(
      'SELECT id, email, display_name, password_hash FROM users WHERE lower(email) = $1',
      [email],
    );
    const user = rows[0];
    const ok = await verifyPassword(password, user?.password_hash ?? null);
    if (!user || !ok) throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다');
    const session = await createSession(db, user.id);
    res.json({ token: session.token, expiresAt: session.expiresAt, user: toUser(user) });
  });

  r.post('/logout', requireAuth(db), async (req, res) => {
    await deleteSession(db, req.token!);
    res.status(204).end();
  });

  r.get('/me', requireAuth(db), async (req, res) => {
    const { rows } = await db.query<UserRow>('SELECT id, email, display_name FROM users WHERE id = $1', [req.userId]);
    res.json({ user: toUser(rows[0]) });
  });

  return r;
}
