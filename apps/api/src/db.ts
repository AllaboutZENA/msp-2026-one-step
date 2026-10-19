import pg from 'pg';

export type Queryable = Pick<pg.Pool, 'query'>;

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 3000,
  });
  // An idle client loses its connection when PostgreSQL restarts. Without a
  // listener that 'error' event would crash the process; the pool simply
  // reconnects on the next query.
  pool.on('error', (err) => console.error('idle database client error:', err.message));
  return pool;
}
