"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getStats() {
        return this.dashboardService.getStats();
    }
    getChartData(days) {
        return this.dashboardService.getChartData(days ? Number(days) : 14);
    }
    getSeverityBreakdown() {
        return this.dashboardService.getSeverityBreakdown();
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overall KPI statistics for the dashboard' }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('chart'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily test execution chart data for the last N days' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, type: Number, example: 14, description: 'Number of past days to include (default 14)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of daily { date, passed, failed, pending } counts',
        schema: {
            example: [
                { date: '2025-10-11', passed: 60, failed: 10, pending: 6 },
                { date: '2025-10-12', passed: 67, failed: 10, pending: 6 },
            ],
        },
    }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getChartData", null);
__decorate([
    (0, common_1.Get)('severity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get defect severity breakdown by priority' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Severity distribution of failed/open test cases',
        schema: {
            example: {
                total: 145,
                breakdown: [
                    { priority: 'critical', count: 12, percentage: 8.2 },
                    { priority: 'high', count: 24, percentage: 16.5 },
                    { priority: 'medium', count: 48, percentage: 33.1 },
                    { priority: 'low', count: 61, percentage: 42.2 },
                ],
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getSeverityBreakdown", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map