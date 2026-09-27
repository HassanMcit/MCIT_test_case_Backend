import { DatabaseService } from '../database/database.service';
export declare class DashboardService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getStats(): Promise<{
        total: number;
        passed: number;
        failed: number;
        pending: number;
        passRate: number;
        totalProjects: number;
    }>;
    getChartData(days?: number): Promise<{
        date: string;
        passed: number;
        failed: number;
        pending: number;
    }[]>;
    getSeverityBreakdown(): Promise<{
        total: number;
        breakdown: {
            priority: string;
            count: number;
            percentage: number;
        }[];
    }>;
}
