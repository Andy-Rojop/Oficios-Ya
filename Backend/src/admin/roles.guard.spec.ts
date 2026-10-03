import { CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { Role } from '../generated/prisma/enums';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

function makeContext(
  user: { id: string; role: Role } | undefined,
  roles?: Role[],
): ExecutionContext {
  const reflectorGet = (_key: unknown, _targets: unknown) => roles;
  const reflector = { getAllAndOverride: reflectorGet } as unknown as Reflector;
  void reflector;
  return {
    getType: () => 'http',
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard — rutas admin', () => {
  it('USER recibe 403 en rutas @Roles(ADMIN, MUNICIPAL)', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN', 'MUNICIPAL'] as Role[],
    } as unknown as Reflector;
    const guard: CanActivate = new RolesGuard(reflector);
    const ctx = makeContext({ id: 'u1', role: 'USER' as Role }, ['ADMIN', 'MUNICIPAL']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('ADMIN pasa en rutas @Roles(ADMIN, MUNICIPAL)', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN', 'MUNICIPAL'] as Role[],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = makeContext({ id: 'a1', role: 'ADMIN' as Role }, ['ADMIN', 'MUNICIPAL']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('MUNICIPAL pasa; USER no en @Roles(ADMIN) exclusivo', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'] as Role[],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext({ id: 'a1', role: 'ADMIN' as Role }))).toBe(true);
    expect(() => guard.canActivate(makeContext({ id: 'm1', role: 'MUNICIPAL' as Role }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(makeContext({ id: 'u1', role: 'USER' as Role }))).toThrow(
      ForbiddenException,
    );
  });
});

// Silencia import no usado del helper ROLES_KEY en tree-shaking de tests.
void ROLES_KEY;
