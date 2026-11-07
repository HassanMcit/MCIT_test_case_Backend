import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  assertRuntimeSchemaReady,
  normalizeDatabaseUrl,
} from './runtime-schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public db!: Pool;

  async onModuleInit() {
    const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
    this.db = new Pool({
      connectionString,
      connectionTimeoutMillis: 30000,
    });

    // Verification only: imports, migrations and seeding never run at startup.
    await assertRuntimeSchemaReady(this.db);
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
        "testId" TEXT NOT NULL,
        module TEXT NOT NULL,
        "pageName" TEXT,
        scenario TEXT NOT NULL,
        "preConditions" TEXT,
        steps TEXT NOT NULL,
        "expectedResult" TEXT NOT NULL,
        "actualResult" TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        severity TEXT DEFAULT NULL,
        notes TEXT,
        "executedAt" TIMESTAMP,
        "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        "updatedById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        "projectId" INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "test_cases_project_testid_idx" ON test_cases (COALESCE("projectId", 0), "testId");

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

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        "projectId" INTEGER,
        "read" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.db.query('ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT NULL;');
    await this.db.query('ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS "updatedById" INTEGER REFERENCES users(id) ON DELETE SET NULL;');
    await this.db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "minTokenIat" BIGINT DEFAULT 0;');
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS user_login_sessions (
        id SERIAL PRIMARY KEY,
        "sessionId" TEXT UNIQUE NOT NULL,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "userName" TEXT,
        email TEXT,
        ip TEXT,
        "macAddress" TEXT,
        "deviceInfo" TEXT,
        location TEXT,
        "userAgent" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastSeenAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "revokedAt" TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        "userName" TEXT,
        email TEXT,
        role TEXT,
        action TEXT NOT NULL,
        "actionCategory" TEXT,
        description TEXT,
        method TEXT,
        endpoint TEXT,
        ip TEXT,
        "macAddress" TEXT,
        location TEXT,
        "deviceInfo" TEXT,
        "userAgent" TEXT,
        status TEXT DEFAULT 'success',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON audit_logs ("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON audit_logs ("userId");
    `);
    await this.db.query('CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, message TEXT NOT NULL, "projectId" INTEGER, "read" BOOLEAN DEFAULT FALSE, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);');
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS quality_applications (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        "nameAr" TEXT,
        category TEXT DEFAULT 'Government Services',
        url TEXT,
        environment TEXT DEFAULT 'Production',
        version TEXT DEFAULT 'v1.0',
        status TEXT DEFAULT 'Healthy',
        "passRate" NUMERIC(5,2) DEFAULT 95.0,
        "suitesCount" INT DEFAULT 100,
        "bugsCount" INT DEFAULT 0,
        "lastCheck" TEXT DEFAULT 'Recently',
        "defaultFunctions" JSONB DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quality_checklists (
        id SERIAL PRIMARY KEY,
        "appId" INT NOT NULL REFERENCES quality_applications(id) ON DELETE CASCADE,
        "testerId" INT REFERENCES users(id) ON DELETE SET NULL,
        "testerName" TEXT,
        "isUpAndRunning" BOOLEAN DEFAULT TRUE,
        "functionsResults" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "passedCount" INT DEFAULT 0,
        "issuesCount" INT DEFAULT 0,
        "performanceScore" NUMERIC(5,2) DEFAULT 100.0,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

}
