import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';

interface QueryFilter {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  module?: string;
  projectId?: number;
  search?: string;
}

@Injectable()
export class TestCasesService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── Helper: auto-generate testId per project ──────────────────────
  async generateTestId(projectId?: number, module?: string): Promise<string> {
    const db = this.databaseService.db;
    let result;
    if (projectId) {
      result = await db.query(
        'SELECT "testId" FROM test_cases WHERE "projectId" = $1',
        [projectId]
      );
    } else if (module) {
      result = await db.query(
        'SELECT "testId" FROM test_cases WHERE LOWER(TRIM(module)) = LOWER(TRIM($1))',
        [module]
      );
    } else {
      result = await db.query('SELECT "testId" FROM test_cases');
    }

    let maxNum = 0;
    for (const r of result.rows) {
      const match = (r.testId || '').match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    return `TC-${String(maxNum + 1).padStart(4, '0')}`;
  }

  async getNextTestId(projectId?: number, module?: string): Promise<{ nextId: string }> {
    const nextId = await this.generateTestId(projectId, module);
    return { nextId };
  }

  // ── POST /api/test-cases ─────────────────────────────────────────
  async create(dto: CreateTestCaseDto) {
    const db = this.databaseService.db;
    const targetProjectId = dto.projectId || null;
    const testId = dto.testId || await this.generateTestId(targetProjectId || undefined, dto.module);

    // Check uniqueness within the project
    let existingResult;
    if (targetProjectId) {
      existingResult = await db.query(
        'SELECT id FROM test_cases WHERE "testId" = $1 AND "projectId" = $2',
        [testId, targetProjectId]
      );
    } else if (dto.module) {
      existingResult = await db.query(
        'SELECT id FROM test_cases WHERE "testId" = $1 AND LOWER(TRIM(module)) = LOWER(TRIM($2))',
        [testId, dto.module]
      );
    } else {
      existingResult = await db.query(
        'SELECT id FROM test_cases WHERE "testId" = $1 AND "projectId" IS NULL',
        [testId]
      );
    }

    if (existingResult.rows.length > 0) {
      throw new ConflictException(`حالة الاختبار برقم "${testId}" موجودة مسبقاً في هذا المشروع`);
    }

    const stepsStr = JSON.stringify(dto.steps || []);
    const executedAt = dto.executedAt || (dto.status === 'passed' || dto.status === 'failed' ? new Date().toISOString() : null);
    const targetTesterId = dto.testerId ?? dto.userId ?? null;

    const stmt = `
      INSERT INTO test_cases (
        "testId", module, "pageName", scenario, "preConditions", steps,
        "expectedResult", "actualResult", priority, status, notes,
        "executedAt", "testerId", "projectId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const result = await db.query(stmt, [
      testId,
      dto.module,
      dto.pageName || null,
      dto.scenario,
      dto.preConditions || null,
      stepsStr,
      dto.expectedResult,
      dto.actualResult || null,
      dto.priority || 'medium',
      dto.status || 'pending',
      dto.notes || null,
      executedAt,
      targetTesterId,
      dto.projectId || null,
    ]);

    const newId = result.rows[0].id;
    return this.findOne(newId);
  }

  // ── GET /api/test-cases ──────────────────────────────────────────
  async findAll(query: QueryFilter, currentUser?: any) {
    const db = this.databaseService.db;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    // Role-based filtering:
    // If user is a tester (not admin), only show test cases from their assigned projects or assigned to them
    if (currentUser && currentUser.role !== 'admin') {
      const currentUserId = Number(currentUser.id || currentUser.userId || currentUser.sub);
      conditions.push(`(
        (tc."projectId" IS NOT NULL AND tc."projectId" IN (SELECT pa."projectId" FROM project_assignments pa WHERE pa."userId" = ?))
        OR (tc."projectId" IS NULL AND tc.module IS NOT NULL AND tc.module IN (SELECT p.name FROM projects p INNER JOIN project_assignments pa ON p.id = pa."projectId" WHERE pa."userId" = ?))
        OR tc."testerId" = ?
      )`);
      params.push(currentUserId, currentUserId, currentUserId);
    }

    if (query.status) {
      conditions.push('tc.status = ?');
      params.push(query.status);
    }
    if (query.priority) {
      conditions.push('tc.priority = ?');
      params.push(query.priority);
    }
    if (query.module) {
      conditions.push('tc.module LIKE ?');
      params.push(`%${query.module}%`);
    }
    if (query.projectId) {
      conditions.push('tc."projectId" = ?');
      params.push(Number(query.projectId));
    }
    if (query.search) {
      conditions.push('(tc."testId" LIKE ? OR tc.module LIKE ? OR tc.scenario LIKE ?)');
      const s = `%${query.search}%`;
      params.push(s, s, s);
    }

    let pidx = 1;
    const numberedConditions = conditions.map(c => c.replace(/\?/g, () => `$${pidx++}`));
    const whereClause = numberedConditions.length > 0 ? `WHERE ${numberedConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM test_cases tc ${whereClause}`;
    const totalResult = await db.query(countSql, params);
    const total = Number(totalResult.rows[0].total);

    const limitOffsetParams = [...params, limit, offset];
    const dataSql = `
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name, u.email as tester_email,
        p.id as project_id, p.name as project_name
      FROM test_cases tc
      LEFT JOIN users u ON tc."testerId" = u.id
      LEFT JOIN projects p ON tc."projectId" = p.id
      ${whereClause}
      ORDER BY tc."testId" ASC, tc.id ASC
      LIMIT $${pidx++} OFFSET $${pidx++}
    `;

    const rowsResult = await db.query(dataSql, limitOffsetParams);
    const rows = rowsResult.rows;

    const formattedData = rows.map((r) => {
      const {
        tester_id, tester_name, tester_email,
        project_id, project_name,
        ...base
      } = r;

      let steps = [];
      try {
        steps = JSON.parse(base.steps || '[]');
      } catch {
        steps = [];
      }

      return {
        ...base,
        steps,
        testerId: tester_id || null,
        userId: tester_id || null,
        tester: tester_id ? { id: tester_id, userId: tester_id, name: tester_name, email: tester_email } : null,
        project: project_id ? { id: project_id, name: project_name } : null,
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ── GET /api/test-cases/:id ──────────────────────────────────────
  async findOne(id: number) {
    const db = this.databaseService.db;
    const sql = `
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name, u.email as tester_email,
        p.id as project_id, p.name as project_name
      FROM test_cases tc
      LEFT JOIN users u ON tc."testerId" = u.id
      LEFT JOIN projects p ON tc."projectId" = p.id
      WHERE tc.id = $1
    `;

    const result = await db.query(sql, [id]);
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException(`Test case #${id} not found`);
    }

    const {
      tester_id, tester_name, tester_email,
      project_id, project_name,
      ...base
    } = row;

    let steps = [];
    try {
      steps = JSON.parse(base.steps || '[]');
    } catch {
      steps = [];
    }

    return {
      ...base,
      steps,
      testerId: tester_id || null,
      userId: tester_id || null,
      tester: tester_id ? { id: tester_id, userId: tester_id, name: tester_name, email: tester_email } : null,
      project: project_id ? { id: project_id, name: project_name } : null,
    };
  }

  // ── PATCH /api/test-cases/:id ────────────────────────────────────
  async update(id: number, dto: UpdateTestCaseDto) {
    const db = this.databaseService.db;
    await this.findOne(id); // Throws if not found

    let pidx = 1;
    const fields: string[] = [];
    const values: any[] = [];

    const effectiveTesterId = dto.testerId ?? dto.userId;
    if (effectiveTesterId !== undefined) {
      fields.push(`"testerId" = $${pidx++}`);
      values.push(effectiveTesterId);
    }

    const allowed = [
      'module', 'pageName', 'scenario', 'preConditions',
      'expectedResult', 'actualResult', 'priority', 'status',
      'notes', 'executedAt', 'projectId'
    ];

    for (const key of allowed) {
      if ((dto as any)[key] !== undefined) {
        fields.push(`"${key}" = $${pidx++}`);
        values.push((dto as any)[key]);
      }
    }

    if (dto.steps !== undefined) {
      fields.push(`steps = $${pidx++}`);
      values.push(JSON.stringify(dto.steps));
    }

    if (fields.length > 0) {
      fields.push(`"updatedAt" = NOW()`);
      values.push(id);
      const sql = `UPDATE test_cases SET ${fields.join(', ')} WHERE id = $${pidx}`;
      await db.query(sql, values);
    }

    return this.findOne(id);
  }

  // ── DELETE /api/test-cases/:id ───────────────────────────────────
  async remove(id: number) {
    const db = this.databaseService.db;
    await this.findOne(id);
    await db.query('DELETE FROM test_cases WHERE id = $1', [id]);
    return { message: `Test case #${id} deleted successfully` };
  }
}
