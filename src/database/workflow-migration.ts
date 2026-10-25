import type { Pool } from 'pg';

export const WORKFLOW_MIGRATION = '20261025_execution_workflow_v1';
export const workflowSql = `
CREATE TABLE releases (
 id SERIAL PRIMARY KEY, "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 name VARCHAR(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 200),
 version VARCHAR(100) NOT NULL CHECK(length(btrim(version)) > 0), description TEXT,
 status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','testing','released','archived')),
 "startDate" DATE, "releaseDate" DATE,
 "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
 "updatedById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK("startDate" IS NULL OR "releaseDate" IS NULL OR "releaseDate" >= "startDate"),
 UNIQUE(id,"projectId")
);
CREATE UNIQUE INDEX releases_project_version ON releases("projectId",lower(btrim(version)));
CREATE INDEX releases_project_status ON releases("projectId",status,id);
CREATE TABLE test_cycles (
 id SERIAL PRIMARY KEY, "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 "releaseId" INTEGER NOT NULL, name VARCHAR(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 200),
 description TEXT, status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','completed','archived')),
 "startDate" DATE, "endDate" DATE,
 "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY("releaseId","projectId") REFERENCES releases(id,"projectId") ON DELETE RESTRICT,
 CHECK("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate"),
 UNIQUE(id,"projectId")
);
CREATE INDEX cycles_release ON test_cycles("releaseId",id);
CREATE TABLE test_cycle_items (
 id SERIAL PRIMARY KEY, "cycleId" INTEGER NOT NULL, "projectId" INTEGER NOT NULL,
 "testCaseId" INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE RESTRICT,
 "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
 snapshot JSONB NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY("cycleId","projectId") REFERENCES test_cycles(id,"projectId") ON DELETE RESTRICT,
 UNIQUE("cycleId","testCaseId"), UNIQUE(id,"testCaseId","projectId")
);
CREATE INDEX cycle_items_tester ON test_cycle_items("testerId","cycleId");
CREATE TABLE test_executions (
 id SERIAL PRIMARY KEY, "testCaseId" INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE RESTRICT,
 "cycleItemId" INTEGER, "projectId" INTEGER REFERENCES projects(id) ON DELETE RESTRICT,
 "testerId" INTEGER REFERENCES users(id) ON DELETE SET NULL, "testerName" TEXT,
 status TEXT NOT NULL CHECK(status IN ('not_run','passed','failed','blocked','skipped')),
 "actualResult" TEXT, notes TEXT, environment VARCHAR(200),
 "executedAt" TIMESTAMPTZ, "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 "durationSeconds" INTEGER CHECK("durationSeconds" >= 0), snapshot JSONB NOT NULL,
 source TEXT NOT NULL DEFAULT 'cycle' CHECK(source IN ('cycle','legacy','compatibility')),
 "sourceKey" TEXT UNIQUE,
 FOREIGN KEY("cycleItemId","testCaseId","projectId") REFERENCES test_cycle_items(id,"testCaseId","projectId") ON DELETE RESTRICT,
 CHECK("cycleItemId" IS NULL OR "projectId" IS NOT NULL)
);
CREATE INDEX executions_case_history ON test_executions("testCaseId",id DESC);
CREATE INDEX executions_item_latest ON test_executions("cycleItemId",id DESC);
CREATE INDEX executions_project ON test_executions("projectId",id DESC);
-- Original test cases remain unchanged. Pending timestamps alone are not evidence of execution.
INSERT INTO test_executions("testCaseId","projectId","testerId","testerName",status,"actualResult",notes,environment,"executedAt",snapshot,source,"sourceKey")
SELECT tc.id,tc."projectId",tc."testerId",u.name,
 CASE WHEN tc.status IN ('passed','failed','blocked','skipped') THEN tc.status ELSE 'not_run' END,
 tc."actualResult",tc.notes,p.environment,tc."executedAt" AT TIME ZONE 'UTC',to_jsonb(tc),'legacy','test_case:'||tc.id
FROM test_cases tc LEFT JOIN users u ON u.id=tc."testerId" LEFT JOIN projects p ON p.id=tc."projectId"
WHERE tc.status IN ('passed','failed','blocked','skipped') OR nullif(btrim(tc."actualResult"),'') IS NOT NULL;
-- Existing screens consume a latest-result projection; the definition row is not updated by retests.
CREATE VIEW test_cases_current AS
SELECT tc.id,tc."testId",tc.module,tc."pageName",tc.scenario,tc."preConditions",tc.steps,tc."expectedResult",
 CASE WHEN e.id IS NOT NULL THEN e."actualResult" ELSE tc."actualResult" END AS "actualResult",
 tc.priority,CASE WHEN e.id IS NOT NULL THEN CASE WHEN e.status='not_run' THEN 'pending' ELSE e.status END ELSE tc.status END AS status,
 tc.severity,CASE WHEN e.id IS NOT NULL THEN e.notes ELSE tc.notes END AS notes,
 CASE WHEN e.id IS NOT NULL THEN e."executedAt" ELSE tc."executedAt" END AS "executedAt",
 CASE WHEN e.id IS NOT NULL THEN e."testerId" ELSE tc."testerId" END AS "testerId",
 tc."updatedById",tc."projectId",tc."createdAt",tc."updatedAt"
FROM test_cases tc LEFT JOIN LATERAL (SELECT * FROM test_executions WHERE "testCaseId"=tc.id ORDER BY id DESC LIMIT 1) e ON true;
`;

export async function migrateWorkflow(pool: Pool, dryRun = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(20261025, 1)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    );
    const existing = await client.query(
      'SELECT 1 FROM schema_migrations WHERE name=$1',
      [WORKFLOW_MIGRATION],
    );
    if (!existing.rowCount) {
      await client.query(workflowSql);
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [
        WORKFLOW_MIGRATION,
      ]);
    }
    const counts = await client.query(
      'SELECT source,COUNT(*)::int AS count FROM test_executions GROUP BY source',
    );
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return {
      migration: WORKFLOW_MIGRATION,
      alreadyApplied: !!existing.rowCount,
      dryRun,
      executions: counts.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
