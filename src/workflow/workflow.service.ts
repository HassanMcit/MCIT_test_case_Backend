import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import {
  AddCycleItemsDto,
  AssignCycleItemDto,
  CreateCycleDto,
  CreateExecutionDto,
  CreateReleaseDto,
  UpdateCycleDto,
  UpdateReleaseDto,
  WorkflowQueryDto,
} from './workflow.dto';

export interface WorkflowUser {
  id: number;
  role: string;
  name?: string;
}
type Queryable = Pick<PoolClient, 'query'>;
const latestItem = `LEFT JOIN LATERAL (SELECT * FROM test_executions WHERE "cycleItemId"=i.id ORDER BY id DESC LIMIT 1) e ON true`;
const cycleTotals = `SELECT COUNT(*)::int AS total,
 COUNT(*) FILTER(WHERE e.status='passed')::int AS passed,
 COUNT(*) FILTER(WHERE e.status='failed')::int AS failed,
 COUNT(*) FILTER(WHERE e.status='blocked')::int AS blocked,
 COUNT(*) FILTER(WHERE e.status='skipped')::int AS skipped,
 COUNT(*) FILTER(WHERE e.id IS NULL OR e.status='not_run')::int AS not_run
 FROM test_cycle_items i ${latestItem} WHERE i."cycleId"=c.id`;

export function validateDates(start?: string | null, end?: string | null) {
  for (const value of [start, end])
    if (
      value != null &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw new BadRequestException('Use a valid YYYY-MM-DD date');
  if (start && end && start > end)
    throw new BadRequestException('End date must be on or after start date');
}
export function summarize(row: any) {
  const total = Number(row.total || 0),
    passed = Number(row.passed || 0),
    failed = Number(row.failed || 0);
  const notRun = Number(row.not_run || 0);
  return {
    total,
    passed,
    failed,
    blocked: Number(row.blocked || 0),
    skipped: Number(row.skipped || 0),
    notRun,
    executed: total - notRun,
    progress: total ? Math.round(((total - notRun) * 1000) / total) / 10 : 0,
    passRate:
      passed + failed
        ? Math.round((passed * 1000) / (passed + failed)) / 10
        : 0,
  };
}

@Injectable()
export class WorkflowService {
  constructor(private readonly database: DatabaseService) {}
  admin(user: WorkflowUser) {
    if (user?.role !== 'admin')
      throw new ForbiddenException('Administrator access required');
  }
  async transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.database.db.connect();
    try {
      await db.query('BEGIN');
      const value = await fn(db);
      await db.query('COMMIT');
      return value;
    } catch (error: any) {
      await db.query('ROLLBACK');
      if (error?.code === '23505')
        throw new ConflictException(
          'This version or test case already exists in this context',
        );
      if (['23503', '23001'].includes(error?.code))
        throw new ConflictException('Related records prevent this change');
      if (['23502', '23514', '22007', '22008'].includes(error?.code))
        throw new BadRequestException('Invalid or missing workflow fields');
      throw error;
    } finally {
      db.release();
    }
  }
  async project(
    id: number,
    user: WorkflowUser,
    db: Queryable = this.database.db,
    lock = false,
  ) {
    const r = await db.query(
      `SELECT * FROM projects WHERE id=$1 ${lock ? 'FOR UPDATE' : ''}`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException('Project not found');
    if (user.role !== 'admin') {
      const membership = await db.query(
        'SELECT 1 FROM project_assignments WHERE "projectId"=$1 AND "userId"=$2',
        [id, user.id],
      );
      if (!membership.rowCount)
        throw new ForbiddenException('Project access denied');
    }
    return r.rows[0];
  }
  async caseAccess(
    id: number,
    user: WorkflowUser,
    db: Queryable = this.database.db,
  ) {
    const r = await db.query('SELECT * FROM test_cases WHERE id=$1', [id]);
    const tc = r.rows[0];
    if (!tc) throw new NotFoundException('Test case not found');
    if (tc.projectId) await this.project(tc.projectId, user, db);
    else if (user.role !== 'admin' && tc.testerId !== user.id)
      throw new ForbiddenException('Test case access denied');
    return tc;
  }
  private scope(q: WorkflowQueryDto, user: WorkflowUser, alias = 'c') {
    const values: any[] = [];
    const conditions: string[] = [];
    const add = (sql: string, v: any) => {
      values.push(v);
      conditions.push(sql.replace('?', `$${values.length}`));
    };
    if (user.role !== 'admin')
      add(
        `EXISTS(SELECT 1 FROM project_assignments pa WHERE pa."projectId"=${alias}."projectId" AND pa."userId"=?)`,
        user.id,
      );
    if (q.projectId) add(`${alias}."projectId"=?`, q.projectId);
    if (q.releaseId) add(`${alias}."releaseId"=?`, q.releaseId);
    if (q.cycleId) add(`${alias}.id=?`, q.cycleId);
    return {
      values,
      conditions,
      add,
      where: () =>
        conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    };
  }
  private page(q: WorkflowQueryDto) {
    return { limit: q.limit || 20, page: q.page || 1 };
  }
  private paginated(data: any[], total: number, q: WorkflowQueryDto) {
    const { page, limit } = this.page(q);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
  async releases(projectId: number, q: WorkflowQueryDto, user: WorkflowUser) {
    await this.project(projectId, user);
    const values: any[] = [projectId];
    const conditions = ['"projectId"=$1'];
    if (q.search) {
      values.push(`%${q.search.trim()}%`);
      conditions.push(
        `(name ILIKE $${values.length} OR version ILIKE $${values.length})`,
      );
    }
    if (q.status) {
      values.push(q.status);
      conditions.push(`status=$${values.length}`);
    }
    const where = conditions.join(' AND '),
      { limit, page } = this.page(q);
    const count = await this.database.db.query(
      `SELECT COUNT(*)::int AS total FROM releases WHERE ${where}`,
      values,
    );
    const data = await this.database.db.query(
      `SELECT * FROM releases WHERE ${where} ORDER BY id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit],
    );
    return this.paginated(data.rows, count.rows[0].total, q);
  }
  async release(projectId: number, id: number, user: WorkflowUser) {
    await this.project(projectId, user);
    const r = await this.database.db.query(
      'SELECT * FROM releases WHERE id=$1 AND "projectId"=$2',
      [id, projectId],
    );
    if (!r.rows[0]) throw new NotFoundException('Release not found');
    return r.rows[0];
  }
  async createRelease(
    projectId: number,
    dto: CreateReleaseDto,
    user: WorkflowUser,
  ) {
    this.admin(user);
    this.validateRelease(dto);
    validateDates(dto.startDate, dto.releaseDate);
    return this.transaction(async (db) => {
      const p = await this.project(projectId, user, db, true);
      if (p.status === 'archived')
        throw new ConflictException('Project is archived');
      const r = await db.query(
        `INSERT INTO releases("projectId",name,version,description,status,"startDate","releaseDate","createdById","updatedById") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
        [
          projectId,
          dto.name.trim(),
          dto.version.trim(),
          dto.description || null,
          dto.status || 'planning',
          dto.startDate || null,
          dto.releaseDate || null,
          user.id,
        ],
      );
      return r.rows[0];
    });
  }
  private validateRelease(dto: any) {
    if (
      (dto.name !== undefined &&
        (typeof dto.name !== 'string' || dto.name.trim().length < 2)) ||
      (dto.version !== undefined &&
        (typeof dto.version !== 'string' || !dto.version.trim())) ||
      dto.status === null
    )
      throw new BadRequestException('Name, version and status cannot be blank');
  }
  private async patch(
    db: Queryable,
    table: string,
    id: number,
    dto: any,
    allowed: string[],
    userId?: number,
  ) {
    const fields: string[] = [],
      values: any[] = [];
    for (const key of allowed)
      if (dto[key] !== undefined) {
        values.push(typeof dto[key] === 'string' ? dto[key].trim() : dto[key]);
        fields.push(`"${key}"=$${values.length}`);
      }
    if (userId) {
      values.push(userId);
      fields.push(`"updatedById"=$${values.length}`);
    }
    fields.push('"updatedAt"=NOW()');
    values.push(id);
    return (
      await db.query(
        `UPDATE ${table} SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`,
        values,
      )
    ).rows[0];
  }
  async updateRelease(
    projectId: number,
    id: number,
    dto: UpdateReleaseDto,
    user: WorkflowUser,
  ) {
    this.admin(user);
    this.validateRelease(dto);
    return this.transaction(async (db) => {
      const p = await this.project(projectId, user, db, true);
      if (p.status === 'archived')
        throw new ConflictException('Project is archived');
      const r = await db.query(
        'SELECT * FROM releases WHERE id=$1 AND "projectId"=$2 FOR UPDATE',
        [id, projectId],
      );
      const old = r.rows[0];
      if (!old) throw new NotFoundException('Release not found');
      if (
        old.status === 'archived' ||
        (old.status === 'released' && dto.status !== 'archived')
      )
        throw new ConflictException(
          'Release is read-only; archive it or create a new release',
        );
      validateDates(
        dto.startDate === undefined ? old.startDate : dto.startDate,
        dto.releaseDate === undefined ? old.releaseDate : dto.releaseDate,
      );
      return this.patch(
        db,
        'releases',
        id,
        dto,
        [
          'name',
          'version',
          'description',
          'status',
          'startDate',
          'releaseDate',
        ],
        user.id,
      );
    });
  }
  async cycles(q: WorkflowQueryDto, user: WorkflowUser) {
    const s = this.scope(q, user);
    if (q.search) s.add('c.name ILIKE ?', `%${q.search.trim()}%`);
    if (q.status) s.add('c.status=?', q.status);
    if (q.testerId)
      s.add(
        'EXISTS(SELECT 1 FROM test_cycle_items ti WHERE ti."cycleId"=c.id AND ti."testerId"=?)',
        q.testerId,
      );
    const count = await this.database.db.query(
        `SELECT COUNT(*)::int AS total FROM test_cycles c ${s.where()}`,
        s.values,
      ),
      { page, limit } = this.page(q);
    const r = await this.database.db.query(
      `SELECT c.*,r.name AS "releaseName",r.version,p.name AS "projectName",totals.* FROM test_cycles c JOIN releases r ON r.id=c."releaseId" JOIN projects p ON p.id=c."projectId" CROSS JOIN LATERAL (${cycleTotals}) totals ${s.where()} ORDER BY c.id DESC LIMIT $${s.values.length + 1} OFFSET $${s.values.length + 2}`,
      [...s.values, limit, (page - 1) * limit],
    );
    return this.paginated(
      r.rows.map((c) => ({ ...c, summary: summarize(c) })),
      count.rows[0].total,
      q,
    );
  }
  async createCycle(dto: CreateCycleDto, user: WorkflowUser) {
    this.admin(user);
    validateDates(dto.startDate, dto.endDate);
    if (dto.name.trim().length < 2)
      throw new BadRequestException('Cycle name is required');
    return this.transaction(async (db) => {
      const p = await this.project(dto.projectId, user, db, true);
      const r = await db.query(
        'SELECT * FROM releases WHERE id=$1 AND "projectId"=$2 FOR UPDATE',
        [dto.releaseId, dto.projectId],
      );
      if (!r.rows[0])
        throw new NotFoundException('Release does not belong to project');
      if (
        p.status === 'archived' ||
        ['released', 'archived'].includes(r.rows[0].status)
      )
        throw new ConflictException('Project or release is read-only');
      return (
        await db.query(
          `INSERT INTO test_cycles("projectId","releaseId",name,description,status,"startDate","endDate","createdById") VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            dto.projectId,
            dto.releaseId,
            dto.name.trim(),
            dto.description || null,
            dto.status || 'planning',
            dto.startDate || null,
            dto.endDate || null,
            user.id,
          ],
        )
      ).rows[0];
    });
  }
  async cycle(id: number, user: WorkflowUser) {
    const c = (
      await this.database.db.query(
        `SELECT c.*,r.name AS "releaseName",r.version,r.status AS "releaseStatus",p.name AS "projectName",p.environment FROM test_cycles c JOIN releases r ON r.id=c."releaseId" JOIN projects p ON p.id=c."projectId" WHERE c.id=$1`,
        [id],
      )
    ).rows[0];
    if (!c) throw new NotFoundException('Cycle not found');
    await this.project(c.projectId, user);
    const totals = await this.database.db.query(
      `SELECT totals.* FROM test_cycles c CROSS JOIN LATERAL (${cycleTotals}) totals WHERE c.id=$1`,
      [id],
    );
    const testers = await this.database.db.query(
      'SELECT u.id,u.name FROM users u JOIN project_assignments pa ON pa."userId"=u.id WHERE pa."projectId"=$1 ORDER BY u.name',
      [c.projectId],
    );
    return { ...c, summary: summarize(totals.rows[0]), testers: testers.rows };
  }
  private async lockedCycle(db: PoolClient, id: number, user: WorkflowUser) {
    // Lock project before release/cycle consistently with release management.
    const initial = (
      await db.query('SELECT "projectId" FROM test_cycles WHERE id=$1', [id])
    ).rows[0];
    if (!initial) throw new NotFoundException('Cycle not found');
    const p = await this.project(initial.projectId, user, db, true);
    const c = (
      await db.query(
        `SELECT c.*,r.status AS "releaseStatus" FROM test_cycles c JOIN releases r ON r.id=c."releaseId" WHERE c.id=$1 FOR UPDATE OF c,r`,
        [id],
      )
    ).rows[0];
    if (
      p.status === 'archived' ||
      ['released', 'archived'].includes(c.releaseStatus) ||
      ['completed', 'archived'].includes(c.status)
    )
      throw new ConflictException('Cycle, release or project is read-only');
    return c;
  }
  async updateCycle(id: number, dto: UpdateCycleDto, user: WorkflowUser) {
    this.admin(user);
    return this.transaction(async (db) => {
      const old = await this.lockedCycle(db, id, user);
      validateDates(
        dto.startDate === undefined ? old.startDate : dto.startDate,
        dto.endDate === undefined ? old.endDate : dto.endDate,
      );
      if (
        dto.name !== undefined &&
        (dto.name === null || dto.name.trim().length < 2)
      )
        throw new BadRequestException('Cycle name is required');
      return this.patch(db, 'test_cycles', id, dto, [
        'name',
        'description',
        'status',
        'startDate',
        'endDate',
      ]);
    });
  }
  async candidates(id: number, q: WorkflowQueryDto, user: WorkflowUser) {
    this.admin(user);
    const c = await this.cycle(id, user);
    const values: any[] = [c.projectId, id];
    let where =
      'tc."projectId"=$1 AND NOT EXISTS(SELECT 1 FROM test_cycle_items i WHERE i."cycleId"=$2 AND i."testCaseId"=tc.id)';
    if (q.search) {
      values.push(`%${q.search.trim()}%`);
      where += ` AND (tc.scenario ILIKE $3 OR tc."testId" ILIKE $3)`;
    }
    const count = await this.database.db.query(
        `SELECT COUNT(*)::int AS total FROM test_cases tc WHERE ${where}`,
        values,
      ),
      { page, limit } = this.page(q);
    const data = await this.database.db.query(
      `SELECT tc.id,tc."testId",tc.scenario,tc.priority FROM test_cases tc WHERE ${where} ORDER BY tc.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit],
    );
    return this.paginated(data.rows, count.rows[0].total, q);
  }
  private async tester(
    db: Queryable,
    projectId: number,
    testerId?: number | null,
  ) {
    if (
      testerId &&
      !(
        await db.query(
          'SELECT 1 FROM project_assignments WHERE "projectId"=$1 AND "userId"=$2',
          [projectId, testerId],
        )
      ).rowCount
    )
      throw new BadRequestException('Tester must be assigned to this project');
  }
  async addItems(id: number, dto: AddCycleItemsDto, user: WorkflowUser) {
    this.admin(user);
    return this.transaction(async (db) => {
      const c = await this.lockedCycle(db, id, user);
      for (const item of dto.items) {
        await this.tester(db, c.projectId, item.testerId);
        const tc = (
          await db.query(
            'SELECT * FROM test_cases WHERE id=$1 AND "projectId"=$2 FOR SHARE',
            [item.testCaseId, c.projectId],
          )
        ).rows[0];
        if (!tc)
          throw new BadRequestException(
            'Every test case must belong to the cycle project',
          );
        await db.query(
          'INSERT INTO test_cycle_items("cycleId","projectId","testCaseId","testerId",snapshot) VALUES($1,$2,$3,$4,$5)',
          [id, c.projectId, tc.id, item.testerId || null, JSON.stringify(tc)],
        );
      }
      return { added: dto.items.length };
    });
  }
  async items(id: number, q: WorkflowQueryDto, user: WorkflowUser) {
    await this.cycle(id, user);
    const values: any[] = [id];
    const conditions = ['i."cycleId"=$1'];
    if (q.search) {
      values.push(`%${q.search.trim()}%`);
      conditions.push(
        `(i.snapshot->>'scenario' ILIKE $${values.length} OR i.snapshot->>'testId' ILIKE $${values.length})`,
      );
    }
    if (q.status) {
      values.push(q.status);
      conditions.push(`COALESCE(e.status,'not_run')=$${values.length}`);
    }
    if (q.testerId) {
      values.push(q.testerId);
      conditions.push(`i."testerId"=$${values.length}`);
    }
    const from = `FROM test_cycle_items i ${latestItem} LEFT JOIN users u ON u.id=i."testerId" WHERE ${conditions.join(' AND ')}`;
    const count = await this.database.db.query(
        `SELECT COUNT(*)::int AS total ${from}`,
        values,
      ),
      { page, limit } = this.page(q);
    const data = await this.database.db.query(
      `SELECT i.*,u.name AS "testerName",COALESCE(e.status,'not_run') AS status,e."actualResult",e.notes,e.environment,e."executedAt",e."durationSeconds",e.id AS "latestExecutionId" ${from} ORDER BY i.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit],
    );
    return this.paginated(data.rows, count.rows[0].total, q);
  }
  async assign(
    id: number,
    itemId: number,
    dto: AssignCycleItemDto,
    user: WorkflowUser,
  ) {
    this.admin(user);
    return this.transaction(async (db) => {
      const c = await this.lockedCycle(db, id, user);
      await this.tester(db, c.projectId, dto.testerId);
      const r = await db.query(
        'UPDATE test_cycle_items SET "testerId"=$1 WHERE id=$2 AND "cycleId"=$3 RETURNING id',
        [dto.testerId || null, itemId, id],
      );
      if (!r.rowCount) throw new NotFoundException('Cycle item not found');
      return r.rows[0];
    });
  }
  async execute(
    id: number,
    itemId: number,
    dto: CreateExecutionDto,
    user: WorkflowUser,
  ) {
    return this.transaction(async (db) => {
      const c = await this.lockedCycle(db, id, user);
      if (c.status !== 'active')
        throw new ConflictException('Activate this cycle before executing');
      const item = (
        await db.query(
          'SELECT * FROM test_cycle_items WHERE id=$1 AND "cycleId"=$2 FOR UPDATE',
          [itemId, id],
        )
      ).rows[0];
      if (!item) throw new NotFoundException('Cycle item not found');
      if (user.role !== 'admin' && item.testerId !== user.id)
        throw new ForbiddenException(
          'Only the assigned tester can execute this item',
        );
      if (
        dto.executedAt &&
        new Date(dto.executedAt).getTime() > Date.now() + 60000
      )
        throw new BadRequestException('Execution date cannot be in the future');
      return (
        await db.query(
          `INSERT INTO test_executions("testCaseId","cycleItemId","projectId","testerId","testerName",status,"actualResult",notes,environment,"executedAt","durationSeconds",snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [
            item.testCaseId,
            item.id,
            c.projectId,
            user.id,
            user.name || null,
            dto.status,
            dto.actualResult || null,
            dto.notes || null,
            dto.environment || null,
            dto.status === 'not_run'
              ? null
              : dto.executedAt || new Date().toISOString(),
            dto.durationSeconds ?? null,
            JSON.stringify(item.snapshot),
          ],
        )
      ).rows[0];
    });
  }
  async history(id: number, q: WorkflowQueryDto, user: WorkflowUser) {
    await this.caseAccess(id, user);
    const { page, limit } = this.page(q);
    const count = await this.database.db.query(
      'SELECT COUNT(*)::int AS total FROM test_executions WHERE "testCaseId"=$1',
      [id],
    );
    const data = await this.database.db.query(
      `SELECT e.*,COALESCE(e."testerName",u.name) AS "testerName",c.name AS "cycleName",r.name AS "releaseName",r.version FROM test_executions e LEFT JOIN users u ON u.id=e."testerId" LEFT JOIN test_cycle_items i ON i.id=e."cycleItemId" LEFT JOIN test_cycles c ON c.id=i."cycleId" LEFT JOIN releases r ON r.id=c."releaseId" WHERE e."testCaseId"=$1 ORDER BY e.id DESC LIMIT $2 OFFSET $3`,
      [id, limit, (page - 1) * limit],
    );
    return this.paginated(data.rows, count.rows[0].total, q);
  }
  async metrics(q: WorkflowQueryDto, user: WorkflowUser) {
    const s = this.scope(q, user);
    if (q.testerId) s.add('COALESCE(e."testerId",i."testerId")=?', q.testerId);
    const current = await this.database.db.query(
      `SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE e.status='passed')::int AS passed,COUNT(*) FILTER(WHERE e.status='failed')::int AS failed,COUNT(*) FILTER(WHERE e.status='blocked')::int AS blocked,COUNT(*) FILTER(WHERE e.status='skipped')::int AS skipped,COUNT(*) FILTER(WHERE e.id IS NULL OR e.status='not_run')::int AS not_run FROM test_cycle_items i JOIN test_cycles c ON c.id=i."cycleId" ${latestItem} ${s.where()}`,
      s.values,
    );
    const a = this.scope(q, user);
    if (q.testerId) a.add('e."testerId"=?', q.testerId);
    // Independent attempt counts include legacy/compatibility executions, without inventing cycle scope.
    const attempts = await this.database.db.query(
      `SELECT COUNT(*) FILTER(WHERE e.status<>'not_run')::int AS total FROM test_executions e LEFT JOIN test_cycle_items i ON i.id=e."cycleItemId" LEFT JOIN test_cycles base ON base.id=i."cycleId" CROSS JOIN LATERAL (SELECT e."projectId",base."releaseId",base.id) c ${a.where()}`,
      a.values,
    );
    const p = this.scope(q, user);
    let totalsSql = cycleTotals;
    if (q.testerId) {
      p.values.push(q.testerId);
      totalsSql += ` AND COALESCE(e."testerId",i."testerId")=$${p.values.length}`;
    }
    const progress = await this.database.db.query(
      `SELECT c.id,c.name,c.status,c."releaseId",r.version,r.name AS "releaseName",totals.* FROM test_cycles c JOIN releases r ON r.id=c."releaseId" CROSS JOIN LATERAL (${totalsSql}) totals ${p.where()} ORDER BY CASE WHEN c.status='active' THEN 0 ELSE 1 END,c.id DESC LIMIT 100`,
      p.values,
    );
    const cycles = progress.rows.map((c) => ({ ...c, summary: summarize(c) }));
    const releaseProgress = await this.database.db.query(
      `SELECT r.id,r.name,r.version,r.status,SUM(totals.total)::int AS total,SUM(totals.passed)::int AS passed,SUM(totals.failed)::int AS failed,SUM(totals.blocked)::int AS blocked,SUM(totals.skipped)::int AS skipped,SUM(totals.not_run)::int AS not_run FROM test_cycles c JOIN releases r ON r.id=c."releaseId" CROSS JOIN LATERAL (${totalsSql}) totals ${p.where()} GROUP BY r.id ORDER BY r.id DESC`,
      p.values,
    );
    return {
      totalExecutions: attempts.rows[0].total,
      summary: summarize(current.rows[0]),
      cycles,
      releases: releaseProgress.rows.map((r) => ({
        ...r,
        summary: summarize(r),
      })),
    };
  }
  // Compatibility writes from the original case form also append history, never overwrite results.
  async appendCompatibility(
    db: Queryable,
    tc: any,
    dto: any,
    user: WorkflowUser,
  ) {
    if (
      ![
        'passed',
        'failed',
        'blocked',
        'skipped',
        'pending',
        'not_run',
      ].includes(dto.status)
    )
      return;
    const actor = (
      await db.query('SELECT name FROM users WHERE id=$1', [user.id])
    ).rows[0];
    await db.query(
      `INSERT INTO test_executions("testCaseId","projectId","testerId","testerName",status,"actualResult",notes,environment,"executedAt",snapshot,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'compatibility')`,
      [
        tc.id,
        tc.projectId,
        user.id,
        actor?.name || null,
        dto.status === 'pending' ? 'not_run' : dto.status,
        dto.actualResult || null,
        dto.notes || null,
        null,
        ['pending', 'not_run'].includes(dto.status)
          ? null
          : dto.executedAt || new Date().toISOString(),
        JSON.stringify(tc),
      ],
    );
  }
}
