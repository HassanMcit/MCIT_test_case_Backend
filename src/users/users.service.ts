import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  private getPhotoDataUrl(file: Express.Multer.File, req: any): string {
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
    } catch (err) {
      console.error('Error generating base64 for uploaded photo:', err);
    }

    const host = req?.get ? req.get('host') : req?.headers?.host || 'localhost:3001';
    const isHttps = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https' || (typeof host === 'string' && host.includes('onrender.com'));
    const protocol = isHttps ? 'https' : (req?.protocol || 'http');
    const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
    return `${baseUrl}/uploads/${file.filename}`;
  }

  // ── POST /api/users (Admin Only) ─────────────────────────────────
  async create(dto: CreateUserDto) {
    const db = this.databaseService.db;

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(dto.email);
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
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

  // ── GET /api/users (Admin Only - with assigned projects) ──────────
  async findAll() {
    const db = this.databaseService.db;
    const users = db
      .prepare('SELECT id, name, email, role, photo, createdAt FROM users ORDER BY id ASC')
      .all() as any[];

    const stmtProjects = db.prepare(`
      SELECT p.id, p.name, p.description, p.environment, p.status, pa.assignedAt
      FROM projects p
      INNER JOIN project_assignments pa ON p.id = pa.projectId
      WHERE pa.userId = ?
      ORDER BY pa.assignedAt DESC
    `);

    const stmtCounts = db.prepare(
      'SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?',
    );

    const defaultPhoto = this.databaseService.getPersistedPhoto();
    return users.map((u) => {
      const assignedProjects = stmtProjects.all(u.id);
      const testCasesCount = (stmtCounts.get(u.id) as { count: number }).count;
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

  // ── GET /api/users/:id ───────────────────────────────────────────
  async findOne(id: number) {
    const db = this.databaseService.db;
    const user = db
      .prepare('SELECT id, name, email, role, photo, createdAt FROM users WHERE id = ?')
      .get(id) as any;

    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${id} غير موجود`);
    }

    const testCaseCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?')
        .get(id) as { count: number }
    ).count;

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

  // ── PATCH /api/users/profile (Update own profile) ─────────────────
  async updateProfile(userId: number, dto: UpdateProfileDto, file?: Express.Multer.File, req?: any) {
    const db = this.databaseService.db;

    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(userId) as any;

    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${userId} غير موجود`);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (dto?.name !== undefined && dto.name.trim() !== '') {
      updates.push('name = ?');
      values.push(dto.name.trim());
    }

    if (file && req) {
      const photoUrl = this.getPhotoDataUrl(file, req);

      try {
        const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
        fs.writeFileSync(avatarFile, photoUrl, 'utf8');
      } catch (err) {
        console.error('Error writing persisted_avatar.txt:', err);
      }

      updates.push('photo = ?');
      values.push(photoUrl);
      updates.push('profileImage = ?');
      values.push(photoUrl);
    } else if (dto?.photo !== undefined) {
      try {
        const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
        fs.writeFileSync(avatarFile, dto.photo, 'utf8');
      } catch (err) {}
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

  // ── Upload/Update Profile Photo via FormData ──────────────────────
  async updateProfilePhoto(userId: number, file: Express.Multer.File, req: any) {
    if (!file) {
      throw new BadRequestException('يرجى اختيار صورة ورفعها في حقل photo');
    }

    const photoUrl = this.getPhotoDataUrl(file, req);

    try {
      const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
      fs.writeFileSync(avatarFile, photoUrl, 'utf8');
    } catch (err) {
      console.error('Error writing persisted_avatar.txt:', err);
    }

    const db = this.databaseService.db;
    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(userId) as any;

    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${userId} غير موجود`);
    }

    db.prepare(
      "UPDATE users SET photo = ?, profileImage = ?, updatedAt = datetime('now') WHERE id = ?"
    ).run(photoUrl, photoUrl, userId);

    const updatedUser = await this.findOne(userId);

    return {
      message: 'تم تحديث الصورة الشخصية بنجاح',
      photo: photoUrl,
      user: updatedUser,
    };
  }

  // ── POST /api/users/:id/assign-project (Admin Only) ──────────────
  async assignProject(userId: number, dto: AssignProjectDto) {
    const db = this.databaseService.db;

    // Check user exists
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${userId} غير موجود`);
    }

    // Check project exists
    const project = db.prepare('SELECT id, name, environment, status FROM projects WHERE id = ?').get(dto.projectId) as any;
    if (!project) {
      throw new NotFoundException(`المشروع رقم #${dto.projectId} غير موجود`);
    }

    // Check if already assigned
    const existing = db
      .prepare('SELECT id FROM project_assignments WHERE userId = ? AND projectId = ?')
      .get(userId, dto.projectId);
    if (existing) {
      throw new ConflictException(`المشروع "${project.name}" مسند بالفعل للمستخدم "${user.name}"`);
    }

    // Insert assignment
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

  // ── DELETE /api/users/:id/assign-project/:projectId (Admin Only) ─
  async unassignProject(userId: number, projectId: number) {
    const db = this.databaseService.db;
    const existing = db
      .prepare('SELECT id FROM project_assignments WHERE userId = ? AND projectId = ?')
      .get(userId, projectId);

    if (!existing) {
      throw new NotFoundException('هذا الإسناد غير موجود بالفعل');
    }

    db.prepare('DELETE FROM project_assignments WHERE userId = ? AND projectId = ?').run(userId, projectId);
    return {
      message: `تم إلغاء إسناد المشروع #${projectId} من المستخدم #${userId} بنجاح`,
    };
  }

  // ── GET /api/users/my-assigned-projects (For logged-in User) ─────
  async getMyAssignedProjects(userId: number) {
    const db = this.databaseService.db;

    const stmt = db.prepare(`
      SELECT p.*, pa.assignedAt
      FROM projects p
      INNER JOIN project_assignments pa ON p.id = pa.projectId
      WHERE pa.userId = ?
      ORDER BY pa.assignedAt DESC
    `);

    const projects = stmt.all(userId) as any[];

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

      return {
        ...p,
        stats: { total, passed, failed, pending, successRate },
      };
    });
  }
}
