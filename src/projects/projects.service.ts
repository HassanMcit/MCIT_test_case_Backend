import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── POST /api/projects ───────────────────────────────────────────
  async create(dto: CreateProjectDto) {
    const db = this.databaseService.db;
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, environment, status)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      dto.name,
      dto.description || null,
      dto.environment || 'staging',
      dto.status || 'active',
    );

    const newId = Number(result.lastInsertRowid);
    return this.findOne(newId);
  }

  // ── GET /api/projects ────────────────────────────────────────────
  async findAll(query: { environment?: string; status?: string; search?: string }) {
    const db = this.databaseService.db;
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.environment) {
      conditions.push('environment = ?');
      params.push(query.environment);
    }
    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }
    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const s = `%${query.search}%`;
      params.push(s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM projects ${whereClause} ORDER BY id ASC`;
    const projects = db.prepare(sql).all(...params) as any[];

    const stmtStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_cases
      WHERE projectId = ?
    `);

    const stmtAssignedUsers = db.prepare(`
      SELECT u.id, u.id as userId, u.name, u.email, u.role, u.photo, u.profileImage, pa.assignedAt
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa.userId
      WHERE pa.projectId = ?
      ORDER BY pa.assignedAt DESC
    `);

    return projects.map((p) => {
      const statsRow = stmtStats.get(p.id) as {
        total: number;
        passed: number | null;
        failed: number | null;
        pending: number | null;
      };

      const total = statsRow.total || 0;
      const passed = statsRow.passed || 0;
      const failed = statsRow.failed || 0;
      const pending = statsRow.pending || 0;
      const successRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
      const assignedUsers = stmtAssignedUsers.all(p.id) as any[];

      return {
        ...p,
        stats: { total, passed, failed, pending, successRate },
        assignedUsers,
      };
    });
  }

  // ── GET /api/projects/:id ────────────────────────────────────────
  async findOne(id: number) {
    const db = this.databaseService.db;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;

    if (!project) {
      throw new NotFoundException(`Project #${id} not found`);
    }

    const assignedUsers = db.prepare(`
      SELECT u.id, u.id as userId, u.name, u.email, u.role, u.photo, u.profileImage, pa.assignedAt
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa.userId
      WHERE pa.projectId = ?
      ORDER BY pa.assignedAt DESC
    `).all(id) as any[];

    const recentTestCases = db.prepare(`
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name
      FROM test_cases tc
      LEFT JOIN users u ON tc.testerId = u.id
      WHERE tc.projectId = ?
      ORDER BY tc.id DESC
      LIMIT 5
    `).all(id) as any[];

    const formattedTCs = recentTestCases.map((tc) => {
      const { tester_id, tester_name, ...base } = tc;
      let steps = [];
      try { steps = JSON.parse(base.steps || '[]'); } catch { steps = []; }
      return {
        ...base,
        steps,
        testerId: tester_id || null,
        userId: tester_id || null,
        tester: tester_id ? { id: tester_id, userId: tester_id, name: tester_name } : null,
      };
    });

    const statsRow = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_cases
      WHERE projectId = ?
    `).get(id) as any;

    const total = statsRow.total || 0;
    const passed = statsRow.passed || 0;
    const failed = statsRow.failed || 0;
    const pending = statsRow.pending || 0;
    const successRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;

    return {
      ...project,
      stats: { total, passed, failed, pending, successRate },
      assignedUsers,
      recentTestCases: formattedTCs,
    };
  }

  // ── PATCH /api/projects/:id ──────────────────────────────────────
  async update(id: number, dto: UpdateProjectDto) {
    const db = this.databaseService.db;
    await this.findOne(id);

    const fields: string[] = [];
    const values: any[] = [];

    const allowed = ['name', 'description', 'environment', 'status'];
    for (const key of allowed) {
      if ((dto as any)[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push((dto as any)[key]);
      }
    }

    if (fields.length > 0) {
      fields.push("updatedAt = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.findOne(id);
  }

  // ── DELETE /api/projects/:id ─────────────────────────────────────
  async remove(id: number) {
    const db = this.databaseService.db;
    await this.findOne(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return { message: `Project #${id} deleted successfully` };
  }
}
