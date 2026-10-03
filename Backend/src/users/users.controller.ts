import { Body, Controller, Delete, HttpCode, HttpStatus, Patch, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { TokenService } from '../auth/token.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { SwitchModeDto } from './dto/switch-mode.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth('access_token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly cookieService: AuthCookieService,
  ) {}

  @Patch('me')
  @ApiOperation({ summary: 'RF-006: actualizar nombre y zona' })
  async updateProfile(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateProfile(current.id, dto);
    return UserResponseDto.fromEntity(user);
  }

  @Patch('me/mode')
  @ApiOperation({ summary: 'RF-007: cambiar entre modo CLIENT y WORKER' })
  async switchMode(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: SwitchModeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.switchMode(current.id, dto);
    // El access token lleva activeMode: se reemite para que el JWT refleje el nuevo modo.
    const accessToken = await this.tokenService.signAccessToken(user, current.sessionId);
    this.cookieService.setAccessCookie(res, accessToken);
    return UserResponseDto.fromEntity(user);
  }

  @Patch('me/email')
  @ApiOperation({ summary: 'RF-010: asignar o quitar el correo electrónico opcional' })
  async updateEmail(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateEmailDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateEmail(current.id, dto);
    return UserResponseDto.fromEntity(user);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-071: eliminar la cuenta (baja lógica)' })
  async deleteAccount(
    @CurrentUser() current: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.usersService.deleteAccount(current.id);
    this.cookieService.clearAuthCookies(res);
  }
}
