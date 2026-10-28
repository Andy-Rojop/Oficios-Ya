import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { TokenService } from '../auth/token.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ImageUploadInterceptor, type UploadedImage } from '../storage/image-upload.interceptor';
import { StorageService } from '../storage/storage.service';
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
    private readonly storage: StorageService,
  ) {}

  private toDto(user: Parameters<typeof UserResponseDto.fromEntity>[0]): UserResponseDto {
    return UserResponseDto.fromEntity(user, {
      toPublicUrl: (path) => this.storage.getPublicUrl(path),
      includePendingAvatar: true,
    });
  }

  @Patch('me')
  @ApiOperation({ summary: 'RF-006: actualizar nombre y zona' })
  async updateProfile(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateProfile(current.id, dto);
    return this.toDto(user);
  }

  @Post('me/avatar')
  @UseInterceptors(ImageUploadInterceptor)
  @ApiOperation({ summary: 'QA2: subir foto de perfil (queda pendiente de aprobación admin)' })
  async uploadAvatar(
    @CurrentUser() current: AuthenticatedUser,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.uploadAvatar(current.id, file);
    return this.toDto(user);
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
    return this.toDto(user);
  }

  @Patch('me/email')
  @ApiOperation({ summary: 'RF-010: asignar o quitar el correo electrónico opcional' })
  async updateEmail(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateEmailDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateEmail(current.id, dto);
    return this.toDto(user);
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
