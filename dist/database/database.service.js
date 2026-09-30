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
const node_sqlite_1 = require("node:sqlite");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const bcrypt = __importStar(require("bcryptjs"));
let DatabaseService = DatabaseService_1 = class DatabaseService {
    onModuleInit() {
        const dbPath = process.env.DATABASE_FILE || path.resolve(process.cwd(), 'qa_test_suite.db');
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        this.db = new node_sqlite_1.DatabaseSync(dbPath);
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
    runMigrations() {
        const DEFAULT_PHOTO = this.getPersistedPhoto();
        const columns = this.db.prepare("PRAGMA table_info(users)").all();
        const hasProfileImage = columns.some((c) => c.name === 'profileImage');
        if (!hasProfileImage) {
            this.db.exec(`ALTER TABLE users ADD COLUMN profileImage TEXT DEFAULT '${DEFAULT_PHOTO}'`);
            console.log('✅ Migration: Added profileImage column to users table');
        }
        const hasPhoto = columns.some((c) => c.name === 'photo');
        if (!hasPhoto) {
            this.db.exec(`ALTER TABLE users ADD COLUMN photo TEXT DEFAULT '${DEFAULT_PHOTO}'`);
            console.log('✅ Migration: Added photo column to users table');
        }
        this.db
            .prepare("UPDATE users SET photo = ? WHERE photo IS NULL OR photo = '' OR photo LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'")
            .run(DEFAULT_PHOTO);
        this.db
            .prepare("UPDATE users SET profileImage = ? WHERE profileImage IS NULL OR profileImage = '' OR profileImage LIKE '%iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk%'")
            .run(DEFAULT_PHOTO);
    }
    initTables() {
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
    seedInitialData() {
        const defaultPassword = bcrypt.hashSync('Mm$$1020', 10);
        const persistedPhoto = this.getPersistedPhoto();
        const hassan = this.db
            .prepare('SELECT id, photo, profileImage FROM users WHERE email = ?')
            .get('h.ali@mcit.gov.eg');
        if (!hassan || hassan.id !== 1) {
            this.db.exec('PRAGMA foreign_keys = OFF;');
            this.db.exec('DELETE FROM test_cases;');
            this.db.exec('DELETE FROM projects;');
            this.db.exec('DELETE FROM users;');
            try {
                this.db.exec('DELETE FROM sqlite_sequence WHERE name IN ("users", "projects", "test_cases");');
            }
            catch { }
            this.db.exec('PRAGMA foreign_keys = ON;');
            const insertUser = this.db.prepare(`
        INSERT INTO users (id, name, email, password, role, photo, profileImage)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `);
            insertUser.run('Hassan Ali', 'h.ali@mcit.gov.eg', defaultPassword, 'admin', persistedPhoto, persistedPhoto);
            console.log('✅ Database reset: Only Hassan Ali (id: 1, role: admin) is active with persistent photo.');
        }
        else {
            const isDummy = hassan.photo &&
                hassan.photo.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk');
            const currentPhoto = !isDummy && hassan.photo && hassan.photo.trim() !== ''
                ? hassan.photo
                : persistedPhoto;
            this.db
                .prepare("UPDATE users SET password = ?, photo = ?, profileImage = COALESCE(profileImage, ?) WHERE id = ?")
                .run(defaultPassword, currentPhoto, currentPhoto, hassan.id);
            console.log('✅ Password updated for Hassan Ali (id: 1) - photo preserved.');
        }
    }
};
exports.DatabaseService = DatabaseService;
DatabaseService.DEFAULT_PHOTO_URL = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map