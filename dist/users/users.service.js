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
    async serveUserPhoto(userId, res) {
        const db = this.databaseService.db;
        const user = db
            .prepare('SELECT id, name, photo, profileImage FROM users WHERE id = ?')
            .get(userId);
        const DEFAULT_PHOTO_URL = database_service_1.DatabaseService.DEFAULT_PHOTO_URL;
        if (!user) {
            return res.redirect(DEFAULT_PHOTO_URL);
        }
        const rawPhoto = user.photo || user.profileImage;
        if (!rawPhoto || typeof rawPhoto !== 'string' || rawPhoto.trim() === '') {
            return res.redirect(DEFAULT_PHOTO_URL);
        }
        if (rawPhoto.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk')) {
            return res.redirect(DEFAULT_PHOTO_URL);
        }
        if (rawPhoto.startsWith('data:image/')) {
            const matches = rawPhoto.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Length', buffer.length);
                res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');
                return res.end(buffer);
            }
        }
        if (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) {
            if (rawPhoto.includes(`/api/users/${userId}/photo`)) {
                return res.redirect(DEFAULT_PHOTO_URL);
            }
            return res.redirect(rawPhoto);
        }
        const cleanPath = rawPhoto.startsWith('/uploads/')
            ? rawPhoto.slice(9)
            : rawPhoto.startsWith('uploads/')
                ? rawPhoto.slice(8)
                : rawPhoto;
        const diskPath = path.isAbsolute(rawPhoto)
            ? rawPhoto
            : path.join(process.cwd(), 'uploads', path.basename(cleanPath));
        if (fs.existsSync(diskPath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');
            return res.sendFile(diskPath);
        }
        return res.redirect(DEFAULT_PHOTO_URL);
    }
    async create(dto, req) {
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
        return this.findOne(newId, req);
    }
    async findAll(req) {
        const db = this.databaseService.db;
        const users = db
            .prepare('SELECT id, name, email, role, photo, profileImage, createdAt, updatedAt FROM users ORDER BY id ASC')
            .all();
        const stmtProjects = db.prepare(`
      SELECT p.id, p.name, p.description, p.environment, p.status, pa.assignedAt
      FROM projects p
      INNER JOIN project_assignments pa ON p.id = pa.projectId
      WHERE pa.userId = ?
      ORDER BY pa.assignedAt DESC
    `);
        const stmtCounts = db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?');
        return users.map((u) => {
            const assignedProjects = stmtProjects.all(u.id);
            const testCasesCount = stmtCounts.get(u.id).count;
            const photoUrl = this.databaseService.resolvePhotoUrl(u, req);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                photo: photoUrl,
                profileImage: photoUrl,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
                _count: {
                    testCases: testCasesCount,
                    assignedProjects: assignedProjects.length,
                },
                assignedProjects,
            };
        });
    }
    async findOne(id, req) {
        const db = this.databaseService.db;
        const user = db
            .prepare('SELECT id, name, email, role, photo, profileImage, createdAt, updatedAt FROM users WHERE id = ?')
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
        const photoUrl = this.databaseService.resolvePhotoUrl(user, req);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photo: photoUrl,
            profileImage: photoUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
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
        let photoPayload = null;
        if (file) {
            try {
                if (file.buffer) {
                    const mime = file.mimetype || 'image/png';
                    photoPayload = `data:${mime};base64,${file.buffer.toString('base64')}`;
                }
                else {
                    const filePath = file.path || path.join(process.cwd(), 'uploads', file.filename);
                    if (fs.existsSync(filePath)) {
                        const buf = fs.readFileSync(filePath);
                        const mime = file.mimetype || 'image/png';
                        photoPayload = `data:${mime};base64,${buf.toString('base64')}`;
                    }
                }
            }
            catch (err) {
                console.error('Error processing uploaded photo file:', err);
            }
            if (!photoPayload && file.filename) {
                photoPayload = `uploads/${file.filename}`;
            }
        }
        else if (dto?.photo !== undefined && dto.photo.trim() !== '') {
            photoPayload = dto.photo.trim();
        }
        if (photoPayload) {
            try {
                const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
                fs.writeFileSync(avatarFile, photoPayload, 'utf8');
            }
            catch (err) {
                console.error('Error writing persisted_avatar.txt:', err);
            }
            updates.push('photo = ?');
            values.push(photoPayload);
            updates.push('profileImage = ?');
            values.push(photoPayload);
        }
        if (updates.length > 0) {
            updates.push("updatedAt = datetime('now')");
            values.push(userId);
            db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }
        const updatedUser = await this.findOne(userId, req);
        return {
            message: 'تم تحديث الملف الشخصي بنجاح',
            photo: updatedUser.photo,
            user: updatedUser,
        };
    }
    async updateProfilePhoto(userId, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('يرجى اختيار صورة ورفعها في حقل photo');
        }
        return this.updateProfile(userId, {}, file, req);
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