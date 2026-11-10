import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  Recommendation,
  type RecommendationDocument,
} from '../../src/models/entities/recommendation.model.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const USER_ID = '64b1f6274190d8fe2ee1ba99' as unknown as Types.ObjectId;
const ANALYSIS_ID = '64b1f6274190d8fe2ee1ba88' as unknown as Types.ObjectId;

const fromAiValid = (): Promise<RecommendationDocument> =>
  Recommendation.fromAi({
    analysisId: ANALYSIS_ID,
    generatedBy: { provider: 'openai', model: 'gpt-4o-mini' },
    type: 'REPLICAS',
    severity: 'WARNING',
    title: 'Bump replicas to 3',
    description: 'A single replica will not satisfy the availability target.',
    componentName: 'web',
    suggestedValue: '3',
  });

beforeAll(async () => {
  await connectTestingModule('recommendations_test');
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await Recommendation.deleteMany({});
});

describe('Recommendation model', () => {
  describe('field validation', () => {
    it('creates a valid PENDING recommendation', async () => {
      const rec = await fromAiValid();

      expect(rec.status).toBe('PENDING');
      expect(rec.isPending()).toBe(true);
      expect(rec.severity).toBe('WARNING');
      expect(rec.generatedBy.provider).toBe('openai');
      expect(rec.generatedBy.model).toBe('gpt-4o-mini');
      expect(rec.componentName).toBe('web');
      expect(rec.suggestedValue).toBe('3');
    });

    it('rejects an unknown type', async () => {
      const doc = new Recommendation({
        analysis: ANALYSIS_ID,
        type: 'SCALE' as never,
        severity: 'INFO',
        title: 'x',
        description: 'y',
        generatedBy: { provider: 'openai', model: 'gpt' },
      });
      expect(await validatedErrorPaths(doc)).toContain('type');
    });

    it('rejects an unknown severity', async () => {
      const doc = new Recommendation({
        analysis: ANALYSIS_ID,
        type: 'CPU',
        severity: 'EXTREME' as never,
        title: 'x',
        description: 'y',
        generatedBy: { provider: 'openai', model: 'gpt' },
      });
      expect(await validatedErrorPaths(doc)).toContain('severity');
    });

    it('rejects empty title and description', async () => {
      const doc = new Recommendation({
        analysis: ANALYSIS_ID,
        type: 'CPU',
        severity: 'INFO',
        title: '',
        description: '',
        generatedBy: { provider: 'openai', model: 'gpt' },
      });
      const keys = await validatedErrorPaths(doc);
      expect(keys).toContain('title');
      expect(keys).toContain('description');
    });

    it('rejects a generatedBy without provider/model', async () => {
      const doc = new Recommendation({
        analysis: ANALYSIS_ID,
        type: 'CPU',
        severity: 'INFO',
        title: 'x',
        description: 'y',
        generatedBy: { provider: '', model: '' },
      });
      const keys = await validatedErrorPaths(doc);
      expect(keys.some((key) => key.startsWith('generatedBy'))).toBe(true);
    });
  });

  describe('decisions (legal transitions)', () => {
    it('accept() flips to ACCEPTED with decidedBy/decidedAt', async () => {
      const accepted = await (await fromAiValid()).accept(USER_ID);

      expect(accepted.status).toBe('ACCEPTED');
      expect(String(accepted.decidedBy)).toBe(String(USER_ID));
      expect(accepted.decidedAt).toBeInstanceOf(Date);
      expect(accepted.isPending()).toBe(false);
    });

    it('reject() flips to REJECTED and can record a note', async () => {
      const rejected = await (await fromAiValid()).reject(USER_ID, 'nope, too many replicas');

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.decisionNote).toBe('nope, too many replicas');
      expect(rejected.decidedAt).toBeInstanceOf(Date);
    });

    it('reject() without a note leaves decisionNote undefined', async () => {
      const rejected = await (await fromAiValid()).reject(USER_ID);

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.decisionNote).toBeUndefined();
    });
  });

  describe('illegal transitions', () => {
    it('deciding twice throws InvalidStateTransitionError', async () => {
      const rec = await fromAiValid();
      const accepted = await rec.accept(USER_ID);

      await expect(accepted.reject(USER_ID)).rejects.toThrowError(/Invalid state transition/);
      await expect(accepted.reject(USER_ID)).rejects.toThrowError(
        /cannot move from "ACCEPTED" to "REJECTED"/,
      );
      await expect(accepted.accept(USER_ID)).rejects.toThrowError(/Invalid state transition/);
    });

    it('accept/reject on a rejected doc throw the transition error', async () => {
      const rejected = await (await fromAiValid()).reject(USER_ID);

      await expect(rejected.accept(USER_ID)).rejects.toThrowError(/Invalid state transition/);
      await expect(rejected.reject(USER_ID)).rejects.toThrowError(
        /cannot move from "REJECTED" to "REJECTED"/,
      );
    });

    it('REJECTED is terminal', async () => {
      const rejected = await (await fromAiValid()).reject(USER_ID);

      await expect(rejected.reject(USER_ID)).rejects.toThrowError(/Invalid state transition/);
      await expect(rejected.accept(USER_ID)).rejects.toThrowError(/Invalid state transition/);
    });
  });
});
