import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── POST /api/users (Admin Only) ─────────────────────────────────
  async create(dto: CreateUserDto) {
    const db = this.databaseService.db;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(dto.email);
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
    }

    const hashedPassword = bcrypt.hashSync(dto.password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(dto.name, dto.email, hashedPassword, dto.role);

    const newId = Number(result.lastInsertRowid);
    return this.findOne(newId);
  }

  // ── GET /api/users ───────────────────────────────────────────────
  async findAll() {
    const db = this.databaseService.db;
    return db
      .prepare('SELECT id, name, email, role, createdAt FROM users ORDER BY id ASC')
      .all();
  }

  // ── GET /api/users/:id ───────────────────────────────────────────
  async findOne(id: number) {
    const db = this.databaseService.db;
    const user = db
      .prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?')
      .get(id) as any;

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    const testCaseCount = (
      db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE testerId = ?').get(id) as { count: number }
    ).count;

    return {
      ...user,
      _count: {
        testCases: testCaseCount,
      },
    };
  }
}
