import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/** Límite más estricto para rutas sensibles: 10 solicitudes por minuto por IP. */
const STRICT_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[name];
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookieService,
  ) {}

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'RF-001: registro con teléfono verificado por Firebase' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.authService.register(dto, req.headers['user-agent']);
    this.cookieService.setAuthCookies(res, tokens);
    return user;
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'RF-002: inicio de sesión con teléfono y contraseña' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.authService.login(dto, req.headers['user-agent']);
    this.cookieService.setAuthCookies(res, tokens);
    return user;
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rota el refresh token y emite un nuevo access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    try {
      const { user, tokens } = await this.authService.refresh(
        readCookie(req, REFRESH_TOKEN_COOKIE),
        req.headers['user-agent'],
      );
      this.cookieService.setAuthCookies(res, tokens);
      return user;
    } catch (error) {
      this.cookieService.clearAuthCookies(res);
      throw error;
    }
  }

  /**
   * Pública a propósito: identifica la sesión por la cookie refresh_token, de modo que
   * se pueda cerrar sesión aunque el access token ya haya expirado.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Cierra la sesión actual y limpia las cookies' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(readCookie(req, REFRESH_TOKEN_COOKIE));
    this.cookieService.clearAuthCookies(res);
    return { message: 'Sesión cerrada' };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  @ApiOperation({ summary: 'RF-004: restablecer contraseña con verificación por SMS' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    this.cookieService.clearAuthCookies(res);
    return { message: 'Contraseña actualizada. Inicie sesión con su nueva contraseña' };
  }

  @ApiCookieAuth('access_token')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('phone/change')
  @ApiOperation({ summary: 'RF-005: cambiar el teléfono (verificación SMS + contraseña)' })
  changePhone(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePhoneDto,
  ): Promise<UserResponseDto> {
    return this.authService.changePhone(user.id, user.sessionId, dto);
  }

  @ApiCookieAuth('access_token')
  @Get('me')
  @ApiOperation({ summary: 'Usuario autenticado (sin datos sensibles)' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }
}
