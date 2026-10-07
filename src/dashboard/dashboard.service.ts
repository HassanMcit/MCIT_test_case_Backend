import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── GET /api/dashboard/stats ─────────────────────────────────────
  async getStats() {
    const db = this.databaseService.db;

    const totalRow = await db.query('SELECT COUNT(*) as count FROM test_cases');
    const passedRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'passed'");
    const failedRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'failed'");
    const pendingRow = await db.query("SELECT COUNT(*) as count FROM test_cases WHERE status = 'pending'");
    const projectRow = await db.query('SELECT COUNT(*) as count FROM projects');

    const total = Number(totalRow.rows[0].count);
    const passed = Number(passedRow.rows[0].count);
    const failed = Number(failedRow.rows[0].count);
    const pending = Number(pendingRow.rows[0].count);
    const totalProjects = Number(projectRow.rows[0].count);

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

  // ── GET /api/dashboard/severity ──────────────────────────────────
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
}
