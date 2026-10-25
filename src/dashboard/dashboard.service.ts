import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── GET /api/dashboard/stats ─────────────────────────────────────
  async getStats(currentUser?: any, projectId?: number) {
    const db = this.databaseService.db;
    const userId = currentUser?.id || currentUser?.userId || currentUser?.sub;
    const isAdmin = currentUser?.role === 'admin';

    if (isAdmin || !userId) {
      let row;
      if (projectId && projectId > 0) {
        row = await db.query(
          `
          SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN tc.status = 'passed' THEN 1 ELSE 0 END), 0) as passed,
            COALESCE(SUM(CASE WHEN tc.status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
            COALESCE(SUM(CASE WHEN tc.status != 'passed' AND tc.status != 'failed' THEN 1 ELSE 0 END), 0) as pending
          FROM test_cases_current tc
          WHERE tc."projectId" = $1
            OR (tc."projectId" IS NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = $1))
          `,
          [projectId],
        );
      } else {
        row = await db.query(`
          SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END), 0) as passed,
            COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
            COALESCE(SUM(CASE WHEN status != 'passed' AND status != 'failed' THEN 1 ELSE 0 END), 0) as pending
          FROM test_cases_current
        `);
      }
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
    } else {
      // Tester sees stats ONLY for assigned projects
      const params: any[] = [Number(userId)];
      let projectFilterSql = '';
      if (projectId && projectId > 0) {
        params.push(projectId);
        projectFilterSql = ' AND pa."projectId" = $2';
      }

      const row = await db.query(
        `
        SELECT
          COUNT(DISTINCT tc.id) as total,
          COUNT(DISTINCT CASE WHEN tc.status = 'passed' THEN tc.id END) as passed,
          COUNT(DISTINCT CASE WHEN tc.status = 'failed' THEN tc.id END) as failed,
          COUNT(DISTINCT CASE WHEN tc.status != 'passed' AND tc.status != 'failed' THEN tc.id END) as pending
        FROM test_cases_current tc
        INNER JOIN project_assignments pa ON (
          (tc."projectId" IS NOT NULL AND tc."projectId" = pa."projectId")
          OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = pa."projectId"))
        )
        WHERE pa."userId" = $1${projectFilterSql}
        `,
        params,
      );

      const projectRow = await db.query(
        'SELECT COUNT(*) as count FROM project_assignments WHERE "userId" = $1',
        [Number(userId)],
      );

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

  // ── GET /api/dashboard/chart ─────────────────────────────────────
  async getChartData(days = 14, currentUser?: any, projectId?: number) {
    const db = this.databaseService.db;
    const userId = currentUser?.id || currentUser?.userId || currentUser?.sub;
    const isAdmin = currentUser?.role === 'admin';

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

      let row;
      if (isAdmin || !userId) {
        if (projectId && projectId > 0) {
          row = await db.query(
            `
            SELECT
              COALESCE(SUM(CASE WHEN tc.status = 'passed' THEN 1 ELSE 0 END), 0) as passed,
              COALESCE(SUM(CASE WHEN tc.status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
              COALESCE(SUM(CASE WHEN tc.status != 'passed' AND tc.status != 'failed' THEN 1 ELSE 0 END), 0) as pending
            FROM test_cases_current tc
            WHERE COALESCE(tc."executedAt", tc."createdAt") >= $1
              AND COALESCE(tc."executedAt", tc."createdAt") < $2
              AND (tc."projectId" = $3 OR (tc."projectId" IS NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = $3)))
            `,
            [isoStart, isoEnd, projectId],
          );
        } else {
          row = await db.query(
            `
            SELECT
              COALESCE(SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END), 0) as passed,
              COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
              COALESCE(SUM(CASE WHEN status != 'passed' AND status != 'failed' THEN 1 ELSE 0 END), 0) as pending
            FROM test_cases_current
            WHERE COALESCE("executedAt", "createdAt") >= $1
              AND COALESCE("executedAt", "createdAt") < $2
            `,
            [isoStart, isoEnd],
          );
        }
      } else {
        const params: any[] = [isoStart, isoEnd, Number(userId)];
        let projectFilterSql = '';
        if (projectId && projectId > 0) {
          params.push(projectId);
          projectFilterSql = ' AND pa."projectId" = $4';
        }
        row = await db.query(
          `
          SELECT
            COUNT(DISTINCT CASE WHEN tc.status = 'passed' THEN tc.id END) as passed,
            COUNT(DISTINCT CASE WHEN tc.status = 'failed' THEN tc.id END) as failed,
            COUNT(DISTINCT CASE WHEN tc.status != 'passed' AND tc.status != 'failed' THEN tc.id END) as pending
          FROM test_cases_current tc
          INNER JOIN project_assignments pa ON (
            (tc."projectId" IS NOT NULL AND tc."projectId" = pa."projectId")
            OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = pa."projectId"))
          )
          WHERE COALESCE(tc."executedAt", tc."createdAt") >= $1
            AND COALESCE(tc."executedAt", tc."createdAt") < $2
            AND pa."userId" = $3${projectFilterSql}
          `,
          params,
        );
      }

      results.push({
        date: date.toISOString().split('T')[0],
        passed: Number(row.rows[0]?.passed || 0),
        failed: Number(row.rows[0]?.failed || 0),
        pending: Number(row.rows[0]?.pending || 0),
      });
    }

    return results;
  }

  // ── GET /api/dashboard/severity ──────────────────────────────────
  async getSeverityBreakdown(currentUser?: any, projectId?: number) {
    const db = this.databaseService.db;
    const userId = currentUser?.id || currentUser?.userId || currentUser?.sub;
    const isAdmin = currentUser?.role === 'admin';
    const priorities = ['critical', 'high', 'medium', 'low'];

    let rowsResult;
    if (isAdmin || !userId) {
      if (projectId && projectId > 0) {
        rowsResult = await db.query(
          `
          SELECT COALESCE(tc.severity, tc.priority, 'medium') as level, COUNT(*) as count
          FROM test_cases_current tc
          WHERE tc.status = 'failed'
            AND (tc."projectId" = $1 OR (tc."projectId" IS NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = $1)))
          GROUP BY COALESCE(tc.severity, tc.priority, 'medium')
          `,
          [projectId],
        );
      } else {
        rowsResult = await db.query(`
          SELECT COALESCE(severity, priority, 'medium') as level, COUNT(*) as count
          FROM test_cases_current
          WHERE status = 'failed'
          GROUP BY COALESCE(severity, priority, 'medium')
        `);
      }
    } else {
      const params: any[] = [Number(userId)];
      let projectFilterSql = '';
      if (projectId && projectId > 0) {
        params.push(projectId);
        projectFilterSql = ' AND pa."projectId" = $2';
      }
      rowsResult = await db.query(
        `
        SELECT COALESCE(tc.severity, tc.priority, 'medium') as level, COUNT(DISTINCT tc.id) as count
        FROM test_cases_current tc
        INNER JOIN project_assignments pa ON (
          (tc."projectId" IS NOT NULL AND tc."projectId" = pa."projectId")
          OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p WHERE p.id = pa."projectId"))
        )
        WHERE tc.status = 'failed' AND pa."userId" = $1${projectFilterSql}
        GROUP BY COALESCE(tc.severity, tc.priority, 'medium')
        `,
        params,
      );
    }

    const countsMap: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let total = 0;
    for (const r of rowsResult.rows) {
      const lvl = String(r.level || 'medium').toLowerCase();
      const cnt = Number(r.count || 0);
      if (countsMap[lvl] !== undefined) {
        countsMap[lvl] += cnt;
      } else {
        countsMap.medium += cnt;
      }
      total += cnt;
    }

    const breakdown = priorities.map((priority) => {
      const count = countsMap[priority] || 0;
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
