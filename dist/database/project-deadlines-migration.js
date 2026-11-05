"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectDeadlinesSql = exports.PROJECT_DEADLINES_MIGRATION = void 0;
exports.migrateProjectDeadlines = migrateProjectDeadlines;
exports.PROJECT_DEADLINES_MIGRATION = '20261104_project_deadlines_v1';
exports.projectDeadlinesSql = `
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "assignedTesterId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS application TEXT;
ALTER TABLE projects ADD CONSTRAINT projects_schedule_valid CHECK (
  ("startAt" IS NULL AND "endAt" IS NULL) OR
  ("startAt" IS NOT NULL AND "endAt" IS NOT NULL AND "startAt" < "endAt")
);
ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS "primaryManaged" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "titleEn" TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "messageEn" TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
CREATE TABLE project_deadline_deliveries (
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "endAt" TIMESTAMPTZ NOT NULL,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "deliveredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("projectId", "endAt", "userId")
);
CREATE INDEX projects_due_idx ON projects("endAt") WHERE "assignedTesterId" IS NOT NULL AND status='active';
CREATE FUNCTION clear_project_primary_tester() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE projects SET "assignedTesterId"=NULL, "updatedAt"=NOW()
  WHERE id=OLD."projectId" AND "assignedTesterId"=OLD."userId";
  RETURN OLD;
END $$;
CREATE TRIGGER clear_project_primary_tester AFTER DELETE ON project_assignments
FOR EACH ROW EXECUTE FUNCTION clear_project_primary_tester();
`;
async function migrateProjectDeadlines(pool, dryRun = false) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(20261104, 1)');
        await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())');
        const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [exports.PROJECT_DEADLINES_MIGRATION]);
        if (!existing.rowCount) {
            await client.query(exports.projectDeadlinesSql);
            await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [
                exports.PROJECT_DEADLINES_MIGRATION,
            ]);
        }
        await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
        return {
            migration: exports.PROJECT_DEADLINES_MIGRATION,
            alreadyApplied: !!existing.rowCount,
            dryRun,
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=project-deadlines-migration.js.map