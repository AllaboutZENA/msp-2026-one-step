import express, { type ErrorRequestHandler } from 'express';
import type { Queryable } from './db.js';

export interface AppDeps {
  db?: Queryable;
}

export function createApp({ db }: AppDeps = {}) {
  const app = express();
  app.disable('x-powered-by');
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

  app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'not found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'internal server error' });
  };
  app.use(errorHandler);

  return app;
}
