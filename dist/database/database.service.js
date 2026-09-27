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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const node_sqlite_1 = require("node:sqlite");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const bcrypt = __importStar(require("bcryptjs"));
let DatabaseService = class DatabaseService {
    onModuleInit() {
        const dbPath = process.env.DATABASE_FILE || path.resolve(process.cwd(), 'qa_test_suite.db');
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        this.db = new node_sqlite_1.DatabaseSync(dbPath);
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
    initTables() {
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

      CREATE TABLE IF NOT EXISTS project_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        assignedAt TEXT DEFAULT (datetime('now')),
        UNIQUE(userId, projectId)
      );
    `);
    }
    seedInitialData() {
        const hassan = this.db
            .prepare('SELECT id FROM users WHERE email = ?')
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
            const defaultPassword = bcrypt.hashSync('password123', 10);
            const insertUser = this.db.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (1, ?, ?, ?, ?)
      `);
            insertUser.run('Hassan Ali', 'h.ali@mcit.gov.eg', defaultPassword, 'admin');
            console.log('✅ Database reset: Only Hassan Ali (id: 1, role: admin) is active.');
        }
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map