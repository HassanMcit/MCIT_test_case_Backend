import { DatabaseService } from '../database/database.service';
export interface CreateAuditLogDto {
    userId?: number;
    userName?: string;
    email?: string;
    role?: string;
    action: string;
    actionCategory?: string;
    description?: string;
    method?: string;
    endpoint?: string;
    ip?: string;
    macAddress?: string;
    location?: string;
    deviceInfo?: string;
    userAgent?: string;
    status?: string;
}
export declare function generateDeterministicMac(seed: string): string;
export declare function parseDeviceSummary(ua: string): string;
export declare class AuditLogsService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    resolveLocation(ip?: string): Promise<string>;
    log(dto: CreateAuditLogDto): Promise<void>;
    findAll(query: {
        page?: number;
        limit?: number;
        search?: string;
        actionCategory?: string;
        userId?: number;
    }): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
