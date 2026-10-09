import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload, AuthenticatedUser } from '../../common/types/authenticated-user';
import type { EnvConfig } from '../../config/env.validation';
import { AccountStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';

const cookieExtractor = (req: Request): string | null => {
  const cookies = req?.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /**
   * Verifica que la sesión siga vigente y la cuenta activa. Rol y modo se toman de la BD
   * (fuente de verdad), así los cambios de modo/rol aplican de inmediato.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.userId !== payload.sub ||
      session.user.status !== AccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Su sesión ya no es válida. Inicie sesión de nuevo');
    }

    return {
      id: session.user.id,
      role: session.user.role,
      activeMode: session.user.activeMode,
      sessionId: session.id,
    };
  }
}
