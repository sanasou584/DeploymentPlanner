import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

const VALID = {
  NODE_ENV: 'test',
  PORT: '4000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/x',
  CORS_ORIGINS: 'http://localhost:3000, http://localhost:3001',
  LOG_LEVEL: 'info',
  TOKEN_ENCRYPTION_KEY: 'RtcY2OnO4aHlOr8T+s1IMgJeDXqAtkOLEd5FIqTt45o=',
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
  GITHUB_CALLBACK_URL: 'http://localhost:4000/api/v1/auth/github/callback',
  FRONTEND_URL: 'http://localhost:3000',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-bytes-long',
  N8N_ANALYSIS_WEBHOOK_URL: 'http://localhost:5678/webhook/pipeline-analysis',
  N8N_SHARED_SECRET: 'test-n8n-shared-secret-that-is-at-least-32-bytes-long',
  N8N_AI_AUDIT_WEBHOOK_URL: 'http://localhost:5678/webhook/pipeline-ai-audit',
  N8N_AI_PLAN_WEBHOOK_URL: 'http://localhost:5678/webhook/pipeline-ai-plan',
};

describe('config/env', () => {
  it('accepts a valid environment and parses CORS origins', () => {
    const env = loadEnv(VALID);

    expect(env.corsOrigins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    expect(env.tokenEncryptionKey).toHaveLength(32);
    expect(env.port).toBe(4000);
    expect(env.nodeEnv).toBe('test');
  });

  it('rejects a TOKEN_ENCRYPTION_KEY that is not exactly 32 bytes', () => {
    expect(() => loadEnv({ ...VALID, TOKEN_ENCRYPTION_KEY: 'aGVsbG8=' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('rejects a TOKEN_ENCRYPTION_KEY that is not base64', () => {
    expect(() => loadEnv({ ...VALID, TOKEN_ENCRYPTION_KEY: '****' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('rejects a missing MONGODB_URI', () => {
    const withoutUri = { ...VALID } as { -readonly [K in keyof typeof VALID]?: string };

    delete withoutUri.MONGODB_URI;

    expect(() => loadEnv(withoutUri)).toThrow('Invalid environment configuration');
  });

  it('rejects a missing GitHub OAuth variable', () => {
    const withoutClientId = { ...VALID } as { -readonly [K in keyof typeof VALID]?: string };

    delete withoutClientId.GITHUB_CLIENT_ID;

    expect(() => loadEnv(withoutClientId)).toThrow('Invalid environment configuration');
  });

  it('rejects a SESSION_SECRET shorter than 32 bytes', () => {
    expect(() => loadEnv({ ...VALID, SESSION_SECRET: 'too-short' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('exposes the parsed OAuth, n8n and session values on the env object', () => {
    const env = loadEnv(VALID);

    expect(env.githubClientId).toBe('test-client-id');
    expect(env.githubClientSecret).toBe('test-client-secret');
    expect(env.githubCallbackUrl).toBe('http://localhost:4000/api/v1/auth/github/callback');
    expect(env.frontendUrl).toBe('http://localhost:3000');
    expect(env.sessionSecret).toBe('test-session-secret-that-is-at-least-32-bytes-long');
    expect(env.n8nAnalysisWebhookUrl).toBe('http://localhost:5678/webhook/pipeline-analysis');
    expect(env.n8nSharedSecret).toBe('test-n8n-shared-secret-that-is-at-least-32-bytes-long');
  });

  it('rejects an empty CORS_ORIGINS list', () => {
    expect(() => loadEnv({ ...VALID, CORS_ORIGINS: ' , ' })).toThrow(
      /CORS_ORIGINS must contain at least one origin/,
    );
  });
});
