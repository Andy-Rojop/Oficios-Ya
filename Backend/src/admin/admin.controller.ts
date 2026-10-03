import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { Role } from '../generated/prisma/enums';
import { AdminService } from './admin.service';
import {
  AdminPaginationQueryDto,
  DecideVerificationDto,
  ListAdminReportsQueryDto,
  ListAdminUsersQueryDto,
  ResolveReportDto,
  UpdateUserStatusDto,
  UpsertCategoryDto,
  UpsertZoneDto,
} from './dto/admin.dto';

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim();
  }
  return req.ip;
}

/** Panel de administración y moderación (RF-055 a RF-064). */
@ApiTags('admin')
@ApiCookieAuth('access_token')
@Roles(Role.ADMIN, Role.MUNICIPAL)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Contadores: usuarios, trabajadores, reportes abiertos, solicitudes por estado',
  })
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Listado paginado de usuarios' })
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Suspender o reactivar un usuario (solo ADMIN)' })
  updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
  ) {
    return this.admin.updateUserStatus(user.id, id, dto, clientIp(req));
  }

  @Get('verifications')
  @ApiOperation({ summary: 'Trabajadores con identidad PENDING' })
  listVerifications(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listPendingVerifications(query);
  }

  @Patch('verifications/:id')
  @ApiOperation({ summary: 'Aprobar o rechazar verificación de identidad' })
  decideVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: DecideVerificationDto,
    @Req() req: Request,
  ) {
    return this.admin.decideVerification(user.id, id, dto, clientIp(req));
  }

  @Get('reports')
  @ApiOperation({ summary: 'Reportes abiertos / en revisión (o filtrar por status)' })
  listReports(@Query() query: ListAdminReportsQueryDto) {
    return this.admin.listReports(query);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolver un reporte' })
  resolveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: ResolveReportDto,
    @Req() req: Request,
  ) {
    return this.admin.resolveReport(user.id, id, dto, false, clientIp(req));
  }

  @Patch('reports/:id/dismiss')
  @ApiOperation({ summary: 'Desestimar un reporte' })
  dismissReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: ResolveReportDto,
    @Req() req: Request,
  ) {
    return this.admin.resolveReport(user.id, id, dto, true, clientIp(req));
  }

  @Get('reports/:id/conversation')
  @ApiOperation({
    summary:
      'Mensajes de una conversación reportada (solo si el reporte es CONVERSATION y está OPEN/IN_REVIEW). Siempre audita el acceso',
  })
  reportConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Req() req: Request,
  ) {
    return this.admin.getReportConversation(user.id, id, clientIp(req));
  }

  @Get('catalog/categories')
  @ApiOperation({ summary: 'Listar categorías (incluye inactivas)' })
  listCategories() {
    return this.admin.listCategories();
  }

  @Post('catalog/categories')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear categoría' })
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertCategoryDto,
    @Req() req: Request,
  ) {
    return this.admin.createCategory(user.id, dto, clientIp(req));
  }

  @Patch('catalog/categories/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoría' })
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: UpsertCategoryDto,
    @Req() req: Request,
  ) {
    return this.admin.updateCategory(user.id, id, dto, clientIp(req));
  }

  @Delete('catalog/categories/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar categoría (baja lógica)' })
  deleteCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Req() req: Request,
  ) {
    return this.admin.deleteCategory(user.id, id, clientIp(req));
  }

  @Get('catalog/zones')
  @ApiOperation({ summary: 'Listar zonas (incluye inactivas)' })
  listZones() {
    return this.admin.listZones();
  }

  @Post('catalog/zones')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear zona' })
  createZone(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertZoneDto,
    @Req() req: Request,
  ) {
    return this.admin.createZone(user.id, dto, clientIp(req));
  }

  @Patch('catalog/zones/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar zona' })
  updateZone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: UpsertZoneDto,
    @Req() req: Request,
  ) {
    return this.admin.updateZone(user.id, id, dto, clientIp(req));
  }

  @Delete('catalog/zones/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar zona (baja lógica)' })
  deleteZone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Req() req: Request,
  ) {
    return this.admin.deleteZone(user.id, id, clientIp(req));
  }

  @Get('audit-log')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bitácora de acciones administrativas (solo ADMIN)' })
  auditLog(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listAuditLog(query);
  }

  @Get('export/users.csv')
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Exportar usuarios a CSV (solo ADMIN)' })
  async exportUsersCsv(@Res() res: Response): Promise<void> {
    const csv = await this.admin.exportUsersCsv();
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios-oficiosya.csv"');
    res.send(csv);
  }
}
