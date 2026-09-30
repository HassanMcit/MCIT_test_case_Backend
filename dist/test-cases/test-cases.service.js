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
exports.TestCasesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let TestCasesService = class TestCasesService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    generateTestId() {
        const row = this.databaseService.db
            .prepare('SELECT MAX(id) as maxId FROM test_cases')
            .get();
        const nextNum = (row.maxId || 0) + 1;
        return `TC-${String(nextNum).padStart(4, '0')}`;
    }
    async create(dto) {
        const db = this.databaseService.db;
        const testId = dto.testId || this.generateTestId();
        const existing = db
            .prepare('SELECT id FROM test_cases WHERE testId = ?')
            .get(testId);
        if (existing) {
            throw new common_1.ConflictException(`Test case with ID "${testId}" already exists`);
        }
        const stepsStr = JSON.stringify(dto.steps || []);
        const executedAt = dto.executedAt || (dto.status === 'passed' || dto.status === 'failed' ? new Date().toISOString() : null);
        const targetTesterId = dto.testerId ?? dto.userId ?? null;
        const stmt = db.prepare(`
      INSERT INTO test_cases (
        testId, module, pageName, scenario, preConditions, steps,
        expectedResult, actualResult, priority, status, notes,
        executedAt, testerId, projectId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(testId, dto.module, dto.pageName || null, dto.scenario, dto.preConditions || null, stepsStr, dto.expectedResult, dto.actualResult || null, dto.priority || 'medium', dto.status || 'pending', dto.notes || null, executedAt, targetTesterId, dto.projectId || null);
        const newId = Number(result.lastInsertRowid);
        return this.findOne(newId);
    }
    async findAll(query) {
        const db = this.databaseService.db;
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
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
            conditions.push('tc.projectId = ?');
            params.push(Number(query.projectId));
        }
        if (query.search) {
            conditions.push('(tc.testId LIKE ? OR tc.module LIKE ? OR tc.scenario LIKE ?)');
            const s = `%${query.search}%`;
            params.push(s, s, s);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countSql = `SELECT COUNT(*) as total FROM test_cases tc ${whereClause}`;
        const totalRow = db.prepare(countSql).get(...params);
        const total = totalRow.total;
        const dataSql = `
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name, u.email as tester_email,
        p.id as project_id, p.name as project_name
      FROM test_cases tc
      LEFT JOIN users u ON tc.testerId = u.id
      LEFT JOIN projects p ON tc.projectId = p.id
      ${whereClause}
      ORDER BY tc.id DESC
      LIMIT ? OFFSET ?
    `;
        const rows = db.prepare(dataSql).all(...params, limit, offset);
        const formattedData = rows.map((r) => {
            const { tester_id, tester_name, tester_email, project_id, project_name, ...base } = r;
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
    async findOne(id) {
        const db = this.databaseService.db;
        const sql = `
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name, u.email as tester_email,
        p.id as project_id, p.name as project_name
      FROM test_cases tc
      LEFT JOIN users u ON tc.testerId = u.id
      LEFT JOIN projects p ON tc.projectId = p.id
      WHERE tc.id = ?
    `;
        const row = db.prepare(sql).get(id);
        if (!row) {
            throw new common_1.NotFoundException(`Test case #${id} not found`);
        }
        const { tester_id, tester_name, tester_email, project_id, project_name, ...base } = row;
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
            tester: tester_id ? { id: tester_id, userId: tester_id, name: tester_name, email: tester_email } : null,
            project: project_id ? { id: project_id, name: project_name } : null,
        };
    }
    async update(id, dto) {
        const db = this.databaseService.db;
        await this.findOne(id);
        const fields = [];
        const values = [];
        const effectiveTesterId = dto.testerId ?? dto.userId;
        if (effectiveTesterId !== undefined) {
            fields.push('testerId = ?');
            values.push(effectiveTesterId);
        }
        const allowed = [
            'module', 'pageName', 'scenario', 'preConditions',
            'expectedResult', 'actualResult', 'priority', 'status',
            'notes', 'executedAt', 'projectId'
        ];
        for (const key of allowed) {
            if (dto[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(dto[key]);
            }
        }
        if (dto.steps !== undefined) {
            fields.push('steps = ?');
            values.push(JSON.stringify(dto.steps));
        }
        if (fields.length > 0) {
            fields.push("updatedAt = datetime('now')");
            values.push(id);
            const sql = `UPDATE test_cases SET ${fields.join(', ')} WHERE id = ?`;
            db.prepare(sql).run(...values);
        }
        return this.findOne(id);
    }
    async remove(id) {
        const db = this.databaseService.db;
        await this.findOne(id);
        db.prepare('DELETE FROM test_cases WHERE id = ?').run(id);
        return { message: `Test case #${id} deleted successfully` };
    }
};
exports.TestCasesService = TestCasesService;
exports.TestCasesService = TestCasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TestCasesService);
//# sourceMappingURL=test-cases.service.js.map