import { DatabaseService } from '../database/database.service';
export declare class DashboardService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getStats(currentUser?: any, projectId?: number): Promise<{
        total: number;
        passed: number;
        failed: number;
        pending: number;
        passRate: number;
        totalProjects: number;
    }>;
    getChartData(days?: number, currentUser?: any, projectId?: number): Promise<{
        date: string;
        passed: number;
        failed: number;
        pending: number;
    }[]>;
    getSeverityBreakdown(currentUser?: any, projectId?: number): Promise<{
        total: number;
        breakdown: {
            priority: string;
            count: number;
            percentage: number;
        }[];
    }>;
}
