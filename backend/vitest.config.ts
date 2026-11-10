import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import process from 'node:process';

// Load real values from .env (same source as the dev script) so no secrets
// are ever hardcoded in version control. Tests never connect to MONGODB_URI:
// integration tests spin up their own mongodb-memory-server instance.
if (existsSync('.env')) {
  process.loadEnvFile();
}

// Tests must behave like tests even if .env says otherwise.
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    // First-ever run downloads the MongoDB testing binary; keep hooks patient.
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
