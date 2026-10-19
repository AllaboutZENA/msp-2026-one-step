import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Queryable } from '../src/db.js';

describe('GET /health', () => {
  it('responds ok without a database', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'magam-hankan-api' });
  });
});

describe('GET /health/db', () => {
  it('returns 503 when DATABASE_URL is not configured', async () => {
    const res = await request(createApp()).get('/health/db');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unconfigured');
  });

  it('returns ok when the database answers', async () => {
    const db = {
      query: async () => ({ rows: [{ now: new Date(0), version: '16.4' }] }),
    } as unknown as Queryable;
    const res = await request(createApp({ db })).get('/health/db');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', postgres: '16.4' });
  });

  it('returns 503 without leaking the error when the database fails', async () => {
    const db = {
      query: async () => {
        throw new Error('password authentication failed for user "secret"');
      },
    } as unknown as Queryable;
    const res = await request(createApp({ db })).get('/health/db');
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});

describe('unexpected errors', () => {
  it('return a Korean 500 message without internals', async () => {
    const db = {
      query: async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
      },
    } as unknown as Queryable;
    const res = await request(createApp({ db })).get('/assignments').set('Authorization', `Bearer ${'a'.repeat(43)}`);
    expect(res.status).toBe(500);
    expect(res.body.message).toContain('잠시 후 다시 시도');
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
  });
});

describe('unknown routes', () => {
  it('return JSON 404', async () => {
    const res = await request(createApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
