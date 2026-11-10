import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';

import {
  DeploymentPlan,
  DEPLOYMENT_PLAN_MODEL_NAME,
  type DeploymentPlanDocument,
  type PlanComponent,
} from '../../src/models/entities/deployment-plan.model.js';
import { ConflictError, InvariantViolationError } from '../../src/domain/errors/index.js';
import { connectTestingModule, disconnectTestingModule } from '../integration/test-database.js';
import { validatedErrorPaths } from '../helpers/schema-validation.js';

const USER_ID = '64b1f6274190d8fe2ee1ba71' as unknown as Types.ObjectId;
const REVIEWER_ID = '64b1f6274190d8fe2ee1ba72' as unknown as Types.ObjectId;
const PROJECT_ID = '64b1f6274190d8fe2ee1ba80' as unknown as Types.ObjectId;
const ANALYSIS_ID = '64b1f6274190d8fe2ee1ba81' as unknown as Types.ObjectId;
const RECOMMENDATION_ID = '64b1f6274190d8fe2ee1ba82' as unknown as Types.ObjectId;
const OTHER_RECOMMENDATION_ID = '64b1f6274190d8fe2ee1ba83' as unknown as Types.ObjectId;

const webComponent = (overrides: Partial<PlanComponent> = {}): PlanComponent => ({
  name: 'web',
  type: 'FRONTEND',
  containerPort: 3000,
  replicas: 3,
  resources: {
    requests: { cpu: '250m', memory: '512Mi' },
    limits: { cpu: '500m', memory: '1Gi' },
  },
  hpa: { enabled: false },
  ingress: { enabled: false, tls: false },
  ...overrides,
});

const draftValid = (): Promise<DeploymentPlanDocument> =>
  DeploymentPlan.draft({
    projectId: PROJECT_ID,
    analysisId: ANALYSIS_ID,
    createdBy: USER_ID,
    version: 1,
    components: [webComponent(), webComponent({ name: 'api', type: 'BACKEND', containerPort: 8080, replicas: 2 })],
  });

beforeAll(async () => {
  await connectTestingModule('plans_test');
  await DeploymentPlan.init();
});

afterAll(async () => {
  await disconnectTestingModule();
});

beforeEach(async () => {
  await DeploymentPlan.deleteMany({});
});

describe('DeploymentPlan model', () => {
  describe('field validation', () => {
    it('draft() creates a valid DRAFT with totals', async () => {
      const plan = await draftValid();

      expect(plan.status).toBe('DRAFT');
      expect(plan.version).toBe(1);
      expect(plan.components).toHaveLength(2);
      expect(plan.totalReplicas).toBe(5);
      expect(plan.recommendations).toEqual([]);
    });

    it('rejects an unknown component type', async () => {
      const doc = new DeploymentPlan({
        project: PROJECT_ID,
        analysis: ANALYSIS_ID,
        version: 1,
        createdBy: USER_ID,
        components: [webComponent({ type: 'MIDDLEWARE' as never })],
      });
      expect(await validatedErrorPaths(doc)).toContain('components.0.type');
    });

    it('rejects containerPort outside 1..65535 and replicas below 1', async () => {
      const badPort = new DeploymentPlan({
        project: PROJECT_ID,
        analysis: ANALYSIS_ID,
        version: 1,
        createdBy: USER_ID,
        components: [webComponent({ containerPort: 70000 })],
      });
      expect(await validatedErrorPaths(badPort)).toContain('components.0.containerPort');

      const badReplicas = new DeploymentPlan({
        project: PROJECT_ID,
        analysis: ANALYSIS_ID,
        version: 1,
        createdBy: USER_ID,
        components: [webComponent({ replicas: 0 })],
      });
      expect(await validatedErrorPaths(badReplicas)).toContain('components.0.replicas');
    });

    it('rejects a plan with zero components', async () => {
      const doc = new DeploymentPlan({
        project: PROJECT_ID,
        analysis: ANALYSIS_ID,
        version: 1,
        createdBy: USER_ID,
        components: [],
      });
      expect(await validatedErrorPaths(doc)).toContain('components');
    });

    it('rejects resources where limits < requests (embedded invariant)', async () => {
      const doc = new DeploymentPlan({
        project: PROJECT_ID,
        analysis: ANALYSIS_ID,
        version: 1,
        createdBy: USER_ID,
        components: [
          webComponent({
            resources: {
              requests: { cpu: '1', memory: '2Gi' },
              limits: { cpu: '500m', memory: '1Gi' },
            },
          }),
        ],
      });
      // Embedded subschema pre('validate') hooks run only through the async
      // Document.validate() path (the deprecated validateSync skips nested hooks).
      const error = await (async () => {
        try {
          await doc.validate();
          return undefined;
        } catch (caught: unknown) {
          return caught;
        }
      })();
      const keys = Object.keys((error as { errors?: Record<string, unknown> })?.errors ?? {});
      expect(keys.some((key) => key.includes('components.0'))).toBe(true);
    });

    it('rejects version below 1 through draft static', async () => {
      await expect(
        DeploymentPlan.draft({
          projectId: PROJECT_ID,
          analysisId: ANALYSIS_ID,
          createdBy: USER_ID,
          version: 0,
          components: [webComponent()],
        }),
      ).rejects.toThrowError(/version must be >= 1/);
    });

    it('rejects duplicate component names via draft static (case-insensitive)', async () => {
      await expect(
        DeploymentPlan.draft({
          projectId: PROJECT_ID,
          analysisId: ANALYSIS_ID,
          createdBy: USER_ID,
          version: 1,
          components: [webComponent({ name: 'Web' }), webComponent({ name: 'web' })],
        }),
      ).rejects.toThrowError(/Duplicate plan component name/);
    });
  });

  describe('unique index (project, version)', () => {
    it('rejects a second plan with the same project+version', async () => {
      await draftValid();
      await expect(
        DeploymentPlan.draft({
          projectId: PROJECT_ID,
          analysisId: ANALYSIS_ID,
          createdBy: USER_ID,
          version: 1,
          components: [webComponent({ name: 'only' })],
        }),
      ).rejects.toThrowError(/duplicate key|E11000/);
    });

    it('all same version a different project is fine', async () => {
      await draftValid();
      const otherProject = '64b1f6274190d8fe2ee1ba90' as unknown as Types.ObjectId;
      const second = await DeploymentPlan.draft({
        projectId: otherProject,
        analysisId: ANALYSIS_ID,
        createdBy: USER_ID,
        version: 1,
        components: [webComponent({ name: 'only' })],
      });
      expect(String(second.project)).toBe(String(otherProject));
    });
  });

  describe('component editing (DRAFT only)', () => {
    it('add / update / remove work in DRAFT with invariant guards', async () => {
      const plan = await draftValid();

      const withWorker = await plan.addComponent(webComponent({ name: 'worker', type: 'WORKER', replicas: 1 }));
      expect(withWorker.components).toHaveLength(3);

      const updated = await withWorker.updateComponent('worker', { replicas: 2 });
      expect([...updated.components].find((component) => component.name === 'worker')?.replicas).toBe(2);

      const removed = await updated.removeComponent('worker');
      expect(removed.components).toHaveLength(2);
    });

    it('addComponent rejects duplicates and update/remove reject unknown names', async () => {
      const plan = await draftValid();

      await expect(plan.addComponent(webComponent({ name: 'API' }))).rejects.toThrowError(
        /Duplicate plan component name/,
      );
      await expect(plan.updateComponent('ghost', { replicas: 2 })).rejects.toThrowError(ConflictError);
      await expect(plan.removeComponent('ghost')).rejects.toThrowError(ConflictError);
    });

    it('removeComponent never goes below one', async () => {
      const small = await DeploymentPlan.draft({
        projectId: '64b1f6274190d8fe2ee1ba90' as unknown as Types.ObjectId,
        analysisId: ANALYSIS_ID,
        createdBy: USER_ID,
        version: 1,
        components: [webComponent()],
      });

      await expect(small.removeComponent('web')).rejects.toThrowError(/at least one component/);
    });

    it('all component edits fail once APPROVED (immutable contract)', async () => {
      const plan = await draftValid();
      const approved = await plan.approve(REVIEWER_ID);

      await expect(approved.addComponent(webComponent({ name: 'extra' }))).rejects.toThrowError(
        /only while DRAFT/,
      );
      await expect(approved.updateComponent('web', { replicas: 9 })).rejects.toThrowError(
        /only while DRAFT/,
      );
      await expect(approved.removeComponent('web')).rejects.toThrowError(/only while DRAFT/);
    });

    it('REJECTED plans are also frozen', async () => {
      const plan = await draftValid();
      const rejected = await plan.reject(REVIEWER_ID, 'overprovisioned');

      await expect(rejected.addComponent(webComponent({ name: 'extra' }))).rejects.toThrowError(
        /only while DRAFT/,
      );
    });
  });

  describe('recommendations', () => {
    it('attachRecommendation(id) appends; duplicates throw', async () => {
      const plan = await draftValid();

      const first = await plan.attachRecommendation(RECOMMENDATION_ID);
      expect(first.recommendations).toHaveLength(1);

      await expect(first.attachRecommendation(RECOMMENDATION_ID)).rejects.toThrowError(
        /already attached/,
      );

      const second = await first.attachRecommendation(OTHER_RECOMMENDATION_ID);
      expect(second.recommendations).toHaveLength(2);
    });
  });

  describe('review transitions', () => {
    it('DRAFT -> APPROVED stamps the review and canGenerateFiles works', async () => {
      const approved = await (await draftValid()).approve(REVIEWER_ID);

      expect(approved.status).toBe('APPROVED');
      expect(String(approved.review?.decidedBy)).toBe(String(REVIEWER_ID));
      expect(approved.review?.decidedAt).toBeInstanceOf(Date);
      expect(approved.canGenerateFiles()).toBe(true);
      expect(approved.totalReplicas).toBe(5);
    });

    it('DRAFT -> REJECTED requires a reason', async () => {
      const rejected = await (await draftValid()).reject(REVIEWER_ID, '  holistic retry  ');

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.review?.reason).toBe('holistic retry');
      expect(rejected.review?.decidedAt).toBeInstanceOf(Date);
    });

    it('reject() without a reason throws an invariant', async () => {
      const plan = await draftValid();

      await expect(plan.reject(REVIEWER_ID, '   ')).rejects.toThrowError(/reason is required/);
      await expect(plan.reject(REVIEWER_ID, '')).rejects.toThrowError(InvariantViolationError);
    });

    it('approve runs ALL invariants: invariant violations block approval', async () => {
      const plan = await draftValid();
      // Mutate out-of-band then approve without revalidation
      (plan.get('components') as { replicas: number }[])?.forEach(
        (component) => (component.replicas = 0),
      );
      await expect(plan.approve(REVIEWER_ID)).rejects.toThrowError();
    });

    it('APPROVED -> SUPERSEDED works; REJECTED and SUPERSEDED are terminal', async () => {
      const approved = await (await draftValid()).approve(REVIEWER_ID);
      const superseded = await approved.supersede();

      expect(superseded.status).toBe('SUPERSEDED');
      await expect(superseded.supersede()).rejects.toThrowError(/Invalid state transition/);
      await expect(superseded.reject(REVIEWER_ID, 'nope')).rejects.toThrowError(
        /Invalid state transition/,
      );

      const rejectedPlan = await (
        await DeploymentPlan.draft({
          projectId: PROJECT_ID,
          analysisId: ANALYSIS_ID,
          createdBy: USER_ID,
          version: 2,
          components: [webComponent()],
        })
      ).reject(REVIEWER_ID, 'no');
      await expect(rejectedPlan.supersede()).rejects.toThrowError(/Invalid state transition/);
    });

    it('supersede() on a DRAFT throws', async () => {
      await expect((await draftValid()).supersede()).rejects.toThrowError(
        /cannot move from "DRAFT" to "SUPERSEDED"/,
      );
    });

    it('assertApproved() throws for drafts', async () => {
      const plan = await draftValid();
      expect(() => plan.assertApproved()).toThrowError(/not approved/);
    });
  });

  describe('createRevision()', () => {
    it('only from APPROVED or REJECTED', async () => {
      const plan = await draftValid();
      expect(() => plan.createRevision(USER_ID)).toThrowError(/only from APPROVED or REJECTED/);
    });

    it('produces a NEW unsaved DRAFT with deep-copied components and version+1', async () => {
      const approved = await (await draftValid()).approve(REVIEWER_ID);
      const revision = approved.createRevision(USER_ID);

      expect(revision.isNew).toBe(true);
      expect(revision.status).toBe('DRAFT');
      expect(revision.version).toBe(2);
      expect(String(revision.previousPlan)).toBe(String(approved.id));
      expect(revision.components).toHaveLength(2);
      expect(revision.totalReplicas).toBe(5);
      // deep copy: mutating the revision does not touch the approved original
      [
        ...revision.get('components'),
      ][0]!.replicas = 99;
      expect(approved.get('components')[0]!.replicas).toBe(3);
    });
  });

  it('exposes the model name constant', () => {
    expect(DEPLOYMENT_PLAN_MODEL_NAME).toBe('DeploymentPlan');
  });
});
