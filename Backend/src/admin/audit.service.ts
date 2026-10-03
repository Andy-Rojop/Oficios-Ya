import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Bitácora de acciones administrativas (RF-064). Fallar al escribir no debe romper la mutación. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          metadata: entry.metadata ?? undefined,
          ip: entry.ip ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
        },
        'No se pudo escribir la bitácora admin',
      );
    }
  }
}
