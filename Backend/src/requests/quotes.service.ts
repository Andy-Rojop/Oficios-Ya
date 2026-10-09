import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuoteStatus, RequestStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuoteDto, RespondQuoteDto } from './dto/request-requests.dto';
import { toQuoteDto, type QuoteDto, type QuoteRow } from './dto/request-responses.dto';
import { ensurePairConversation } from './pair-conversation.util';
import { OPEN_STATUSES, QUOTABLE_STATUSES } from './request-status.util';
import { QUOTE_SELECT } from './requests.service';

interface RequestParties {
  id: string;
  clientId: string;
  workerId: string;
  status: RequestStatus;
}

/**
 * Cotizaciones (RF-043). Son PRIVADAS: solo el cliente y el trabajador de la solicitud
 * (o de la conversación a la que pertenece la cotización) pueden verlas o responderlas.
 * Para un tercero, la solicitud/cotización "no existe" (404).
 */
@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  /** El trabajador de la solicitud envía una cotización al cliente. */
  async createForRequest(
    userId: string,
    requestId: string,
    dto: CreateQuoteDto,
  ): Promise<QuoteDto> {
    const request = await this.requestForParticipant(requestId, userId);
    if (request.clientId === request.workerId) {
      throw new BadRequestException('No puede cotizar una solicitud consigo mismo');
    }
    if (request.workerId !== userId) {
      throw new ForbiddenException('Solo el trabajador puede enviar cotizaciones');
    }
    if (!QUOTABLE_STATUSES.includes(request.status)) {
      throw new ConflictException('Ya no se pueden enviar cotizaciones en esta solicitud');
    }
    const pending = await this.prisma.quote.findFirst({
      where: { requestId: request.id, status: QuoteStatus.SENT },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('Ya envió una cotización que el cliente aún no responde');
    }

    const conversation = await ensurePairConversation(
      this.prisma,
      request.clientId,
      request.workerId,
    );
    const quote = (await this.prisma.quote.create({
      data: {
        requestId: request.id,
        conversationId: conversation.id,
        amount: dto.amount,
        scope: dto.scope,
      },
      select: QUOTE_SELECT,
    })) as unknown as QuoteRow;
    return toQuoteDto(quote);
  }

  /** Cotizaciones de una solicitud (solo participantes). */
  async listForRequest(userId: string, requestId: string): Promise<QuoteDto[]> {
    const request = await this.requestForParticipant(requestId, userId);
    const rows = (await this.prisma.quote.findMany({
      where: { requestId: request.id },
      orderBy: [{ createdAt: 'desc' }],
      select: QUOTE_SELECT,
    })) as unknown as QuoteRow[];
    return rows.map(toQuoteDto);
  }

  /** El cliente acepta o rechaza una cotización pendiente. */
  async respond(userId: string, quoteId: string, dto: RespondQuoteDto): Promise<QuoteDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        ...QUOTE_SELECT,
        request: { select: { id: true, clientId: true, workerId: true, status: true } },
        conversation: { select: { clientId: true, workerId: true } },
      },
    });
    // Participantes = los de la solicitud; si la cotización no está ligada a una, los de su conversación.
    const parties = quote ? (quote.request ?? quote.conversation) : null;
    if (!quote || !parties || (parties.clientId !== userId && parties.workerId !== userId)) {
      throw new NotFoundException('Cotización no encontrada');
    }
    if (parties.clientId !== userId) {
      throw new ForbiddenException('Solo el cliente puede aceptar o rechazar una cotización');
    }
    if (quote.status !== QuoteStatus.SENT) {
      throw new ConflictException('Esta cotización ya fue respondida');
    }
    if (quote.request && !OPEN_STATUSES.includes(quote.request.status)) {
      throw new ConflictException('La solicitud ya no está activa');
    }
    if (dto.status === QuoteStatus.ACCEPTED && quote.requestId) {
      const accepted = await this.prisma.quote.findFirst({
        where: { requestId: quote.requestId, status: QuoteStatus.ACCEPTED },
        select: { id: true },
      });
      if (accepted) {
        throw new ConflictException('Ya aceptó otra cotización para esta solicitud');
      }
    }

    const result = await this.prisma.quote.updateMany({
      where: { id: quote.id, status: QuoteStatus.SENT },
      data: { status: dto.status },
    });
    if (result.count !== 1) {
      throw new ConflictException('Esta cotización ya fue respondida');
    }
    return toQuoteDto({ ...(quote as unknown as QuoteRow), status: dto.status });
  }

  private async requestForParticipant(requestId: string, userId: string): Promise<RequestParties> {
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id: requestId, OR: [{ clientId: userId }, { workerId: userId }] },
      select: { id: true, clientId: true, workerId: true, status: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return request;
  }
}
