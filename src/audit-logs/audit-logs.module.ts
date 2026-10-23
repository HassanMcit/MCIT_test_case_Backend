import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogInterceptor],
  exports: [AuditLogsService, AuditLogInterceptor],
})
export class AuditLogsModule {}
