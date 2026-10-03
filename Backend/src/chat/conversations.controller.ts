import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ImageUploadInterceptor, type UploadedImage } from '../storage/image-upload.interceptor';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  ListMessagesQueryDto,
  ReportConversationDto,
} from './dto/chat-requests.dto';
import type {
  ChatImageUploadDto,
  ConversationSummaryDto,
  MessagesPageDto,
  ReportCreatedDto,
} from './dto/chat-responses.dto';

/** Chat privado (RF-065 a RF-069). Todas las rutas exigen sesión; el global JwtAuthGuard las protege. */
@ApiTags('chat')
@ApiCookieAuth('access_token')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Crear la conversación con un trabajador (o devolver la existente). El cliente es el usuario actual',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationSummaryDto> {
    return this.chat.createOrGetConversation(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Bandeja de entrada: última actividad, vista previa y no leídos' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ConversationSummaryDto[]> {
    return this.chat.listConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Resumen de una conversación (solo participantes)' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<ConversationSummaryDto> {
    return this.chat.getConversation(user.id, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Mensajes con paginación por cursor (del más nuevo al más antiguo)' })
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<MessagesPageDto> {
    return this.chat.getMessages(user.id, id, query);
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(ImageUploadInterceptor)
  @ApiOperation({
    summary:
      'Subir una imagen al bucket privado (multipart: file). Devuelve imagePath y una URL firmada corta',
  })
  uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<ChatImageUploadDto> {
    return this.chat.uploadImage(user.id, id, file);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloquear a la otra persona: ninguno de los dos podrá enviar mensajes' })
  block(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<ConversationSummaryDto> {
    return this.chat.block(user.id, id);
  }

  @Delete(':id/block')
  @ApiOperation({ summary: 'Quitar el bloqueo que hice' })
  unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<ConversationSummaryDto> {
    return this.chat.unblock(user.id, id);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reportar la conversación (crea un Report abierto)' })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: ReportConversationDto,
  ): Promise<ReportCreatedDto> {
    return this.chat.report(user.id, id, dto.reason);
  }
}
