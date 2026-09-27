import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── GET /api/dashboard/stats ─────────────────────────────────────
  async getStats() {
    const db = this.databaseService.db;

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM test_cases').get() as { count: number };
    const passedRow = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'passed'").get() as { count: number };
    const failedRow = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'failed'").get() as { count: number };
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'pending'").get() as { count: number };
    const projectRow = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

    const total = totalRow.count;
    const passed = passedRow.count;
    const failed = failedRow.count;
    const pending = pendingRow.count;
    const totalProjects = projectRow.count;

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

  // ── GET /api/dashboard/chart ─────────────────────────────────────
  async getChartData(days = 14) {
    const db = this.databaseService.db;
    const results: {
      date: string;
      passed: number;
      failed: number;
      pending: number;
    }[] = [];

    const stmtPassed = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'passed' AND executedAt >= ? AND executedAt < ?");
    const stmtFailed = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'failed' AND executedAt >= ? AND executedAt < ?");
    const stmtPending = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'pending' AND executedAt >= ? AND executedAt < ?");

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const isoStart = date.toISOString();
      const isoEnd = nextDate.toISOString();

      const passed = (stmtPassed.get(isoStart, isoEnd) as { count: number }).count;
      const failed = (stmtFailed.get(isoStart, isoEnd) as { count: number }).count;
      const pending = (stmtPending.get(isoStart, isoEnd) as { count: number }).count;

      results.push({
        date: date.toISOString().split('T')[0],
        passed,
        failed,
        pending,
      });
    }

    return results;
  }

  // ── GET /api/dashboard/severity ──────────────────────────────────
  async getSeverityBreakdown() {
    const db = this.databaseService.db;
    const priorities = ['critical', 'high', 'medium', 'low'];

    const totalRow = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE status = 'failed'").get() as { count: number };
    const total = totalRow.count;

    const stmt = db.prepare("SELECT COUNT(*) as count FROM test_cases WHERE priority = ? AND status = 'failed'");

    const breakdown = priorities.map((priority) => {
      const count = (stmt.get(priority) as { count: number }).count;
      const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return {
        priority,
        count,
        percentage,
      };
    });

    return { total, breakdown };
  }
}
