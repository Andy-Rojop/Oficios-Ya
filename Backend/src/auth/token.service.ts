import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { parseDurationToMs } from '../common/utils/duration.util';
import type { AccessTokenPayload, RefreshTokenPayload } from '../common/types/authenticated-user';
import type { EnvConfig } from '../config/env.validation';
import type { ActiveMode, Role } from '../generated/prisma/enums';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  get accessTtlMs(): number {
    return parseDurationToMs(this.configService.get('JWT_ACCESS_TTL', { infer: true }));
  }

  get refreshTtlMs(): number {
    return parseDurationToMs(this.configService.get('JWT_REFRESH_TTL', { infer: true }));
  }

  signAccessToken(
    user: { id: string; role: Role; activeMode: ActiveMode },
    sessionId: string,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      activeMode: user.activeMode,
      sid: sessionId,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: Math.floor(this.accessTtlMs / 1000),
    });
  }

  /** El JWT de refresco incluye un jti aleatorio para que cada rotación genere un token distinto. */
  signRefreshToken(userId: string, sessionId: string): Promise<string> {
    const payload: RefreshTokenPayload = { sub: userId, sid: sessionId, jti: randomUUID() };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: Math.floor(this.refreshTtlMs / 1000),
    });
  }

  /** Devuelve el payload o null si el token es inválido/expiró. */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
      if (!payload.sub || !payload.sid) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  /** Verifica un JWT de acceso (mismo secreto que HTTP). Devuelve null si es inválido o expiró. */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      if (!payload.sub || !payload.sid) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  /** SHA-256 (los JWT superan los 72 bytes que admite bcrypt). */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  tokenMatchesHash(token: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashToken(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  newRefreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlMs);
  }
}
