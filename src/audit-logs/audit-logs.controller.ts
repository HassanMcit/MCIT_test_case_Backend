import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService, CreateAuditLogDto } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * GET /api/audit-logs
   * List all audit logs with filters (Admin only - specifically Hassan Ali)
   */
  @Get()
  @ApiOperation({ summary: 'Get activity audit logs with client telemetry (Admin Only)' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك بالاطلاع على سجل تدقيق العمليات');
    }

    return this.auditLogsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
      search,
      actionCategory: category,
      userId: userId ? Number(userId) : undefined,
    });
  }

  /**
   * POST /api/audit-logs/log
   * Record custom client-side actions (e.g., Teams Call, Outlook Email, Excel export)
   */
  @Post('log')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record custom client-side user action' })
  async recordClientAction(@Request() req: any, @Body() body: Partial<CreateAuditLogDto>) {
    const user = req.user;
    const ip =
      body.ip ||
      req.headers?.['x-client-ip'] ||
      (typeof req.headers?.['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : '') ||
      req.ip;

    const userAgent = body.userAgent || req.headers?.['user-agent'] || '';

    await this.auditLogsService.log({
      userId: user?.id || user?.userId || null,
      userName: user?.name || null,
      email: user?.email || null,
      role: user?.role || null,
      action: body.action || 'إجراء في النظام',
      actionCategory: body.actionCategory || 'CLIENT_ACTION',
      description: body.description || null,
      method: body.method || 'UI_ACTION',
      endpoint: body.endpoint || req.originalUrl,
      ip,
      macAddress: body.macAddress || req.headers?.['x-device-mac'],
      location: body.location || req.headers?.['x-location'],
      deviceInfo: body.deviceInfo || req.headers?.['x-device-info'],
      userAgent,
      status: body.status || 'success',
    });

    return { success: true };
  }
}
