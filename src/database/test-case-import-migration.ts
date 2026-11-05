import type { Pool } from 'pg';

// Additive provenance only: no changes to existing IDs, timestamps or the current-result view.
export async function migrateTestCaseImports(pool: Pool, dryRun = false) {
  const db = await pool.connect();
  const migration = '20261105_test_case_imports_v1';
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query("SET LOCAL statement_timeout = '30s'");
    await db.query('SELECT pg_advisory_xact_lock(20261105, 1)');
    const existing = await db.query(
      'SELECT 1 FROM schema_migrations WHERE name=$1',
      [migration],
    );
    if (!existing.rowCount) {
      await db.query(`CREATE TABLE test_case_imports (
        "testCaseId" INTEGER PRIMARY KEY REFERENCES test_cases(id) ON DELETE CASCADE,
        "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        "sourceKey" TEXT NOT NULL, "sourceTestId" TEXT NOT NULL,
        "sourceRow" INTEGER NOT NULL CHECK("sourceRow" BETWEEN 1 AND 51),
        "rowHash" TEXT NOT NULL, "batchHash" TEXT NOT NULL,
        original JSONB NOT NULL CHECK(jsonb_typeof(original)='object'),
        "plannedAt" TIMESTAMPTZ, "plannedTimezone" TEXT,
        "importedById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        "importedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("projectId","sourceKey","sourceTestId"),
        UNIQUE("projectId","sourceKey","sourceRow")
      );
      CREATE INDEX test_case_imports_batch ON test_case_imports("batchHash");
      ALTER TABLE test_case_imports ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON TABLE test_case_imports FROM PUBLIC;`);
      await db.query('INSERT INTO schema_migrations(name) VALUES($1)', [
        migration,
      ]);
    }
    await db.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { migration, alreadyApplied: !!existing.rowCount, dryRun };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}
