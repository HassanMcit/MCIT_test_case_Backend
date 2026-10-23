import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditLogsService } from './audit-logs.service';
export declare class AuditLogInterceptor implements NestInterceptor {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private record;
}
