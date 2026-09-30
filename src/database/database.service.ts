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

  public static readonly DEFAULT_PHOTO_URL =
    'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

  public getPersistedPhoto(): string {
    const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
    if (fs.existsSync(avatarFile)) {
      try {
        const saved = fs.readFileSync(avatarFile, 'utf8').trim();
        // Ignore dummy 1x1 test pixels
        if (
          saved &&
          saved.length > 10 &&
          !saved.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk')
        ) {
          return saved;
        }
      } catch (err) {
        console.error('Error reading persisted_avatar.txt:', err);
      }
    }
    return DatabaseService.DEFAULT_PHOTO_URL;
  }

  public resolvePhotoUrl(
    user: { id: number; photo?: string; profileImage?: string; updatedAt?: string } | undefined,
    req?: any,
  ): string {
    if (!user) return DatabaseService.DEFAULT_PHOTO_URL;

    const rawPhoto = user.photo || user.profileImage;
    if (!rawPhoto || typeof rawPhoto !== 'string' || rawPhoto.trim() === '') {
      return DatabaseService.DEFAULT_PHOTO_URL;
    }

    // Ignore dummy 1x1 base64 string
    if (rawPhoto.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk')) {
      return DatabaseService.DEFAULT_PHOTO_URL;
    }

    // If it's already an external R2 / 3rd party URL
    if (
      (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) &&
      !rawPhoto.includes('localhost') &&
      !rawPhoto.includes('127.0.0.1') &&
      !rawPhoto.includes('mcit-test-case-backend.onrender.com')
    ) {
      return rawPhoto;
    }

    // Determine host & protocol
    const host = req?.get ? req.get('host') : req?.headers?.host;
    const isHttps =
      req?.secure ||
      req?.headers?.['x-forwarded-proto'] === 'https' ||
      (typeof host === 'string' && host.includes('onrender.com'));
    const protocol = isHttps ? 'https' : (req?.protocol || 'http');
    const baseUrl =
      process.env.BACKEND_URL ||
      (host ? `${protocol}://${host}` : 'https://mcit-test-case-backend.onrender.com');

    const v = user.updatedAt ? new Date(user.updatedAt).getTime() : '';
    const vParam = v ? `?v=${v}` : '';

    return `${baseUrl}/api/users/${user.id}/photo${vParam}`;
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

    // Update any existing users with null, empty, or dummy 1x1 photo to the default image
    this.db
      .prepare(
        "UPDATE users SET photo = ? WHERE photo IS NULL OR photo = '' OR photo LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'",
      )
      .run(DEFAULT_PHOTO);
    this.db
      .prepare(
        "UPDATE users SET profileImage = ? WHERE profileImage IS NULL OR profileImage = '' OR profileImage LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'",
      )
      .run(DEFAULT_PHOTO);
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
      const isDummy =
        hassan.photo &&
        hassan.photo.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk');
      const currentPhoto =
        !isDummy && hassan.photo && hassan.photo.trim() !== ''
          ? hassan.photo
          : persistedPhoto;
      this.db
        .prepare("UPDATE users SET password = ?, photo = ?, profileImage = COALESCE(profileImage, ?) WHERE id = ?")
        .run(defaultPassword, currentPhoto, currentPhoto, hassan.id);
      console.log('✅ Password updated for Hassan Ali (id: 1) - photo preserved.');
    }
  }
}
