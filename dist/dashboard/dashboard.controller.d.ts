import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(req: any, queryUserId?: number, queryRole?: string, projectId?: number): Promise<{
        total: number;
        passed: number;
        failed: number;
        pending: number;
        passRate: number;
        totalProjects: number;
    }>;
    getChartData(req: any, days?: number, queryUserId?: number, queryRole?: string, projectId?: number): Promise<{
        date: string;
        passed: number;
        failed: number;
        pending: number;
    }[]>;
    getSeverityBreakdown(req: any, queryUserId?: number, queryRole?: string, projectId?: number): Promise<{
        total: number;
        breakdown: {
            priority: string;
            count: number;
            percentage: number;
        }[];
    }>;
}
