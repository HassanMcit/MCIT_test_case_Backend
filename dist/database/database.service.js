"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const bcrypt = __importStar(require("bcryptjs"));
let DatabaseService = DatabaseService_1 = class DatabaseService {
    async onModuleInit() {
        this.db = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
        });
        try {
            await this.db.query('SELECT 1');
            console.log('✅ Connected to PostgreSQL');
        }
        catch (err) {
            console.error('❌ Failed to connect to PostgreSQL', err);
        }
        await this.initTables();
        await this.seedInitialData();
    }
    async onModuleDestroy() {
        if (this.db) {
            await this.db.end();
        }
    }
    getPersistedPhoto() {
        const avatarFile = path.resolve(process.cwd(), 'persisted_avatar.txt');
        if (fs.existsSync(avatarFile)) {
            try {
                const saved = fs.readFileSync(avatarFile, 'utf8').trim();
                if (saved &&
                    saved.length > 10 &&
                    !saved.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk')) {
                    return saved;
                }
            }
            catch (err) {
                console.error('Error reading persisted_avatar.txt:', err);
            }
        }
        return DatabaseService_1.DEFAULT_PHOTO_URL;
    }
    resolvePhotoUrl(user, req) {
        if (!user)
            return DatabaseService_1.DEFAULT_PHOTO_URL;
        const rawPhoto = user.photo || user.profileImage;
        if (!rawPhoto || typeof rawPhoto !== 'string' || rawPhoto.trim() === '') {
            return DatabaseService_1.DEFAULT_PHOTO_URL;
        }
        if (rawPhoto.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk')) {
            return DatabaseService_1.DEFAULT_PHOTO_URL;
        }
        if ((rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) &&
            !rawPhoto.includes('localhost') &&
            !rawPhoto.includes('127.0.0.1') &&
            !rawPhoto.includes('mcit-test-case-backend.onrender.com')) {
            return rawPhoto;
        }
        const host = req?.get ? req.get('host') : req?.headers?.host;
        const isHttps = req?.secure ||
            req?.headers?.['x-forwarded-proto'] === 'https' ||
            (typeof host === 'string' && host.includes('onrender.com'));
        const protocol = isHttps ? 'https' : (req?.protocol || 'http');
        const baseUrl = process.env.BACKEND_URL ||
            (host ? `${protocol}://${host}` : 'https://mcit-test-case-backend.onrender.com');
        const v = user.updatedAt ? new Date(user.updatedAt).getTime() : '';
        const vParam = v ? `?v=${v}` : '';
        return `${baseUrl}/api/users/${user.id}/photo${vParam}`;
    }
    async runMigrations() {
        const DEFAULT_PHOTO = this.getPersistedPhoto();
        const columnsResult = await this.db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        const columns = columnsResult.rows;
        const hasProfileImage = columns.some((c) => c.column_name === 'profileimage');
        if (!hasProfileImage) {
            await this.db.query(`ALTER TABLE users ADD COLUMN "profileImage" TEXT`);
            console.log('✅ Migration: Added profileImage column to users table');
        }
        const hasPhoto = columns.some((c) => c.column_name === 'photo');
        if (!hasPhoto) {
            await this.db.query(`ALTER TABLE users ADD COLUMN photo TEXT`);
            console.log('✅ Migration: Added photo column to users table');
        }
        await this.db.query("UPDATE users SET photo = $1 WHERE photo IS NULL OR photo = '' OR photo LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'", [DEFAULT_PHOTO]);
        await this.db.query('ALTER TABLE test_cases DROP CONSTRAINT IF EXISTS "test_cases_testId_key"');
        await this.db.query('CREATE UNIQUE INDEX IF NOT EXISTS "test_cases_project_testid_idx" ON test_cases (COALESCE("projectId", 0), "testId")');
    }
    async initTables() {
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
        notes TEXT,
        "executedAt" TIMESTAMP,
        "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
    `);
    }
    async seedInitialData() {
        const defaultPassword = bcrypt.hashSync('Mm$$1020', 10);
        const persistedPhoto = this.getPersistedPhoto();
        const hassanResult = await this.db.query('SELECT id, photo, "profileImage" FROM users WHERE email = $1', ['h.ali@mcit.gov.eg']);
        const hassan = hassanResult.rows[0];
        if (!hassan) {
            await this.db.query(`
        INSERT INTO users (id, name, email, password, role, photo, "profileImage")
        VALUES (1, $1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, ['Hassan Ali', 'h.ali@mcit.gov.eg', defaultPassword, 'admin', persistedPhoto, persistedPhoto]);
            await this.db.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce((SELECT max(id) FROM users),0) + 1, false);`);
            console.log('✅ Default admin user Hassan Ali initialized.');
        }
        else {
            const isDummy = hassan.photo &&
                hassan.photo.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk');
            const currentPhoto = !isDummy && hassan.photo && hassan.photo.trim() !== ''
                ? hassan.photo
                : persistedPhoto;
            await this.db.query('UPDATE users SET photo = $1, "profileImage" = COALESCE("profileImage", $2) WHERE id = $3', [currentPhoto, currentPhoto, hassan.id]);
            console.log('✅ Hassan Ali (id: 1) exists - password and settings preserved.');
        }
    }
};
exports.DatabaseService = DatabaseService;
DatabaseService.DEFAULT_PHOTO_URL = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map