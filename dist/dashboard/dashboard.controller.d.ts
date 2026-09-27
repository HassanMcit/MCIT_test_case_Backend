import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
