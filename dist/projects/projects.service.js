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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let ProjectsService = class ProjectsService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async create(dto) {
        const id = await this.saveProject(null, dto);
        return this.findOne(id);
    }
    async saveProject(id, dto) {
        const client = await this.databaseService.db.connect();
        try {
            await client.query('BEGIN');
            const previous = id === null
                ? null
                : (await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [id])).rows[0];
            if (id !== null && !previous)
                throw new common_1.NotFoundException('Project not found');
            const startAt = dto.startAt === undefined ? previous?.startAt : dto.startAt;
            const endAt = dto.endAt === undefined ? previous?.endAt : dto.endAt;
            if ((startAt || endAt) &&
                (!startAt ||
                    !endAt ||
                    !Number.isFinite(new Date(startAt).getTime()) ||
                    !Number.isFinite(new Date(endAt).getTime()) ||
                    new Date(startAt) >= new Date(endAt))) {
                throw new common_1.BadRequestException('Start must be earlier than end / يجب أن يكون وقت البداية قبل النهاية');
            }
            if (id === null && (!startAt || !endAt))
                throw new common_1.BadRequestException('Start and end are required / وقت البداية والنهاية مطلوبان');
            const testerId = dto.assignedTesterId === undefined
                ? (previous?.assignedTesterId ?? null)
                : dto.assignedTesterId;
            if (testerId !== null) {
                const tester = await client.query("SELECT id FROM users WHERE id=$1 AND role IN ('tester','admin') FOR SHARE", [testerId]);
                if (!tester.rowCount)
                    throw new common_1.BadRequestException('Select an eligible Tester or Admin / اختر مستخدماً بدور مختبر أو مدير');
            }
            const values = [
                dto.name ?? previous?.name,
                dto.description ?? previous?.description ?? null,
                dto.environment ?? previous?.environment ?? 'staging',
                dto.status ?? previous?.status ?? 'active',
                startAt ?? null,
                endAt ?? null,
                testerId,
                dto.application ?? previous?.application ?? null,
            ];
            const result = id === null
                ? await client.query('INSERT INTO projects(name,description,environment,status,"startAt","endAt","assignedTesterId",application) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', values)
                : await client.query('UPDATE projects SET name=$1,description=$2,environment=$3,status=$4,"startAt"=$5,"endAt"=$6,"assignedTesterId"=$7,application=$8,"updatedAt"=NOW() WHERE id=$9 RETURNING id', [...values, id]);
            const projectId = result.rows[0].id;
            if (previous?.assignedTesterId &&
                previous.assignedTesterId !== testerId) {
                await client.query('DELETE FROM project_assignments WHERE "projectId"=$1 AND "userId"=$2 AND "primaryManaged"=TRUE', [projectId, previous.assignedTesterId]);
            }
            if (testerId !== null) {
                const assignment = await client.query('INSERT INTO project_assignments("projectId","userId","primaryManaged") VALUES($1,$2,TRUE) ON CONFLICT ("userId","projectId") DO NOTHING RETURNING id', [projectId, testerId]);
                if (assignment.rowCount) {
                    await client.query(`INSERT INTO notifications("userId",title,message,"titleEn","messageEn","projectId",link)
            VALUES($1,$2,$3,$4,$5,$6,$7)`, [
                        testerId,
                        'إسناد مشروع جديد: ' + values[0],
                        'تم إسناد المشروع إليك: ' + values[0],
                        'New project assignment: ' + values[0],
                        'You have been assigned to project ' + values[0],
                        projectId,
                        '/projects?project=' + projectId,
                    ]);
                }
            }
            await client.query('COMMIT');
            return projectId;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async findAll(query, currentUser) {
        const db = this.databaseService.db;
        const conditions = [];
        const params = [];
        const isAssignedToMe = query.assignedToMe === 'true' || query.assignedToMe === true;
        const targetUserId = query.assignedToUserId
            ? Number(query.assignedToUserId)
            : null;
        let joinClause = '';
        if (targetUserId && currentUser?.role === 'admin') {
            joinClause = 'INNER JOIN project_assignments pa ON p.id = pa."projectId"';
            conditions.push('pa."userId" = ?');
            params.push(targetUserId);
        }
        else if (isAssignedToMe ||
            (currentUser && currentUser.role !== 'admin')) {
            joinClause = 'INNER JOIN project_assignments pa ON p.id = pa."projectId"';
            conditions.push('pa."userId" = ?');
            params.push(Number(currentUser.id || currentUser.userId || currentUser.sub));
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
        const numberedConditions = conditions.map((c) => c.replace(/\?/g, () => `$${pidx++}`));
        const whereClause = numberedConditions.length > 0
            ? `WHERE ${numberedConditions.join(' AND ')}`
            : '';
        const sql = `SELECT DISTINCT p.* FROM projects p ${joinClause} ${whereClause} ORDER BY p.id ASC`;
        const projectsResult = await db.query(sql, params);
        const projects = projectsResult.rows;
        const statsSql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status != 'passed' AND status != 'failed' THEN 1 ELSE 0 END) as pending
      FROM test_cases_current
      WHERE "projectId" = $1 OR ("projectId" IS NULL AND LOWER(TRIM(module)) = LOWER(TRIM($2)))
    `;
        const assignedUsersSql = `
      SELECT u.id, u.id as "userId", u.name, u.email, u.role, u.photo, u."profileImage", pa."assignedAt"
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa."userId"
      WHERE pa."projectId" = $1
      ORDER BY pa."assignedAt" DESC
    `;
        return Promise.all(projects.map(async (p) => {
            const statsResult = await db.query(statsSql, [p.id, p.name || '']);
            const statsRow = statsResult.rows[0];
            const total = Number(statsRow.total) || 0;
            const passed = Number(statsRow.passed) || 0;
            const failed = Number(statsRow.failed) || 0;
            const pending = Number(statsRow.pending) || 0;
            const successRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
            const assignedUsersResult = await db.query(assignedUsersSql, [p.id]);
            const assignedUsers = assignedUsersResult.rows.map((u) => ({
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
    async findOne(id, currentUser) {
        const db = this.databaseService.db;
        const projectResult = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
        const project = projectResult.rows[0];
        if (!project) {
            throw new common_1.NotFoundException(`Project #${id} not found`);
        }
        if (currentUser && currentUser.role !== 'admin') {
            const checkResult = await db.query('SELECT 1 FROM project_assignments WHERE "projectId" = $1 AND "userId" = $2', [id, currentUser.id || currentUser.userId || currentUser.sub]);
            if (checkResult.rows.length === 0) {
                throw new common_1.ForbiddenException('غير مصرح لك بالوصول لهذا المشروع');
            }
        }
        const assignedUsersResult = await db.query(`
      SELECT u.id, u.id as "userId", u.name, u.email, u.role, u.photo, u."profileImage", pa."assignedAt"
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa."userId"
      WHERE pa."projectId" = $1
      ORDER BY pa."assignedAt" DESC
    `, [id]);
        const assignedUsers = assignedUsersResult.rows.map((u) => ({
            ...u,
            photo: this.databaseService.resolvePhotoUrl(u),
            profileImage: this.databaseService.resolvePhotoUrl(u),
        }));
        const recentTestCasesResult = await db.query(`
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name
      FROM test_cases_current tc
      LEFT JOIN users u ON tc."testerId" = u.id
      WHERE tc."projectId" = $1
      ORDER BY tc.id DESC
      LIMIT 5
    `, [id]);
        const recentTestCases = recentTestCasesResult.rows;
        const formattedTCs = recentTestCases.map((tc) => {
            const { tester_id, tester_name, ...base } = tc;
            let steps = [];
            try {
                steps = JSON.parse(base.steps || '[]');
            }
            catch {
                steps = [];
            }
            return {
                ...base,
                steps,
                testerId: tester_id || null,
                userId: tester_id || null,
                tester: tester_id
                    ? { id: tester_id, userId: tester_id, name: tester_name }
                    : null,
            };
        });
        const statsResult = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_cases_current
      WHERE "projectId" = $1
    `, [id]);
        const statsRow = statsResult.rows[0];
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
    async update(id, dto) {
        await this.saveProject(id, dto);
        return this.findOne(id);
    }
    async remove(id) {
        const db = await this.databaseService.db.connect();
        try {
            await db.query('BEGIN');
            const project = await db.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE', [id]);
            if (!project.rowCount)
                throw new common_1.NotFoundException(`Project #${id} not found`);
            const history = await db.query('SELECT 1 FROM releases WHERE "projectId"=$1 UNION ALL SELECT 1 FROM test_executions WHERE "projectId"=$1 UNION ALL SELECT 1 FROM test_case_imports WHERE "projectId"=$1 LIMIT 1', [id]);
            if (history.rowCount)
                throw new common_1.BadRequestException('Project has releases, execution history or imported source records. Archive it instead.');
            const assignments = await db.query('SELECT 1 FROM project_assignments WHERE "projectId"=$1 LIMIT 1', [id]);
            if (assignments.rowCount) {
                throw new common_1.BadRequestException('لا يمكن حذف هذا المشروع لأنه مسند لمستخدمين حالياً. يرجى إلغاء إسناد المشروع أولاً قبل الحذف.');
            }
            await db.query('DELETE FROM project_assignments WHERE "projectId" = $1', [
                id,
            ]);
            await db.query('UPDATE test_cases SET "projectId" = NULL WHERE "projectId" = $1', [id]);
            await db.query('DELETE FROM projects WHERE id = $1', [id]);
            await db.query('COMMIT');
            return { message: `تم حذف المشروع رقم #${id} بنجاح` };
        }
        catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        finally {
            db.release();
        }
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map