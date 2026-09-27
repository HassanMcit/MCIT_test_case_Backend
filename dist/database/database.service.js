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
    `);
    }
    seedInitialData() {
        const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        if (userCount === 0) {
            const defaultPassword = bcrypt.hashSync('password123', 10);
            const insertUser = this.db.prepare(`
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
      `);
            insertUser.run('Karim Mansour', 'karim@mcit.gov.eg', defaultPassword, 'lead');
            insertUser.run('Sara Fouad', 'sara@mcit.gov.eg', defaultPassword, 'tester');
            insertUser.run('Ahmed El-Shenawy', 'ahmed@mcit.gov.eg', defaultPassword, 'tester');
        }
        const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
        if (projectCount === 0) {
            const insertProject = this.db.prepare(`
        INSERT INTO projects (name, description, environment, status)
        VALUES (?, ?, ?, ?)
      `);
            insertProject.run('البوابة الرقمية المصرية', 'National digital government services portal', 'production', 'active');
            insertProject.run('منظومة الرقابة على الاتصالات', 'Telecom quality monitoring and compliance', 'production', 'active');
            insertProject.run('نظام خدمات البريد المصري', 'Egypt Post digital workflow automation', 'staging', 'active');
            insertProject.run('بوابة التوقيع الرقمي الموحد', 'PKI, e-signatures, and identity verification', 'production', 'active');
            insertProject.run('منصة الهوية الرقمية الوطنية', 'Unified national identity and verification', 'staging', 'active');
            insertProject.run('بوابة الخدمات الحكومية الموحدة', 'One-stop shop for ministry and citizen services', 'production', 'active');
        }
        const testCaseCount = this.db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count;
        if (testCaseCount === 0) {
            const insertTC = this.db.prepare(`
        INSERT INTO test_cases (
          testId, module, pageName, scenario, preConditions, steps,
          expectedResult, actualResult, priority, status, notes, executedAt, testerId, projectId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const now = new Date().toISOString();
            const seedTCs = [
                {
                    testId: 'TC-8492',
                    module: 'Authentication',
                    pageName: 'Login Page',
                    scenario: 'Validate SSO token via SMS 2FA',
                    preConditions: 'User has active account with verified phone number',
                    steps: JSON.stringify(['Navigate to /login', 'Enter civil ID and password', 'Receive OTP via SMS', 'Submit OTP']),
                    expectedResult: 'User session created, JWT returned, redirected to dashboard',
                    actualResult: 'Redirected successfully to dashboard with 200 OK',
                    priority: 'critical',
                    status: 'passed',
                    notes: 'Tested on Chrome & Edge',
                    executedAt: now,
                    testerId: 1,
                    projectId: 1,
                },
                {
                    testId: 'TC-8493',
                    module: 'Payments',
                    pageName: 'Checkout Screen',
                    scenario: 'Payment gateway timeout and auto-reversal',
                    preConditions: 'Payment session initiated',
                    steps: JSON.stringify(['Select Fawry/Card', 'Simulate socket timeout after 15s', 'Check ledger for reversal']),
                    expectedResult: 'System cancels authorization and refunds transaction within 30s',
                    actualResult: 'Gateway timed out but ledger stayed in PENDING state',
                    priority: 'high',
                    status: 'failed',
                    notes: 'Reproduced on staging env',
                    executedAt: now,
                    testerId: 2,
                    projectId: 1,
                },
                {
                    testId: 'TC-8494',
                    module: 'Civil Registry',
                    pageName: 'Citizen Registration',
                    scenario: 'Duplicate national ID constraint check',
                    preConditions: 'National ID 29012345678901 exists in database',
                    steps: JSON.stringify(['Open Registration form', 'Enter duplicate National ID', 'Click Submit']),
                    expectedResult: 'Form displays validation error and prevents duplicate registration',
                    actualResult: 'Validation error displayed as expected',
                    priority: 'critical',
                    status: 'passed',
                    notes: 'Database unique constraint validated',
                    executedAt: now,
                    testerId: 3,
                    projectId: 6,
                },
                {
                    testId: 'TC-8495',
                    module: 'Profile',
                    pageName: 'User Profile Settings',
                    scenario: 'Profile image upload size limit (10MB)',
                    preConditions: 'User logged in',
                    steps: JSON.stringify(['Go to Profile', 'Select image > 10MB', 'Attempt upload']),
                    expectedResult: 'Upload rejected with user-friendly error message',
                    actualResult: null,
                    priority: 'medium',
                    status: 'pending',
                    notes: 'Awaiting updated file upload component',
                    executedAt: null,
                    testerId: 2,
                    projectId: 6,
                },
                {
                    testId: 'TC-8496',
                    module: 'Authentication',
                    pageName: '2FA Verification',
                    scenario: 'SMS OTP delivery under high load',
                    preConditions: '1000 concurrent virtual users configured',
                    steps: JSON.stringify(['Trigger batch login requests', 'Measure OTP arrival time']),
                    expectedResult: 'Average delivery time < 5 seconds with 99% delivery rate',
                    actualResult: 'Average time 3.4 seconds, 100% delivered',
                    priority: 'low',
                    status: 'passed',
                    notes: 'Tested in load test environment',
                    executedAt: now,
                    testerId: 1,
                    projectId: 1,
                },
                {
                    testId: 'TC-8497',
                    module: 'Payments',
                    pageName: 'Payment Portal',
                    scenario: 'Fawry bill payment integration test',
                    preConditions: 'Valid bill invoice reference available',
                    steps: JSON.stringify(['Select Fawry', 'Enter bill reference', 'Confirm payment amount']),
                    expectedResult: 'Reference number generated and webhook received upon payment',
                    actualResult: 'Webhook received and order status updated to PAID',
                    priority: 'high',
                    status: 'passed',
                    notes: 'Webhook latency: 450ms',
                    executedAt: now,
                    testerId: 3,
                    projectId: 3,
                },
                {
                    testId: 'TC-8498',
                    module: 'Authentication',
                    pageName: 'Security & Access',
                    scenario: 'Multi-factor authentication bypass attempt',
                    preConditions: 'Valid credentials without 2FA device',
                    steps: JSON.stringify(['Submit valid user/pass', 'Intercept HTTP request', 'Drop OTP header and send']),
                    expectedResult: 'Server returns HTTP 401 Unauthorized',
                    actualResult: 'HTTP 401 returned as expected',
                    priority: 'critical',
                    status: 'passed',
                    notes: 'Passed security audit checklist',
                    executedAt: now,
                    testerId: 1,
                    projectId: 4,
                },
                {
                    testId: 'TC-8499',
                    module: 'Documents',
                    pageName: 'Permit Issuance',
                    scenario: 'Building permit PDF generation with digital seal',
                    preConditions: 'Approved permit application record',
                    steps: JSON.stringify(['Click Generate PDF', 'Verify QR code and cryptographic signature']),
                    expectedResult: 'PDF renders in < 2 seconds with valid QR code',
                    actualResult: null,
                    priority: 'medium',
                    status: 'pending',
                    notes: 'Awaiting PKI staging certificate renewal',
                    executedAt: null,
                    testerId: 2,
                    projectId: 5,
                },
                {
                    testId: 'TC-8500',
                    module: 'Notifications',
                    pageName: 'Notification Center',
                    scenario: 'Real-time WebSocket notification for ministerial decrees',
                    preConditions: 'Active client socket connection',
                    steps: JSON.stringify(['Publish new decree from admin portal', 'Measure client alert latency']),
                    expectedResult: 'Alert pops up within 1 second on connected clients',
                    actualResult: 'WebSocket connection closed abruptly under ping timeout',
                    priority: 'high',
                    status: 'failed',
                    notes: 'Socket timeout issue identified in gateway proxy',
                    executedAt: now,
                    testerId: 3,
                    projectId: 2,
                },
                {
                    testId: 'TC-8501',
                    module: 'Reports',
                    pageName: 'Analytics & Reports',
                    scenario: 'Export test execution report to Excel (.xlsx)',
                    preConditions: 'At least 50 test runs in system',
                    steps: JSON.stringify(['Click Export to Excel', 'Download file', 'Verify schema & rows']),
                    expectedResult: 'File downloads successfully and contains correct dataset',
                    actualResult: 'Excel generated and downloaded accurately',
                    priority: 'low',
                    status: 'passed',
                    notes: 'Verified against expected row count',
                    executedAt: now,
                    testerId: 1,
                    projectId: 1,
                },
            ];
            for (const tc of seedTCs) {
                insertTC.run(tc.testId, tc.module, tc.pageName, tc.scenario, tc.preConditions, tc.steps, tc.expectedResult, tc.actualResult, tc.priority, tc.status, tc.notes, tc.executedAt, tc.testerId, tc.projectId);
            }
        }
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map