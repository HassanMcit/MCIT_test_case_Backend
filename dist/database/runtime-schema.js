"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRuntimeSchemaReady = assertRuntimeSchemaReady;
async function assertRuntimeSchemaReady(pool) {
    const db = await pool.connect();
    try {
        await db.query('BEGIN READ ONLY');
        await db.query("SET LOCAL statement_timeout = '10s'");
        await db.query(`SELECT "testCaseId","projectId","sourceKey","sourceTestId",
      "sourceRow","rowHash","batchHash",original,"plannedAt","plannedTimezone",
      "importedById","importedAt" FROM test_case_imports LIMIT 0`);
        await db.query('SELECT id FROM test_cases_current LIMIT 0');
        const markers = await db.query(`SELECT name FROM schema_migrations WHERE name=ANY($1::text[])`, [['20261105_test_case_imports_v1']]);
        if (markers.rows.length !== 1)
            throw new Error('SCHEMA_MIGRATION_REQUIRED');
        const security = await db.query(`SELECT c.relrowsecurity AS rls,
      (c.relowner=r.oid OR r.rolsuper OR r.rolbypassrls) AS backend_access,
      (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies
      FROM pg_class c JOIN pg_roles r ON r.rolname=current_user
      WHERE c.oid='public.test_case_imports'::regclass`);
        const row = security.rows[0];
        if (!row?.rls || !row.backend_access || row.policies !== 0)
            throw new Error('SCHEMA_SECURITY_NOT_READY');
    }
    finally {
        try {
            await db.query('ROLLBACK');
        }
        finally {
            db.release();
        }
    }
}
//# sourceMappingURL=runtime-schema.js.map