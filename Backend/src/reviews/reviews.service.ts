import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  ReportStatus,
  ReportTarget,
  RequestStatus,
} from '../generated/prisma/enums';
import { NotificationType } from '../notifications/notifications.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { recomputeWorkerStats } from '../workers/worker-stats.util';
import {
  toPublicReview,
  type CreateReviewDto,
  type ListReviewsQueryDto,
  type PublicReviewDto,
  type ReviewRow,
  type WorkerReviewsPageDto,
} from './dto/review.dto';
import { REVIEWS_DEFAULT_LIMIT } from './reviews.constants';

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  workerReply: true,
  repliedAt: true,
  createdAt: true,
  client: { select: { name: true } },
} as const;

/** Reseñas (RF-045 a RF-050): una por solicitud finalizada y confirmada por el cliente. */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** El cliente califica el trabajo. La reseña y las estadísticas del perfil se guardan juntas. */
  async create(userId: string, dto: CreateReviewDto): Promise<PublicReviewDto> {
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id: dto.requestId, OR: [{ clientId: userId }, { workerId: userId }] },
      select: {
        id: true,
        clientId: true,
        workerId: true,
        status: true,
        clientConfirmedAt: true,
        review: { select: { id: true } },
        client: { select: { name: true } },
        worker: { select: { workerProfile: { select: { id: true } } } },
      },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.clientId !== userId) {
      throw new ForbiddenException('Solo el cliente puede calificar el trabajo');
    }
    if (request.status !== RequestStatus.COMPLETED || !request.clientConfirmedAt) {
      throw new BadRequestException(
        'Solo puedes calificar un trabajo finalizado que ya confirmaste',
      );
    }
    if (request.review) {
      throw new ConflictException('Ya calificaste este trabajo');
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const review = (await tx.review.create({
          data: {
            requestId: request.id,
            clientId: request.clientId,
            workerId: request.workerId,
            rating: dto.rating,
            comment: dto.comment ?? null,
          },
          select: REVIEW_SELECT,
        })) as unknown as ReviewRow;
        await recomputeWorkerStats(tx, request.workerId, { ratings: true });
        return review;
      });
      const profileId = request.worker.workerProfile?.id;
      await this.notifications.notify(request.workerId, {
        type: NotificationType.REVIEW_NEW,
        title: 'Nueva reseña',
        body: `${request.client.name} te calificó con ${dto.rating} estrella${dto.rating === 1 ? '' : 's'}.`,
        link: profileId ? `/trabajador/${profileId}` : `/solicitudes/${request.id}`,
      });
      return toPublicReview(created);
    } catch (error) {
      // Carrera: dos envíos simultáneos (requestId es único).
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya calificaste este trabajo');
      }
      throw error;
    }
  }

  /** El trabajador responde a su reseña, una sola vez. */
  async reply(userId: string, reviewId: string, reply: string): Promise<PublicReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        workerId: true,
        clientId: true,
        workerReply: true,
        requestId: true,
        worker: { select: { name: true, workerProfile: { select: { id: true } } } },
      },
    });
    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }
    if (review.workerId !== userId) {
      throw new ForbiddenException('Solo el trabajador reseñado puede responder');
    }
    if (review.workerReply) {
      throw new ConflictException('Ya respondiste esta reseña');
    }

    const result = await this.prisma.review.updateMany({
      where: { id: review.id, workerReply: null },
      data: { workerReply: reply, repliedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new ConflictException('Ya respondiste esta reseña');
    }
    const updated = (await this.prisma.review.findUnique({
      where: { id: review.id },
      select: REVIEW_SELECT,
    })) as unknown as ReviewRow | null;
    if (!updated) {
      throw new NotFoundException('Reseña no encontrada');
    }
    const profileId = review.worker.workerProfile?.id;
    await this.notifications.notify(review.clientId, {
      type: NotificationType.REVIEW_REPLY,
      title: 'Respuesta a tu reseña',
      body: `${review.worker.name} respondió a tu reseña.`,
      link: profileId ? `/trabajador/${profileId}` : `/solicitudes/${review.requestId}`,
    });
    return toPublicReview(updated);
  }

  /** Lista pública de reseñas de un perfil, sin datos privados. */
  async listForWorker(
    profileId: string,
    query: ListReviewsQueryDto,
  ): Promise<WorkerReviewsPageDto> {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { id: profileId },
      select: {
        userId: true,
        ratingAverage: true,
        ratingCount: true,
        user: { select: { status: true } },
      },
    });
    if (!profile || profile.user.status !== AccountStatus.ACTIVE) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const limit = query.limit ?? REVIEWS_DEFAULT_LIMIT;
    const rows = (await this.prisma.review.findMany({
      where: { workerId: profile.userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: REVIEW_SELECT,
    })) as unknown as ReviewRow[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      ratingAverage: Number(profile.ratingAverage.toString()),
      ratingCount: profile.ratingCount,
      items: page.map(toPublicReview),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** Reporte mínimo de una reseña (queda como Report abierto para moderación en la Fase 6). */
  async report(
    userId: string,
    reviewId: string,
    reason: string,
  ): Promise<{ id: string; status: ReportStatus }> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        targetType: ReportTarget.REVIEW,
        targetId: review.id,
        status: ReportStatus.OPEN,
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.report.create({
      data: { reporterId: userId, targetType: ReportTarget.REVIEW, targetId: review.id, reason },
      select: { id: true, status: true },
    });
  }
}
