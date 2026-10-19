import express, { type ErrorRequestHandler } from 'express';
import type { Queryable } from './db.js';
import { HttpError } from './http.js';
import { assignmentsRouter } from './routes/assignments.js';
import { authRouter } from './routes/auth.js';

export interface AppDeps {
  db?: Queryable;
}

export function createApp({ db }: AppDeps = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'magam-hankan-api', time: new Date().toISOString() });
  });

  app.get('/health/db', async (_req, res) => {
    if (!db) {
      res.status(503).json({ status: 'unconfigured', message: 'DATABASE_URL is not set' });
      return;
    }
    try {
      const { rows } = await db.query<{ now: Date; version: string }>(
        'SELECT now() AS now, current_setting($1) AS version',
        ['server_version'],
      );
      res.json({ status: 'ok', dbTime: rows[0].now, postgres: rows[0].version });
    } catch (err) {
      console.error('DB health check failed:', err instanceof Error ? err.message : err);
      res.status(503).json({ status: 'error', message: 'database unreachable' });
    }
  });

  if (db) {
    app.use('/auth', authRouter(db));
    app.use('/assignments', assignmentsRouter(db));
  } else {
    app.use(['/auth', '/assignments'], (_req, res) => {
      res.status(503).json({ status: 'unconfigured', message: 'DATABASE_URL is not set' });
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'not found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ status: 'error', message: err.message, ...(err.fields && { fields: err.fields }) });
      return;
    }
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      res.status(err.status ?? 400).json({ status: 'error', message: '요청 본문을 읽을 수 없습니다' });
      return;
    }
    console.error(err);
    // The app shows this message as-is, so keep it user-facing and free of internals.
    res.status(500).json({ status: 'error', message: '서버에 일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요' });
  };
  app.use(errorHandler);

  return app;
}
