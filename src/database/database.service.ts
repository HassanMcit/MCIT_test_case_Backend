import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public db!: DatabaseSync;

  onModuleInit() {
    const dbPath = process.env.DATABASE_FILE || path.resolve(process.cwd(), 'qa_test_suite.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);

    // Optimize settings
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');

    this.initTables();
    this.seedInitialData();
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
    }
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'tester',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        environment TEXT DEFAULT 'staging',
        status TEXT DEFAULT 'active',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS test_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        testId TEXT UNIQUE NOT NULL,
        module TEXT NOT NULL,
        pageName TEXT,
        scenario TEXT NOT NULL,
        preConditions TEXT,
        steps TEXT NOT NULL,
        expectedResult TEXT NOT NULL,
        actualResult TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        notes TEXT,
        executedAt TEXT,
        testerId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        projectId INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  private seedInitialData() {
    // Ensure database contains ONLY Hassan Ali with id: 1 (admin)
    const hassan = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get('h.ali@mcit.gov.eg') as { id: number } | undefined;

    if (!hassan || hassan.id !== 1) {
      this.db.exec('PRAGMA foreign_keys = OFF;');
      this.db.exec('DELETE FROM test_cases;');
      this.db.exec('DELETE FROM projects;');
      this.db.exec('DELETE FROM users;');
      try {
        this.db.exec('DELETE FROM sqlite_sequence WHERE name IN ("users", "projects", "test_cases");');
      } catch {}
      this.db.exec('PRAGMA foreign_keys = ON;');

      const defaultPassword = bcrypt.hashSync('password123', 10);
      const insertUser = this.db.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (1, ?, ?, ?, ?)
      `);

      insertUser.run('Hassan Ali', 'h.ali@mcit.gov.eg', defaultPassword, 'admin');
      console.log('✅ Database reset: Only Hassan Ali (id: 1, role: admin) is active.');
    }
  }
}
