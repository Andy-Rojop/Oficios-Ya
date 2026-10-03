import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.constants';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { TokenService } from '../auth/token.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { EnvConfig } from '../config/env.validation';
import { parseCookieHeader } from './cookie.util';

/** Parte del handshake de Socket.IO que se usa para autenticar. */
export interface HandshakeLike {
  headers: { cookie?: string; origin?: string };
}

/**
 * Autentica conexiones Socket.IO con la MISMA cookie `access_token` y el mismo secreto que HTTP,
 * y reutiliza la validación de sesión/estado de cuenta de JwtStrategy.
 */
@Injectable()
export class ChatWsAuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly strategy: JwtStrategy,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async authenticate(handshake: HandshakeLike): Promise<AuthenticatedUser> {
    this.assertAllowedOrigin(handshake.headers.origin);

    const cookies = parseCookieHeader(handshake.headers.cookie);
    const token = cookies[ACCESS_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Debes iniciar sesión para usar el chat');
    }
    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException('Tu sesión expiró. Inicia sesión de nuevo');
    }
    return this.strategy.validate(payload);
  }

  /** Re-valida que la sesión del socket siga vigente (logout, sesión revocada o cuenta suspendida). */
  async ensureSessionActive(user: AuthenticatedUser): Promise<void> {
    await this.strategy.validate({
      sub: user.id,
      sid: user.sessionId,
      role: user.role,
      activeMode: user.activeMode,
    });
  }

  /**
   * El handshake WebSocket no pasa por CORS: se exige que el Origin (si viene) sea el del frontend
   * para evitar que otro sitio use la cookie del usuario (cross-site WebSocket hijacking).
   */
  private assertAllowedOrigin(origin: string | undefined): void {
    if (!origin) return;
    const allowed = this.config.get('FRONTEND_URL', { infer: true });
    if (!allowed) return;
    if (origin.replace(/\/+$/, '') !== allowed.replace(/\/+$/, '')) {
      throw new UnauthorizedException('Origen no permitido');
    }
  }
}
