"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const database_service_1 = require("../database/database.service");
let UsersService = class UsersService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    getPhotoDataUrl(file, req) {
        try {
            if (file.buffer) {
                const mime = file.mimetype || 'image/png';
                return `data:${mime};base64,${file.buffer.toString('base64')}`;
            }
            const filePath = file.path || (file.filename ? path.join(process.cwd(), 'uploads', file.filename) : null);
            if (filePath && fs.existsSync(filePath)) {
                const buf = fs.readFileSync(filePath);
                const mime = file.mimetype || 'image/png';
                return `data:${mime};base64,${buf.toString('base64')}`;
            }
        }
        catch (err) {
            console.error('Error generating base64 for uploaded photo:', err);
        }
        const host = req?.get ? req.get('host') : req?.headers?.host || 'localhost:3001';
        const isHttps = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https' || (typeof host === 'string' && host.includes('onrender.com'));
        const protocol = isHttps ? 'https' : (req?.protocol || 'http');
        const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
        return `${baseUrl}/uploads/${file.filename}`;
    }
    async create(dto) {
        const db = this.databaseService.db;
        const existing = db
            .prepare('SELECT id FROM users WHERE email = ?')
            .get(dto.email);
        if (existing) {
            throw new common_1.ConflictException('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
        }
        const hashedPassword = bcrypt.hashSync(dto.password, 10);
        const userRole = dto.role || 'user';
        const defaultPhoto = this.databaseService.getPersistedPhoto();
        const result = db
            .prepare(`
        INSERT INTO users (name, email, password, role, photo, profileImage)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
            .run(dto.name, dto.email, hashedPassword, userRole, defaultPhoto, defaultPhoto);
        const newId = Number(result.lastInsertRowid);
        return this.findOne(newId);
    }
    async findAll() {
        const db = this.databaseService.db;
        const users = db
            .prepare('SELECT id, name, email, role, photo, createdAt FROM users ORDER BY id ASC')
            .all();
        const stmtProjects = db.prepare(`
      SELECT p.id, p.name, p.description, p.environment, p.status, pa.assignedAt
      FROM projects p
      INNER JOIN project_assignments pa ON p.id = pa.projectId
      WHERE pa.userId = ?
      ORDER BY pa.assignedAt DESC
    `);
        const stmtCounts = db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?');
        const defaultPhoto = this.databaseService.getPersistedPhoto();
        return users.map((u) => {
            const assignedProjects = stmtProjects.all(u.id);
            const testCasesCount = stmtCounts.get(u.id).count;
            const userPhoto = (u.photo && u.photo.trim() !== '') ? u.photo : defaultPhoto;
            return {
                ...u,
                photo: userPhoto,
                _count: {
                    testCases: testCasesCount,
                    assignedProjects: assignedProjects.length,
                },
                assignedProjects,
            };
        });
    }
    async findOne(id) {
        const db = this.databaseService.db;
        const user = db
            .prepare('SELECT id, name, email, role, photo, createdAt FROM users WHERE id = ?')
            .get(id);
        if (!user) {
            throw new common_1.NotFoundException(`المستخدم رقم #${id} غير موجود`);
        }
        const testCaseCount = db
            .prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?')
            .get(id).count;
        const assignedProjects = db
            .prepare(`
        SELECT p.id, p.name, p.description, p.environment, p.status, pa.assignedAt
        FROM projects p
        INNER JOIN project_assignments pa ON p.id = pa.projectId
        WHERE pa.userId = ?
        ORDER BY pa.assignedAt DESC
      `)
            .all(id);
        const defaultPhoto = this.databaseService.getPersistedPhoto();
        const userPhoto = (user.photo && user.photo.trim() !== '') ? user.photo : defaultPhoto;
        return {
            ...user,
            photo: userPhoto,
            _count: {
                testCases: testCaseCount,
                assignedProjects: assignedProjects.length,
            },
            assignedProjects,
        };
    }
    async updateProfile(userId, dto, file, req) {
        const db = this.databaseService.db;
        const user = db
            .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
            .get(userId);
        if (!user) {
            throw new common_1.NotFoundException(`المستخدم رقم #${userId} غير موجود`);
        }
        const updates = [];
        const values = [];
        if (dto?.name !== undefined && dto.name.trim() !== '') {
            updates.push('name = ?');
            values.push(dto.name.trim());
        }
        if (file && req) {
            const photoUrl = this.getPhotoDataUrl(file, req);
            try {
                const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
                fs.writeFileSync(avatarFile, photoUrl, 'utf8');
            }
            catch (err) {
                console.error('Error writing persisted_avatar.txt:', err);
            }
            updates.push('photo = ?');
            values.push(photoUrl);
            updates.push('profileImage = ?');
            values.push(photoUrl);
        }
        else if (dto?.photo !== undefined) {
            try {
                const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
                fs.writeFileSync(avatarFile, dto.photo, 'utf8');
            }
            catch (err) { }
            updates.push('photo = ?');
            values.push(dto.photo);
            updates.push('profileImage = ?');
            values.push(dto.photo);
        }
        if (updates.length === 0) {
            return this.findOne(userId);
        }
        updates.push("updatedAt = datetime('now')");
        values.push(userId);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return {
            message: 'تم تحديث الملف الشخصي بنجاح',
            user: await this.findOne(userId),
        };
    }
    async updateProfilePhoto(userId, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('يرجى اختيار صورة ورفعها في حقل photo');
        }
        const photoUrl = this.getPhotoDataUrl(file, req);
        try {
            const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
            fs.writeFileSync(avatarFile, photoUrl, 'utf8');
        }
        catch (err) {
            console.error('Error writing persisted_avatar.txt:', err);
        }
        const db = this.databaseService.db;
        const user = db
            .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
            .get(userId);
        if (!user) {
            throw new common_1.NotFoundException(`المستخدم رقم #${userId} غير موجود`);
        }
        db.prepare("UPDATE users SET photo = ?, profileImage = ?, updatedAt = datetime('now') WHERE id = ?").run(photoUrl, photoUrl, userId);
        const updatedUser = await this.findOne(userId);
        return {
            message: 'تم تحديث الصورة الشخصية بنجاح',
            photo: photoUrl,
            user: updatedUser,
        };
    }
    async assignProject(userId, dto) {
        const db = this.databaseService.db;
        const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId);
        if (!user) {
            throw new common_1.NotFoundException(`المستخدم رقم #${userId} غير موجود`);
        }
        const project = db.prepare('SELECT id, name, environment, status FROM projects WHERE id = ?').get(dto.projectId);
        if (!project) {
            throw new common_1.NotFoundException(`المشروع رقم #${dto.projectId} غير موجود`);
        }
        const existing = db
            .prepare('SELECT id FROM project_assignments WHERE userId = ? AND projectId = ?')
            .get(userId, dto.projectId);
        if (existing) {
            throw new common_1.ConflictException(`المشروع "${project.name}" مسند بالفعل للمستخدم "${user.name}"`);
        }
        db.prepare(`
      INSERT INTO project_assignments (userId, projectId)
      VALUES (?, ?)
    `).run(userId, dto.projectId);
        return {
            message: `تم إسناد مشروع "${project.name}" للمستخدم "${user.name}" بنجاح للبدء في اختباره`,
            assignment: {
                userId: user.id,
                userName: user.name,
                projectId: project.id,
                projectName: project.name,
                assignedAt: new Date().toISOString(),
            },
        };
    }
    async unassignProject(userId, projectId) {
        const db = this.databaseService.db;
        const existing = db
            .prepare('SELECT id FROM project_assignments WHERE userId = ? AND projectId = ?')
            .get(userId, projectId);
        if (!existing) {
            throw new common_1.NotFoundException('هذا الإسناد غير موجود بالفعل');
        }
        db.prepare('DELETE FROM project_assignments WHERE userId = ? AND projectId = ?').run(userId, projectId);
        return {
            message: `تم إلغاء إسناد المشروع #${projectId} من المستخدم #${userId} بنجاح`,
        };
    }
    async getMyAssignedProjects(userId) {
        const db = this.databaseService.db;
        const stmt = db.prepare(`
      SELECT p.*, pa.assignedAt
      FROM projects p
      INNER JOIN project_assignments pa ON p.id = pa.projectId
      WHERE pa.userId = ?
      ORDER BY pa.assignedAt DESC
    `);
        const projects = stmt.all(userId);
        const stmtStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_cases
      WHERE projectId = ?
    `);
        return projects.map((p) => {
            const statsRow = stmtStats.get(p.id);
            const total = statsRow.total || 0;
            const passed = statsRow.passed || 0;
            const failed = statsRow.failed || 0;
            const pending = statsRow.pending || 0;
            const successRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
            return {
                ...p,
                stats: { total, passed, failed, pending, successRate },
            };
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map