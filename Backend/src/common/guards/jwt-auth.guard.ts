import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable, catchError, map, of } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global: exige JWT válido (cookie access_token) salvo rutas @Public().
 * En rutas públicas intenta cargar el usuario si hay cookie, sin bloquear a invitados.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    // Los gateways WebSocket (/chat) autentican en el handshake con la misma cookie JWT.
    if (context.getType() !== 'http') {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      return super.canActivate(context);
    }

    // Ruta pública: autentica si hay token; si no, sigue como invitado.
    const result = super.canActivate(context);
    if (result instanceof Observable) {
      return result.pipe(
        map(() => true),
        catchError(() => of(true)),
      );
    }
    return Promise.resolve(result)
      .then(() => true)
      .catch(() => true);
  }

  override handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | undefined {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return user || undefined;
    }
    if (err || !user) {
      throw err instanceof Error
        ? err
        : new UnauthorizedException('Debe iniciar sesión para continuar');
    }
    return user;
  }
}
