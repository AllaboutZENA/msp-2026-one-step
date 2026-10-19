import type { RequestHandler } from 'express';
import type { Queryable } from '../db.js';
import { HttpError } from '../http.js';
import { findSessionUser } from './sessions.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    token?: string;
  }
}

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(header ?? '');
  return match ? match[1] : null;
}

export function requireAuth(db: Queryable): RequestHandler {
  return async (req, _res, next) => {
    const token = bearerToken(req.get('authorization'));
    const userId = token ? await findSessionUser(db, token) : null;
    if (!token || !userId) throw new HttpError(401, '로그인이 필요합니다');
    req.userId = userId;
    req.token = token;
    next();
  };
}
