import type { ActiveMode, Role } from '../../generated/prisma/enums';

/** Usuario autenticado que Passport adjunta a `request.user`. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  activeMode: ActiveMode;
  /** Sesión (refresh token) asociada al access token actual. */
  sessionId: string;
}

/** Payload del JWT de acceso. */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  activeMode: ActiveMode;
  sid: string;
}

/** Payload del JWT de refresco. */
export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
}
