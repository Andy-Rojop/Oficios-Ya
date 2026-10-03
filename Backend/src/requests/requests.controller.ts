import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  ChangeRequestStatusDto,
  CreateQuoteDto,
  CreateRequestDto,
  ListRequestsQueryDto,
  RespondQuoteDto,
} from './dto/request-requests.dto';
import type { QuoteDto, RequestDto } from './dto/request-responses.dto';
import { QuotesService } from './quotes.service';
import { RequestsService } from './requests.service';

/** Solicitudes de servicio (RF-041, RF-042, RF-044). Todas las rutas exigen sesión. */
@ApiTags('requests')
@ApiCookieAuth('access_token')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly quotes: QuotesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'El cliente envía una solicitud a un trabajador (y se enlaza a su chat)',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRequestDto,
  ): Promise<RequestDto> {
    return this.requests.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mis solicitudes (como cliente y/o trabajador). Filtros: role, status' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRequestsQueryDto,
  ): Promise<RequestDto[]> {
    return this.requests.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con cotizaciones (solo participantes)' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<RequestDto> {
    return this.requests.getOne(user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado (reglas por rol; ver máquina de estados)' })
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: ChangeRequestStatusDto,
  ): Promise<RequestDto> {
    return this.requests.changeStatus(user.id, id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'El cliente confirma que el trabajo finalizado quedó listo (clientConfirmedAt)',
  })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<RequestDto> {
    return this.requests.confirmCompletion(user.id, id);
  }

  @Post(':id/quotes')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'El trabajador envía una cotización { amount, scope }' })
  createQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: CreateQuoteDto,
  ): Promise<QuoteDto> {
    return this.quotes.createForRequest(user.id, id, dto);
  }

  @Get(':id/quotes')
  @ApiOperation({ summary: 'Cotizaciones de la solicitud (privadas: solo cliente y trabajador)' })
  listQuotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<QuoteDto[]> {
    return this.quotes.listForRequest(user.id, id);
  }
}

/** Respuesta del cliente a una cotización. */
@ApiTags('requests')
@ApiCookieAuth('access_token')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'El cliente acepta (ACCEPTED) o rechaza (REJECTED) una cotización' })
  respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: RespondQuoteDto,
  ): Promise<QuoteDto> {
    return this.quotes.respond(user.id, id, dto);
  }
}
