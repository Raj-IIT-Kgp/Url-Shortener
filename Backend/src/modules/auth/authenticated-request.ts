import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
}

// Request after JwtStrategy / ApiKeyGuard attached the caller (routes with a required guard)
export type AuthenticatedRequest = Request & { user: AuthUser };

// Request on routes where auth is optional (anonymous callers allowed)
export type OptionalAuthRequest = Request & { user?: AuthUser };
