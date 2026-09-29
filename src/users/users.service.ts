import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

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

    const defaultPhoto = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
    const result = db
      .prepare(`
        INSERT INTO users (name, email, password, role, photo)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(dto.name, dto.email, hashedPassword, userRole, defaultPhoto);

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

    const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
    return users.map((u) => {
      const assignedProjects = stmtProjects.all(u.id);
      const testCasesCount = (stmtCounts.get(u.id) as { count: number }).count;
      const userPhoto = u.photo || DEFAULT_PHOTO;
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

    const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
    const userPhoto = user.photo || DEFAULT_PHOTO;
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
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const db = this.databaseService.db;

    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(userId) as any;

    if (!user) {
      throw new NotFoundException(`المستخدم رقم #${userId} غير موجود`);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      values.push(dto.name);
    }

    if (dto.photo !== undefined) {
      updates.push('photo = ?');
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
