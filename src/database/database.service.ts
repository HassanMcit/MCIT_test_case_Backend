import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public db!: Pool;

  async onModuleInit() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await this.db.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL');
    } catch (err) {
      console.error('❌ Failed to connect to PostgreSQL', err);
    }

    await this.initTables();
    // await this.runMigrations();
    await this.seedInitialData();
  }

  async onModuleDestroy() {
    if (this.db) {
      await this.db.end();
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

  private async runMigrations() {
    const DEFAULT_PHOTO = this.getPersistedPhoto();
    const columnsResult = await this.db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const columns = columnsResult.rows;

    // Add profileImage column if it doesn't exist
    const hasProfileImage = columns.some((c: any) => c.column_name === 'profileimage');
    if (!hasProfileImage) {
      await this.db.query(`ALTER TABLE users ADD COLUMN "profileImage" TEXT`);
      console.log('✅ Migration: Added profileImage column to users table');
    }

    // Add photo column if it doesn't exist
    const hasPhoto = columns.some((c: any) => c.column_name === 'photo');
    if (!hasPhoto) {
      await this.db.query(`ALTER TABLE users ADD COLUMN photo TEXT`);
      console.log('✅ Migration: Added photo column to users table');
    }

    // Update any existing users with null, empty, or dummy 1x1 photo to the default image
    await this.db.query(
      "UPDATE users SET photo = $1 WHERE photo IS NULL OR photo = '' OR photo LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'",
      [DEFAULT_PHOTO]
    );
    await this.db.query(
      "UPDATE users SET profileImage = $1 WHERE profileImage IS NULL OR profileImage = '' OR profileImage LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'",
      [DEFAULT_PHOTO]
    );
  }

  private async initTables() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'tester',
          "profileImage" TEXT DEFAULT 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png',
        photo TEXT DEFAULT 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        environment TEXT DEFAULT 'staging',
        status TEXT DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_cases (
        id SERIAL PRIMARY KEY,
        "testId" TEXT UNIQUE NOT NULL,
        module TEXT NOT NULL,
        "pageName" TEXT,
        scenario TEXT NOT NULL,
        "preConditions" TEXT,
        steps TEXT NOT NULL,
        "expectedResult" TEXT NOT NULL,
        "actualResult" TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        notes TEXT,
        "executedAt" TIMESTAMP,
        "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        "projectId" INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_assignments (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "assignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "projectId")
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async seedInitialData() {
    // Ensure database contains Hassan Ali with id: 1 (admin)
    const defaultPassword = bcrypt.hashSync('Mm$$1020', 10);
    const persistedPhoto = this.getPersistedPhoto();

    const hassanResult = await this.db.query('SELECT id, photo, "profileImage" FROM users WHERE email = $1', ['h.ali@mcit.gov.eg']);
    const hassan = hassanResult.rows[0] as { id: number; photo?: string; profileImage?: string } | undefined;

    if (!hassan || hassan.id !== 1) {
      await this.db.query('TRUNCATE TABLE test_cases CASCADE;');
      await this.db.query('TRUNCATE TABLE projects CASCADE;');
      await this.db.query('TRUNCATE TABLE users CASCADE;');

      await this.db.query(`
        INSERT INTO users (id, name, email, password, role, photo, "profileImage")
        VALUES (1, $1, $2, $3, $4, $5, $6)
      `, ['Hassan Ali', 'h.ali@mcit.gov.eg', defaultPassword, 'admin', persistedPhoto, persistedPhoto]);
      await this.db.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id),0) + 1, false) FROM users;`);

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
      await this.db.query(
        'UPDATE users SET password = $1, photo = $2, "profileImage" = COALESCE("profileImage", $3) WHERE id = $4',
        [defaultPassword, currentPhoto, currentPhoto, hassan.id]
      );
      console.log('✅ Password updated for Hassan Ali (id: 1) - photo preserved.');
    }
  }
}
