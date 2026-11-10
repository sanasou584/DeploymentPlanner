import { Router } from 'express';

import { wireHealth } from '../controllers/health.controller.js';
import { getDbStatus } from '../config/database.js';

/**
 * Operational route (exempt from routes -> controllers -> services: it must
 * respond even when the rest of the app is broken). The DB status getter is
 * injected into the controller so the controller never imports config.
 * Documented in docs/conventions.md.
 */
export const healthRouter: Router = Router();

healthRouter.get('/health', wireHealth(getDbStatus));
