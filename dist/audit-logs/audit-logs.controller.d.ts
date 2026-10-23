import { AuditLogsService, CreateAuditLogDto } from './audit-logs.service';
export declare class AuditLogsController {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    findAll(req: any, page?: string, limit?: string, search?: string, category?: string, userId?: string): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    recordClientAction(req: any, body: Partial<CreateAuditLogDto>): Promise<{
        success: boolean;
    }>;
}
