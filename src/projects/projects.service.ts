import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── POST /api/projects ───────────────────────────────────────────
  async create(dto: CreateProjectDto) {
    const db = this.databaseService.db;
    const result = await db.query(`
      INSERT INTO projects (name, description, environment, status)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [
      dto.name,
      dto.description || null,
      dto.environment || 'staging',
      dto.status || 'active',
    ]);

    const newId = result.rows[0].id;
    return this.findOne(newId);
  }

  // ── GET /api/projects ────────────────────────────────────────────
  async findAll(query: { environment?: string; status?: string; search?: string }, currentUser?: any) {
    const db = this.databaseService.db;
    const conditions: string[] = [];
    const params: any[] = [];

    // Role-based filtering:
    // If user is NOT admin (e.g. tester), only return projects assigned to this user
    let joinClause = '';
    if (currentUser && currentUser.role !== 'admin') {
      joinClause = 'INNER JOIN project_assignments pa ON p.id = pa."projectId"';
      conditions.push('pa."userId" = ?');
      params.push(currentUser.id || currentUser.userId || currentUser.sub);
    }

    if (query.environment) {
      conditions.push('p.environment = ?');
      params.push(query.environment);
    }
    if (query.status) {
      conditions.push('p.status = ?');
      params.push(query.status);
    }
    if (query.search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      const s = `%${query.search}%`;
      params.push(s, s);
    }

    let pidx = 1;
    const numberedConditions = conditions.map(c => c.replace(/\?/g, () => `$${pidx++}`));
    const whereClause = numberedConditions.length > 0 ? `WHERE ${numberedConditions.join(' AND ')}` : '';
    const sql = `SELECT DISTINCT p.* FROM projects p ${joinClause} ${whereClause} ORDER BY p.id ASC`;
    const projectsResult = await db.query(sql, params);
    const projects = projectsResult.rows;

    const statsSql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_cases
      WHERE "projectId" = $1
    `;

    const assignedUsersSql = `
      SELECT u.id, u.id as "userId", u.name, u.email, u.role, u.photo, u."profileImage", pa."assignedAt"
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa."userId"
      WHERE pa."projectId" = $1
      ORDER BY pa."assignedAt" DESC
    `;

    return Promise.all(projects.map(async (p) => {
      const statsResult = await db.query(statsSql, [p.id]);
      const statsRow = statsResult.rows[0] as {
        total: string;
        passed: string | null;
        failed: string | null;
        pending: string | null;
      };

      const total = Number(statsRow.total) || 0;
      const passed = Number(statsRow.passed) || 0;
      const failed = Number(statsRow.failed) || 0;
      const pending = Number(statsRow.pending) || 0;
      const successRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
      
      const assignedUsersResult = await db.query(assignedUsersSql, [p.id]);
      const assignedUsers = assignedUsersResult.rows.map((u: any) => ({
        ...u,
        photo: this.databaseService.resolvePhotoUrl(u),
        profileImage: this.databaseService.resolvePhotoUrl(u),
      }));

      return {
        ...p,
        stats: { total, passed, failed, pending, successRate },
        assignedUsers,
      };
    }));
  }

  // ── GET /api/projects/:id ────────────────────────────────────────
  async findOne(id: number, currentUser?: any) {
    const db = this.databaseService.db;
    const projectResult = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    const project = projectResult.rows[0] as any;

    if (!project) {
      throw new NotFoundException(`Project #${id} not found`);
    }

    if (currentUser && currentUser.role !== 'admin') {
      const checkResult = await db.query(
        'SELECT 1 FROM project_assignments WHERE "projectId" = $1 AND "userId" = $2',
        [id, currentUser.id || currentUser.userId || currentUser.sub]
      );
      if (checkResult.rows.length === 0) {
        throw new ForbiddenException('غير مصرح لك بالوصول لهذا المشروع');
      }
    }

    const assignedUsersResult = await db.query(`
      SELECT u.id, u.id as "userId", u.name, u.email, u.role, u.photo, u."profileImage", pa."assignedAt"
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa."userId"
      WHERE pa."projectId" = $1
      ORDER BY pa."assignedAt" DESC
    `, [id]);
    const assignedUsers = assignedUsersResult.rows.map((u: any) => ({
      ...u,
      photo: this.databaseService.resolvePhotoUrl(u),
      profileImage: this.databaseService.resolvePhotoUrl(u),
    }));

    const recentTestCasesResult = await db.query(`
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name
      FROM test_cases tc
      LEFT JOIN users u ON tc."testerId" = u.id
      WHERE tc."projectId" = $1
      ORDER BY tc.id DESC
      LIMIT 5
    `, [id]);
    const recentTestCases = recentTestCasesResult.rows;

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

    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_cases
      WHERE "projectId" = $1
    `, [id]);
    const statsRow = statsResult.rows[0] as any;

    const total = Number(statsRow.total) || 0;
    const passed = Number(statsRow.passed) || 0;
    const failed = Number(statsRow.failed) || 0;
    const pending = Number(statsRow.pending) || 0;
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

    let pidx = 1;
    const allowed = ['name', 'description', 'environment', 'status'];
    for (const key of allowed) {
      if ((dto as any)[key] !== undefined) {
        fields.push(`"${key}" = $${pidx++}`);
        values.push((dto as any)[key]);
      }
    }

    if (fields.length > 0) {
      fields.push(`"updatedAt" = NOW()`);
      values.push(id);
      await db.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = $${pidx}`, values);
    }

    return this.findOne(id);
  }

  // ── DELETE /api/projects/:id ─────────────────────────────────────
  async remove(id: number) {
    const db = this.databaseService.db;
    await this.findOne(id);
    await db.query('DELETE FROM projects WHERE id = $1', [id]);
    return { message: `Project #${id} deleted successfully` };
  }
}
