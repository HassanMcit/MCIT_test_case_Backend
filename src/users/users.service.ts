import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── GET /api/users ───────────────────────────────────────────────
  async findAll() {
    const db = this.databaseService.db;
    return db
      .prepare('SELECT id, name, email, role, createdAt FROM users ORDER BY name ASC')
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
