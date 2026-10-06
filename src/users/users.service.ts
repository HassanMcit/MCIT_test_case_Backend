import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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

  async serveUserPhoto(userId: number, res: any) {
    const db = this.databaseService.db;
    const user = db
      .prepare('SELECT id, name, photo, profileImage FROM users WHERE id = ?')
      .get(userId) as any;

    const DEFAULT_PHOTO_URL = DatabaseService.DEFAULT_PHOTO_URL;

    if (!user) {
      return res.redirect(DEFAULT_PHOTO_URL);
    }

    const rawPhoto = user.photo || user.profileImage;
    if (!rawPhoto || typeof rawPhoto !== 'string' || rawPhoto.trim() === '') {
      return res.redirect(DEFAULT_PHOTO_URL);
    }

    // Ignore dummy 1x1 test pixels
    if (rawPhoto.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk')) {
      return res.redirect(DEFAULT_PHOTO_URL);
    }

    // 1. If it's a Base64 data URL, decode and stream directly with proper image MIME type
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

    // 2. If it's an external URL (R2, Cloudinary, S3, etc.)
    if (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) {
      if (rawPhoto.includes(`/api/users/${userId}/photo`)) {
        return res.redirect(DEFAULT_PHOTO_URL);
      }
      return res.redirect(rawPhoto);
    }

    // 3. If it's a file path in uploads
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

  // ── POST /api/users (Admin Only) ─────────────────────────────────
  async create(dto: CreateUserDto, req?: any) {
    const db = this.databaseService.db;

    const existingEmail = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
      .get(dto.email.trim());
    if (existingEmail) {
      throw new ConflictException('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
    }

    // Extract User ID (Employee ID / الرقم الوظيفي)
    const rawId = dto.id ?? dto.empId;
    let targetId: number | null = null;

    if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
      if (typeof rawId === 'number') {
        targetId = Math.floor(rawId);
      } else {
        const cleanDigits = String(rawId).replace(/\D/g, '');
        targetId = cleanDigits ? parseInt(cleanDigits, 10) : NaN;
      }

      if (isNaN(targetId) || targetId <= 0) {
        throw new BadRequestException('الرقم الوظيفي (id) يجب أن يكون رقماً صحيحاً موجباً');
      }

      const existingId = db.prepare('SELECT id, name FROM users WHERE id = ?').get(targetId) as any;
      if (existingId) {
        throw new ConflictException(`الرقم الوظيفي #${targetId} مسجل بالفعل للمستخدم (${existingId.name})`);
      }
    }

    const hashedPassword = bcrypt.hashSync(dto.password, 10);
    const userRole = dto.role || 'tester';
    const defaultPhoto = DatabaseService.DEFAULT_PHOTO_URL;

    let newId: number;
    if (targetId !== null) {
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, photo, profileImage)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(targetId, dto.name.trim(), dto.email.trim(), hashedPassword, userRole, defaultPhoto, defaultPhoto);
      newId = targetId;
    } else {
      const result = db.prepare(`
        INSERT INTO users (name, email, password, role, photo, profileImage)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(dto.name.trim(), dto.email.trim(), hashedPassword, userRole, defaultPhoto, defaultPhoto);
      newId = Number(result.lastInsertRowid);
    }

    return this.findOne(newId, req);
  }

  // ── GET /api/users (Admin Only - with assigned projects) ──────────
  async findAll(req?: any) {
    const db = this.databaseService.db;
    const users = db
      .prepare('SELECT id, name, email, role, photo, profileImage, createdAt, updatedAt FROM users ORDER BY id ASC')
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

    return users.map((u) => {
      const assignedProjects = stmtProjects.all(u.id).map((p: any) => ({
        ...p,
        userId: u.id,
      }));
      const testCasesCount = (stmtCounts.get(u.id) as { count: number }).count;
      const photoUrl = this.databaseService.resolvePhotoUrl(u, req);
      return {
        id: u.id,
        userId: u.id,
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

  // ── GET /api/users/all (Public - all users, all roles) ─────────────
  async findAllBasic(req?: any) {
    const db = this.databaseService.db;
    const users = db
      .prepare('SELECT id, name, email, role, photo, profileImage FROM users ORDER BY name ASC')
      .all() as any[];

    return users.map((u) => {
      const photoUrl = this.databaseService.resolvePhotoUrl(u, req);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        photo: photoUrl,
      };
    });
  }

  // ── GET /api/users/:id ───────────────────────────────────────────
  async findOne(id: number, req?: any) {
    const db = this.databaseService.db;
    const user = db
      .prepare('SELECT id, name, email, role, photo, profileImage, createdAt, updatedAt FROM users WHERE id = ?')
      .get(id) as any;

    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${id} غير موجود`);
    }

    const testCaseCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?')
        .get(id) as { count: number }
    ).count;

    const assignedProjects = (
      db
        .prepare(`
          SELECT p.id, p.name, p.description, p.environment, p.status, pa.assignedAt
          FROM projects p
          INNER JOIN project_assignments pa ON p.id = pa.projectId
          WHERE pa.userId = ?
          ORDER BY pa.assignedAt DESC
        `)
        .all(id) as any[]
    ).map((p) => ({
      ...p,
      userId: user.id,
    }));

    const photoUrl = this.databaseService.resolvePhotoUrl(user, req);

    return {
      id: user.id,
      userId: user.id,
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

  // ── PATCH /api/users/:id (Admin Update User) ──────────────────────
  async updateUserByAdmin(userId: number, dto: any, req?: any) {
    const db = this.databaseService.db;
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${userId} غير موجود`);
    }
    const updates: string[] = [];
    const values: any[] = [];
    if (dto.name && dto.name.trim() !== '') {
      updates.push('name = ?');
      values.push(dto.name.trim());
    }
    if (dto.role && ['admin', 'tester', 'user'].includes(dto.role)) {
      updates.push('role = ?');
      values.push(dto.role);
    }
    if (updates.length > 0) {
      updates.push("updatedAt = datetime('now')");
      values.push(userId);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findOne(userId, req);
  }

  // ── DELETE /api/users/:id (Admin removes regular user only) ───────
  async remove(userId: number, currentUser?: any) {
    const db = this.databaseService.db;
    const targetUser = db.prepare('SELECT id, name, role, email FROM users WHERE id = ?').get(userId) as any;

    if (!targetUser) {
      throw new NotFoundException(`المستخدم رقم #${userId} غير موجود`);
    }

    // Strict Rule: Admin CANNOT delete another admin under any circumstances
    if (targetUser.role === 'admin') {
      throw new ForbiddenException('غير مسموح نهائياً بحذف حسابات مديري النظام (Admin). صلاحية الحذف متاحة لمدير النظام على المستخدمين فقط');
    }

    if (currentUser && currentUser.id === targetUser.id) {
      throw new BadRequestException('لا يمكن للمسؤول حذف حسابه الشخصي');
    }

    // Clean up project assignments and test cases before deleting user
    db.prepare('DELETE FROM project_assignments WHERE userId = ?').run(userId);
    db.prepare('UPDATE test_cases SET testerId = NULL WHERE testerId = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return {
      message: `تم حذف المستخدم #${userId} (${targetUser.name}) بنجاح`,
      userId: userId,
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

    let photoPayload: string | null = null;
    if (file) {
      try {
        if (file.buffer) {
          const mime = file.mimetype || 'image/png';
          photoPayload = `data:${mime};base64,${file.buffer.toString('base64')}`;
        } else {
          const filePath = file.path || path.join(process.cwd(), 'uploads', file.filename);
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            const mime = file.mimetype || 'image/png';
            photoPayload = `data:${mime};base64,${buf.toString('base64')}`;
          }
        }
      } catch (err) {
        console.error('Error processing uploaded photo file:', err);
      }

      if (!photoPayload && file.filename) {
        photoPayload = `uploads/${file.filename}`;
      }
    } else if (dto?.photo !== undefined && dto.photo.trim() !== '') {
      photoPayload = dto.photo.trim();
    }

    if (photoPayload) {
      try {
        const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
        fs.writeFileSync(avatarFile, photoPayload, 'utf8');
      } catch (err) {
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
      userId: updatedUser.id,
      photo: updatedUser.photo,
      user: updatedUser,
    };
  }

  // ── Upload/Update Profile Photo via FormData ──────────────────────
  async updateProfilePhoto(userId: number, file: Express.Multer.File, req: any) {
    if (!file) {
      throw new BadRequestException('يرجى اختيار صورة ورفعها في حقل photo');
    }
    return this.updateProfile(userId, {}, file, req);
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
      userId: user.id,
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
      userId: userId,
      projectId: projectId,
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
        userId: userId,
        stats: { total, passed, failed, pending, successRate },
      };
    });
  }
}
