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
    this.runMigrations();
    this.seedInitialData();
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
    }
  }

  public getPersistedPhoto(): string {
    const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
    if (fs.existsSync(avatarFile)) {
      try {
        const saved = fs.readFileSync(avatarFile, 'utf8').trim();
        if (saved && saved.length > 10) {
          return saved;
        }
      } catch (err) {
        console.error('Error reading persisted_avatar.txt:', err);
      }
    }
    return 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
  }

  private runMigrations() {
    const DEFAULT_PHOTO = this.getPersistedPhoto();
    const columns = this.db.prepare("PRAGMA table_info(users)").all() as any[];

    // Add profileImage column if it doesn't exist
    const hasProfileImage = columns.some((c: any) => c.name === 'profileImage');
    if (!hasProfileImage) {
      this.db.exec(`ALTER TABLE users ADD COLUMN profileImage TEXT DEFAULT '${DEFAULT_PHOTO}'`);
      console.log('✅ Migration: Added profileImage column to users table');
    }

    // Add photo column if it doesn't exist
    const hasPhoto = columns.some((c: any) => c.name === 'photo');
    if (!hasPhoto) {
      this.db.exec(`ALTER TABLE users ADD COLUMN photo TEXT DEFAULT '${DEFAULT_PHOTO}'`);
      console.log('✅ Migration: Added photo column to users table');
    }

    // Update any existing users without a photo to the default/persisted image
    this.db.prepare("UPDATE users SET photo = ? WHERE photo IS NULL OR photo = ''").run(DEFAULT_PHOTO);
    this.db.prepare("UPDATE users SET profileImage = ? WHERE profileImage IS NULL OR profileImage = ''").run(DEFAULT_PHOTO);
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'tester',
        photo TEXT DEFAULT 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png',
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

      CREATE TABLE IF NOT EXISTS project_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        assignedAt TEXT DEFAULT (datetime('now')),
        UNIQUE(userId, projectId)
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  private seedInitialData() {
    // Ensure database contains Hassan Ali with id: 1 (admin)
    const defaultPassword = bcrypt.hashSync('Mm$$1020', 10);
    const persistedPhoto = this.getPersistedPhoto();

    const hassan = this.db
      .prepare('SELECT id, photo, profileImage FROM users WHERE email = ?')
      .get('h.ali@mcit.gov.eg') as { id: number; photo?: string; profileImage?: string } | undefined;

    if (!hassan || hassan.id !== 1) {
      this.db.exec('PRAGMA foreign_keys = OFF;');
      this.db.exec('DELETE FROM test_cases;');
      this.db.exec('DELETE FROM projects;');
      this.db.exec('DELETE FROM users;');
      try {
        this.db.exec('DELETE FROM sqlite_sequence WHERE name IN ("users", "projects", "test_cases");');
      } catch {}
      this.db.exec('PRAGMA foreign_keys = ON;');

      const insertUser = this.db.prepare(`
        INSERT INTO users (id, name, email, password, role, photo, profileImage)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `);

      insertUser.run('Hassan Ali', 'h.ali@mcit.gov.eg', defaultPassword, 'admin', persistedPhoto, persistedPhoto);
      console.log('✅ Database reset: Only Hassan Ali (id: 1, role: admin) is active with persistent photo.');
    } else {
      // PRESERVE the existing custom photo if set, otherwise use persisted/default
      const currentPhoto = (hassan.photo && hassan.photo.trim() !== '') ? hassan.photo : persistedPhoto;
      this.db
        .prepare("UPDATE users SET password = ?, photo = ?, profileImage = COALESCE(profileImage, ?) WHERE id = ?")
        .run(defaultPassword, currentPhoto, currentPhoto, hassan.id);
      console.log('✅ Password updated for Hassan Ali (id: 1) - photo preserved.');
    }
  }
}
