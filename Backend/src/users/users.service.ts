import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { AccountStatus, ActiveMode } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { SwitchModeDto } from './dto/switch-mode.dto';
import type { UpdateEmailDto } from './dto/update-email.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { ensureWorkerProfileStub } from './worker-profile.stub';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-006: actualizar nombre y/o zona. */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    if (dto.name === undefined && dto.zoneId === undefined) {
      throw new BadRequestException('Indique al menos un campo para actualizar (nombre o zona)');
    }

    if (dto.zoneId !== undefined) {
      const zone = await this.prisma.zone.findFirst({ where: { id: dto.zoneId, active: true } });
      if (!zone) {
        throw new BadRequestException('La zona seleccionada no existe');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
      },
    });
  }

  /** RF-007: cambiar entre modo cliente y trabajador (crea el perfil de trabajador la primera vez). */
  async switchMode(userId: string, dto: SwitchModeDto): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      if (dto.mode === ActiveMode.WORKER) {
        await ensureWorkerProfileStub(tx, userId);
      }
      return tx.user.update({ where: { id: userId }, data: { activeMode: dto.mode } });
    });
  }

  /** RF-010: asignar o quitar el correo opcional. */
  async updateEmail(userId: string, dto: UpdateEmailDto): Promise<User> {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      throw new UnauthorizedException('Su sesión ya no es válida. Inicie sesión de nuevo');
    }

    const email = dto.email;
    if (email === current.email) {
      return current;
    }

    if (email) {
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken && taken.id !== userId) {
        throw new ConflictException('Este correo electrónico ya está registrado');
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { email, emailVerifiedAt: null },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Este correo electrónico ya está registrado');
      }
      throw error;
    }
  }

  /** RF-071: baja lógica de la cuenta y revocación de todas sus sesiones. */
  async deleteAccount(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: AccountStatus.DELETED },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }
}
