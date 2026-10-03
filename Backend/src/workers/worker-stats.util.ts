import { RequestStatus } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';

export type StatsDb = Pick<Prisma.TransactionClient, 'serviceRequest' | 'review' | 'workerProfile'>;

export const roundRating = (value: number): number => Math.round(value * 100) / 100;

/**
 * Recalcula las estadísticas públicas del perfil desde los datos reales (idempotente, por lo que
 * es seguro llamarla dentro de una transacción tras cada confirmación o reseña):
 *  - completedJobs: solicitudes COMPLETED confirmadas por el cliente;
 *  - ratingAverage / ratingCount: solo si `ratings` es true (al crear una reseña).
 */
export async function recomputeWorkerStats(
  db: StatsDb,
  workerUserId: string,
  options: { ratings: boolean },
): Promise<void> {
  const completedJobs = await db.serviceRequest.count({
    where: {
      workerId: workerUserId,
      status: RequestStatus.COMPLETED,
      clientConfirmedAt: { not: null },
    },
  });
  const data: { completedJobs: number; ratingAverage?: number; ratingCount?: number } = {
    completedJobs,
  };

  if (options.ratings) {
    const aggregate = await db.review.aggregate({
      where: { workerId: workerUserId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    data.ratingCount = aggregate._count._all;
    data.ratingAverage = roundRating(aggregate._avg.rating ?? 0);
  }

  await db.workerProfile.updateMany({ where: { userId: workerUserId }, data });
}
