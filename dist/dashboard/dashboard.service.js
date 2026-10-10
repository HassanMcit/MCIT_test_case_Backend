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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let DashboardService = class DashboardService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async getStats(currentUser) {
        const db = this.databaseService.db;
        const userId = currentUser?.id || currentUser?.userId || currentUser?.sub;
        const isAdmin = currentUser?.role === 'admin';
        if (isAdmin || !userId) {
            const row = await db.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END), 0) as passed,
          COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
          COALESCE(SUM(CASE WHEN status != 'passed' AND status != 'failed' THEN 1 ELSE 0 END), 0) as pending
        FROM test_cases
      `);
            const projectRow = await db.query('SELECT COUNT(*) as count FROM projects');
            const total = Number(row.rows[0]?.total || 0);
            const passed = Number(row.rows[0]?.passed || 0);
            const failed = Number(row.rows[0]?.failed || 0);
            const pending = Number(row.rows[0]?.pending || 0);
            const totalProjects = Number(projectRow.rows[0]?.count || 0);
            const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
            return {
                total,
                passed,
                failed,
                pending,
                passRate,
                totalProjects,
            };
        }
        else {
            const row = await db.query(`
        SELECT
          COUNT(DISTINCT tc.id) as total,
          COUNT(DISTINCT CASE WHEN tc.status = 'passed' THEN tc.id END) as passed,
          COUNT(DISTINCT CASE WHEN tc.status = 'failed' THEN tc.id END) as failed,
          COUNT(DISTINCT CASE WHEN tc.status != 'passed' AND tc.status != 'failed' THEN tc.id END) as pending
        FROM test_cases tc
        INNER JOIN project_assignments pa ON (
          (tc."projectId" IS NOT NULL AND tc."projectId" = pa."projectId")
          OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = pa."projectId"))
        )
        WHERE pa."userId" = $1
      `, [Number(userId)]);
            const projectRow = await db.query('SELECT COUNT(*) as count FROM project_assignments WHERE "userId" = $1', [Number(userId)]);
            const total = Number(row.rows[0]?.total || 0);
            const passed = Number(row.rows[0]?.passed || 0);
            const failed = Number(row.rows[0]?.failed || 0);
            const pending = Number(row.rows[0]?.pending || 0);
            const totalProjects = Number(projectRow.rows[0]?.count || 0);
            const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
            return {
                total,
                passed,
                failed,
                pending,
                passRate,
                totalProjects,
            };
        }
    }
    async getChartData(days = 14) {
        const db = this.databaseService.db;
        const results = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const isoStart = date.toISOString();
            const isoEnd = nextDate.toISOString();
            const passedRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'passed' AND \"executedAt\" >= $1 AND \"executedAt\" < $2", [isoStart, isoEnd]);
            const failedRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'failed' AND \"executedAt\" >= $1 AND \"executedAt\" < $2", [isoStart, isoEnd]);
            const pendingRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'pending' AND \"executedAt\" >= $1 AND \"executedAt\" < $2", [isoStart, isoEnd]);
            const passed = Number(passedRow.rows[0].count);
            const failed = Number(failedRow.rows[0].count);
            const pending = Number(pendingRow.rows[0].count);
            results.push({
                date: date.toISOString().split('T')[0],
                passed,
                failed,
                pending,
            });
        }
        return results;
    }
    async getSeverityBreakdown() {
        const db = this.databaseService.db;
        const priorities = ['critical', 'high', 'medium', 'low'];
        const totalRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'failed'");
        const total = Number(totalRow.rows[0].count);
        const breakdown = await Promise.all(priorities.map(async (priority) => {
            const row = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE priority = $1 AND status = 'failed'", [priority]);
            const count = Number(row.rows[0].count);
            const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
            return {
                priority,
                count,
                percentage,
            };
        }));
        return { total, breakdown };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map