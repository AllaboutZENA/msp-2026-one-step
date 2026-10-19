import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const config = loadConfig();
const pool = config.databaseUrl ? createPool(config.databaseUrl) : undefined;
const app = createApp({ db: pool });

const server = app.listen(config.port, config.host, () => {
  console.log(
    `API listening on http://${config.host}:${config.port} (${config.nodeEnv}, db: ${pool ? 'configured' : 'not configured'})`,
  );
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await pool?.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
