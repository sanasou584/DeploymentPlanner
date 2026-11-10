
import type { RequestHandler } from 'express';

import type { AuthService } from '../services/auth/auth.service.js';
import { parseOrThrow } from '../shared/validation/request-validation.js';
import { registerSchema } from '../services/auth/register.schema.js';
import { loginSchema } from '../services/auth/login.schema.js';
import type { SessionTokenService } from '../types/index.js';
import { extractBearerToken } from '../shared/security/bearer-token.js';


export function createRegisterController(
  authService: AuthService,
): RequestHandler {
  return async (req, res) => {
    const user = await authService.register(
      parseOrThrow(registerSchema, req.body, 'Invalid registration data'),
    );

    res.status(201).json({
      message:'Registration submitted. Awaiting administrator approval.',
      data: user,
    });
  };
}



export function createLoginController(
  authService: AuthService,
  sessions: SessionTokenService,
): RequestHandler {
  return async (req, res) => {
    // Vérifier les identifiants via le service métier
    const user = await authService.login(
      parseOrThrow(loginSchema, req.body, 'Invalid login data'),
    );

    // Créer un JWT avec le service existant
    const accessToken = await sessions.create(user.id);

    res.setHeader('Cache-Control', 'no-store');

    res.status(200).json({
      message: 'Login successful',
      data: user,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  };
}

/**
 * Logout = deny-list the presented access token server-side (db-backed,
 * takes effect on the NEXT guarded call); the frontend still clears its
 * own session state.
 */
export function createLogoutController(
  sessions: SessionTokenService,
): RequestHandler {
  return async (req, res) => {
    const token = extractBearerToken(req.headers.authorization);

    await sessions.revoke(token);

    res.setHeader('Cache-Control', 'no-store');

    res.status(200).json({
      message: 'Logged out successfully',
    });
  };
}


