import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import type { AccountStatus, ActiveMode, Role } from '../../generated/prisma/enums';

/**
 * DTO público del usuario. Se construye campo por campo para no exponer nunca
 * passwordHash, dpi, nit, firebaseUid ni contadores internos de seguridad.
 */
export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: '+50212345678' }) phone: string;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiProperty({ enum: ['USER', 'ADMIN', 'MUNICIPAL'] }) role: Role;
  @ApiProperty({ enum: ['CLIENT', 'WORKER'] }) activeMode: ActiveMode;
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] }) status: AccountStatus;
  @ApiPropertyOptional({ nullable: true }) zoneId: string | null;
  @ApiPropertyOptional({ nullable: true }) phoneVerifiedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) emailVerifiedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.phone = user.phone;
    dto.email = user.email;
    dto.role = user.role;
    dto.activeMode = user.activeMode;
    dto.status = user.status;
    dto.zoneId = user.zoneId;
    dto.phoneVerifiedAt = user.phoneVerifiedAt;
    dto.emailVerifiedAt = user.emailVerifiedAt;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
