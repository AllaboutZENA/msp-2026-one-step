import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Load apps/api/.env so TEST_DATABASE_URL is available to DB tests.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
