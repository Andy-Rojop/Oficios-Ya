import type { User } from '../generated/prisma/client';
import { AccountStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

type BanFields = Pick<User, 'id' | 'status' | 'bannedUntil'>;

/**
 * Si el ban temporal ya venció, reactiva la cuenta.
 * Devuelve el usuario usable (ACTIVE) o el mismo si sigue suspendido.
 */
export async function clearExpiredBanIfNeeded<T extends BanFields>(
  prisma: PrismaService,
  user: T,
): Promise<T> {
  if (user.status !== AccountStatus.SUSPENDED) {
    return user;
  }
  if (!user.bannedUntil || user.bannedUntil > new Date()) {
    return user;
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { status: AccountStatus.ACTIVE, bannedUntil: null },
  });
  return { ...user, ...updated };
}

/** Mensaje de login/API cuando la cuenta sigue suspendida. */
export function suspendedAccountMessage(bannedUntil: Date | null): string {
  if (bannedUntil && bannedUntil > new Date()) {
    const when = bannedUntil.toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Guatemala',
    });
    return `Su cuenta está suspendida hasta el ${when}.`;
  }
  return 'Su cuenta está suspendida de forma permanente. Contacte a soporte.';
}
