import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
export declare const deliverProjectDeadlinesSql = "\nWITH due AS (\n SELECT p.id, p.name, p.\"endAt\", p.\"assignedTesterId\"\n FROM projects p\n JOIN project_assignments pa ON pa.\"projectId\"=p.id AND pa.\"userId\"=p.\"assignedTesterId\"\n WHERE p.status='active' AND p.\"endAt\" <= NOW()\n AND NOT EXISTS (SELECT 1 FROM project_deadline_deliveries d\n   WHERE d.\"projectId\"=p.id AND d.\"endAt\"=p.\"endAt\" AND d.\"userId\"=p.\"assignedTesterId\")\n ORDER BY p.\"endAt\", p.id LIMIT 200 FOR UPDATE OF p SKIP LOCKED\n), delivered AS (\n INSERT INTO project_deadline_deliveries(\"projectId\", \"endAt\", \"userId\")\n SELECT id, \"endAt\", \"assignedTesterId\" FROM due\n ON CONFLICT DO NOTHING RETURNING *\n)\nINSERT INTO notifications(\"userId\", title, message, \"titleEn\", \"messageEn\", \"projectId\", link)\nSELECT d.\"userId\", '\u0627\u0646\u062A\u0647\u0649 \u0645\u0648\u0639\u062F \u0627\u0644\u0645\u0634\u0631\u0648\u0639: ' || p.name,\n '\u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062D\u062F\u062F \u0644\u0644\u0645\u0634\u0631\u0648\u0639 ' || p.name || '. \u0628\u0631\u062C\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0645\u0644.',\n 'Project deadline passed: ' || p.name,\n 'The deadline for project ' || p.name || ' has passed. Please review the project and update its status.',\n p.id, '/projects?project=' || p.id\nFROM delivered d JOIN due p ON p.id=d.\"projectId\"\nRETURNING id, \"userId\", title, message, \"titleEn\", \"messageEn\", \"projectId\", link, \"createdAt\";\n";
export declare class ProjectDeadlinesService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly database;
    private readonly users;
    private readonly logger;
    private timer?;
    private running;
    constructor(database: DatabaseService, users: UsersService);
    onApplicationBootstrap(): void;
    onModuleDestroy(): void;
    deliverDue(): Promise<any[]>;
    tick(): Promise<void>;
}
