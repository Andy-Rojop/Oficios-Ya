import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { EnvConfig } from '../config/env.validation';
import { ACCESS_TOKEN_COOKIE, REFRESH_COOKIE_PATH, REFRESH_TOKEN_COOKIE } from './auth.constants';
import { TokenService } from './token.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthCookieService {
  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly tokenService: TokenService,
  ) {}

  setAuthCookies(res: Response, tokens: AuthTokens): void {
    this.setAccessCookie(res, tokens.accessToken);
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.baseOptions(),
      path: REFRESH_COOKIE_PATH,
      maxAge: this.tokenService.refreshTtlMs,
    });
  }

  setAccessCookie(res: Response, accessToken: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...this.baseOptions(),
      path: '/',
      maxAge: this.tokenService.accessTtlMs,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...this.baseOptions(), path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...this.baseOptions(), path: REFRESH_COOKIE_PATH });
  }

  private baseOptions(): CookieOptions {
    const domain = this.configService.get('COOKIE_DOMAIN', { infer: true });
    const sameSite = this.configService.get('COOKIE_SAMESITE', { infer: true });
    const isProduction = this.configService.get('NODE_ENV', { infer: true }) === 'production';
    // SameSite=None exige Secure; en prod también usamos Secure con Lax.
    const secure = sameSite === 'none' || isProduction;

    return {
      httpOnly: true,
      sameSite,
      secure,
      // Host-only si vacío o "localhost"; Domain solo con subdominio compartido (.tudominio.com).
      ...(domain && domain !== 'localhost' ? { domain } : {}),
    };
  }
}
