import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/stats
   * Overall KPI cards: total, passed, failed, pending, pass rate, total projects
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get overall KPI statistics for the dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Returns test case counts and pass rate',
    schema: {
      example: {
        total: 1420,
        passed: 1180,
        failed: 145,
        pending: 95,
        passRate: 83.1,
        totalProjects: 6,
      },
    },
  })
  getStats(
    @Request() req: any,
    @Query('userId') queryUserId?: number,
    @Query('role') queryRole?: string,
  ) {
    const user = req.user || (queryUserId ? { id: Number(queryUserId), role: queryRole } : undefined);
    return this.dashboardService.getStats(user);
  }

  /**
   * GET /api/dashboard/chart?days=14
   * Daily execution chart data for last N days (default 14)
   */
  @Get('chart')
  @ApiOperation({ summary: 'Get daily test execution chart data for the last N days' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 14, description: 'Number of past days to include (default 14)' })
  @ApiResponse({
    status: 200,
    description: 'Array of daily { date, passed, failed, pending } counts',
    schema: {
      example: [
        { date: '2025-10-11', passed: 60, failed: 10, pending: 6 },
        { date: '2025-10-12', passed: 67, failed: 10, pending: 6 },
      ],
    },
  })
  getChartData(@Query('days') days?: number) {
    return this.dashboardService.getChartData(days ? Number(days) : 14);
  }

  /**
   * GET /api/dashboard/severity
   * Failed test cases breakdown by priority level
   */
  @Get('severity')
  @ApiOperation({ summary: 'Get defect severity breakdown by priority' })
  @ApiResponse({
    status: 200,
    description: 'Severity distribution of failed/open test cases',
    schema: {
      example: {
        total: 145,
        breakdown: [
          { priority: 'critical', count: 12, percentage: 8.2 },
          { priority: 'high',     count: 24, percentage: 16.5 },
          { priority: 'medium',   count: 48, percentage: 33.1 },
          { priority: 'low',      count: 61, percentage: 42.2 },
        ],
      },
    },
  })
  getSeverityBreakdown() {
    return this.dashboardService.getSeverityBreakdown();
  }
}
