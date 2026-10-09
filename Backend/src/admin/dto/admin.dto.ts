import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AccountStatus, IdentityStatus, ReportStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const ADMIN_PAGE_DEFAULT = 1;
export const ADMIN_PAGE_SIZE_DEFAULT = 20;
export const ADMIN_PAGE_SIZE_MAX = 100;

/** Paginación offset compartida por listados admin. */
export class AdminPaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: ADMIN_PAGE_DEFAULT })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ADMIN_PAGE_SIZE_MAX,
    default: ADMIN_PAGE_SIZE_DEFAULT,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ADMIN_PAGE_SIZE_MAX)
  pageSize?: number;
}

export class ListAdminUsersQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre, teléfono o correo' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: [AccountStatus.ACTIVE, AccountStatus.SUSPENDED] })
  @IsIn([AccountStatus.ACTIVE, AccountStatus.SUSPENDED], {
    message: 'El estado debe ser ACTIVE o SUSPENDED',
  })
  status: 'ACTIVE' | 'SUSPENDED';
}

export class DecideVerificationDto {
  @ApiProperty({ enum: [IdentityStatus.VERIFIED, IdentityStatus.REJECTED] })
  @IsIn([IdentityStatus.VERIFIED, IdentityStatus.REJECTED], {
    message: 'La decisión debe ser VERIFIED o REJECTED',
  })
  decision: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Motivo opcional (recomendado al rechazar)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListAdminReportsQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class ResolveReportDto {
  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'Describa la resolución con al menos 5 caracteres' })
  @MaxLength(1000)
  resolution: string;
}

export class UpsertCategoryDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ description: 'Si se omite se genera desde el nombre' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertZoneDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ description: 'aldea, cantón, caserío, sector…' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
