import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';

// A single atomic statement locks each due project and commits both delivery state
// and notification. Multiple workers/restarts cannot deliver the same tuple twice.
export const deliverProjectDeadlinesSql = `
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

@Injectable()
export class ProjectDeadlinesService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ProjectDeadlinesService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly database: DatabaseService,
    private readonly users: UsersService,
  ) {}

  onApplicationBootstrap() {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 30_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async deliverDue() {
    const result = await this.database.db.query(deliverProjectDeadlinesSql);
    for (const notification of result.rows)
      this.users.publishNotification(notification);
    if (result.rowCount)
      this.logger.log(
        `Persisted ${result.rowCount} project deadline notifications`,
      );
    return result.rows;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverDue();
    } catch (error) {
      this.logger.error(
        'Project deadline scan failed; next scan will retry',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
