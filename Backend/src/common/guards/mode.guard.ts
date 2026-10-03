import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_WORKER_MODE_KEY } from '../decorators/require-worker-mode.decorator';
import { ActiveMode } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../types/authenticated-user';

/** Con @RequireWorkerMode() exige que el usuario esté en modo trabajador. */
@Injectable()
export class ModeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }
    const requiresWorker = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_WORKER_MODE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiresWorker) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user || user.activeMode !== ActiveMode.WORKER) {
      throw new ForbiddenException('Debes cambiar al modo trabajador para realizar esta acción');
    }
    return true;
  }
}
