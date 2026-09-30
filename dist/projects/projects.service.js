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
        const db = this.databaseService.db;
        const stmt = db.prepare(`
      INSERT INTO projects (name, description, environment, status)
      VALUES (?, ?, ?, ?)
    `);
        const result = stmt.run(dto.name, dto.description || null, dto.environment || 'staging', dto.status || 'active');
        const newId = Number(result.lastInsertRowid);
        return this.findOne(newId);
    }
    async findAll(query) {
        const db = this.databaseService.db;
        const conditions = [];
        const params = [];
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
        const projects = db.prepare(sql).all(...params);
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
            const statsRow = stmtStats.get(p.id);
            const total = statsRow.total || 0;
            const passed = statsRow.passed || 0;
            const failed = statsRow.failed || 0;
            const pending = statsRow.pending || 0;
            const successRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
            const assignedUsers = stmtAssignedUsers.all(p.id);
            return {
                ...p,
                stats: { total, passed, failed, pending, successRate },
                assignedUsers,
            };
        });
    }
    async findOne(id) {
        const db = this.databaseService.db;
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!project) {
            throw new common_1.NotFoundException(`Project #${id} not found`);
        }
        const assignedUsers = db.prepare(`
      SELECT u.id, u.id as userId, u.name, u.email, u.role, u.photo, u.profileImage, pa.assignedAt
      FROM users u
      INNER JOIN project_assignments pa ON u.id = pa.userId
      WHERE pa.projectId = ?
      ORDER BY pa.assignedAt DESC
    `).all(id);
        const recentTestCases = db.prepare(`
      SELECT
        tc.*,
        u.id as tester_id, u.name as tester_name
      FROM test_cases tc
      LEFT JOIN users u ON tc.testerId = u.id
      WHERE tc.projectId = ?
      ORDER BY tc.id DESC
      LIMIT 5
    `).all(id);
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
    `).get(id);
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
    async update(id, dto) {
        const db = this.databaseService.db;
        await this.findOne(id);
        const fields = [];
        const values = [];
        const allowed = ['name', 'description', 'environment', 'status'];
        for (const key of allowed) {
            if (dto[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(dto[key]);
            }
        }
        if (fields.length > 0) {
            fields.push("updatedAt = datetime('now')");
            values.push(id);
            db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }
        return this.findOne(id);
    }
    async remove(id) {
        const db = this.databaseService.db;
        await this.findOne(id);
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        return { message: `Project #${id} deleted successfully` };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map