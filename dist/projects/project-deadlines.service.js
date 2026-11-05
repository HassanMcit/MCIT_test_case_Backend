"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProjectDeadlinesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDeadlinesService = exports.deliverProjectDeadlinesSql = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const users_service_1 = require("../users/users.service");
exports.deliverProjectDeadlinesSql = `
WITH due AS (
 SELECT p.id, p.name, p."endAt", p."assignedTesterId"
 FROM projects p
 JOIN project_assignments pa ON pa."projectId"=p.id AND pa."userId"=p."assignedTesterId"
 WHERE p.status='active' AND p."endAt" <= NOW()
 AND NOT EXISTS (SELECT 1 FROM project_deadline_deliveries d
   WHERE d."projectId"=p.id AND d."endAt"=p."endAt" AND d."userId"=p."assignedTesterId")
 ORDER BY p."endAt", p.id LIMIT 200 FOR UPDATE OF p SKIP LOCKED
), delivered AS (
 INSERT INTO project_deadline_deliveries("projectId", "endAt", "userId")
 SELECT id, "endAt", "assignedTesterId" FROM due
 ON CONFLICT DO NOTHING RETURNING *
)
INSERT INTO notifications("userId", title, message, "titleEn", "messageEn", "projectId", link)
SELECT d."userId", 'انتهى موعد المشروع: ' || p.name,
 'انتهى الوقت المحدد للمشروع ' || p.name || '. برجاء مراجعة المشروع وتحديث حالة العمل.',
 'Project deadline passed: ' || p.name,
 'The deadline for project ' || p.name || ' has passed. Please review the project and update its status.',
 p.id, '/projects?project=' || p.id
FROM delivered d JOIN due p ON p.id=d."projectId"
RETURNING id, "userId", title, message, "titleEn", "messageEn", "projectId", link, "createdAt";
`;
let ProjectDeadlinesService = ProjectDeadlinesService_1 = class ProjectDeadlinesService {
    constructor(database, users) {
        this.database = database;
        this.users = users;
        this.logger = new common_1.Logger(ProjectDeadlinesService_1.name);
        this.running = false;
    }
    onApplicationBootstrap() {
        void this.tick();
        this.timer = setInterval(() => void this.tick(), 30_000);
        this.timer.unref();
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async deliverDue() {
        const result = await this.database.db.query(exports.deliverProjectDeadlinesSql);
        for (const notification of result.rows)
            this.users.publishNotification(notification);
        if (result.rowCount)
            this.logger.log(`Persisted ${result.rowCount} project deadline notifications`);
        return result.rows;
    }
    async tick() {
        if (this.running)
            return;
        this.running = true;
        try {
            await this.deliverDue();
        }
        catch (error) {
            this.logger.error('Project deadline scan failed; next scan will retry', error instanceof Error ? error.stack : String(error));
        }
        finally {
            this.running = false;
        }
    }
};
exports.ProjectDeadlinesService = ProjectDeadlinesService;
exports.ProjectDeadlinesService = ProjectDeadlinesService = ProjectDeadlinesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        users_service_1.UsersService])
], ProjectDeadlinesService);
//# sourceMappingURL=project-deadlines.service.js.map