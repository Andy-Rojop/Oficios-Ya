import type { Prisma } from '../generated/prisma/client';

export const WORKER_STUB_HEADLINE = 'Oficio por definir';
export const WORKER_STUB_DESCRIPTION = 'Perfil en construcción';

/** Crea el WorkerProfile mínimo la primera vez que un usuario pasa a modo trabajador. */
export async function ensureWorkerProfileStub(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.workerProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      headline: WORKER_STUB_HEADLINE,
      description: WORKER_STUB_DESCRIPTION,
    },
  });
}
