export interface Config {
  host: string;
  port: number;
  nodeEnv: string;
  databaseUrl: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535 (got "${env.PORT}")`);
  }

  return {
    host: env.HOST || '127.0.0.1',
    port,
    nodeEnv: env.NODE_ENV || 'development',
    databaseUrl: env.DATABASE_URL || undefined,
  };
}
