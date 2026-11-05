// Run inside Render with its existing DATABASE_URL. Never loads a local .env.
const { Pool } = require('pg');
const {
  connectionUsesTls,
  connectionVerifiesTlsPeer,
} = require('./production-baseline.cjs');
const {
  migrateTestCaseImports,
} = require('../dist/database/test-case-import-migration');
const modes = process.argv.slice(2);
if (
  modes.length !== 1 ||
  !['--check', '--dry-run', '--apply'].includes(modes[0])
)
  throw new Error('Choose exactly one of --check, --dry-run or --apply');
if (!process.env.DATABASE_URL)
  throw new Error(
    'DATABASE_URL must already be configured for the intended environment',
  );
if (!process.env.JWT_SECRET)
  throw new Error(
    'JWT_SECRET must already be configured in Render; do not deploy using the source-code fallback',
  );
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  max: 1,
});
async function main() {
  const db = await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    await db.query("SET LOCAL statement_timeout = '15s'");
    const required = [
      '20261025_execution_workflow_v1',
      '20261104_project_deadlines_v1',
      '20261104_cache_revision_v1',
    ];
    const applied = (
      await db.query(
        'SELECT name FROM schema_migrations WHERE name=ANY($1::text[])',
        [required],
      )
    ).rows.map((r) => r.name);
    if (required.some((name) => !applied.includes(name)))
      throw new Error(
        'Prerequisite workflow/project/cache migrations are missing. Review the deployment baseline before proceeding',
      );
    const tables = (
      await db.query(`SELECT to_regclass('test_cases') IS NOT NULL AS cases,
      to_regclass('test_cases_current') IS NOT NULL AS current_view,
      to_regclass('test_case_imports') IS NOT NULL AS provenance,
      has_schema_privilege(current_user,'public','CREATE') AS can_create,
      COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) AS database_server_leg_ssl`)
    ).rows[0];
    if (!tables.cases || !tables.current_view)
      throw new Error('Required test case schema is missing');
    if (!tables.provenance && !tables.can_create)
      throw new Error(
        'Database role cannot create the provenance table; have the authorized database owner review the migration',
      );
    const clientTls = connectionUsesTls(db);
    const tlsPeerVerified = connectionVerifiesTlsPeer(db);
    console.log(
      JSON.stringify({
        prerequisitesApplied: true,
        ...tables,
        clientTls,
        tlsPeerVerified,
      }),
    );
    if (!clientTls)
      throw new Error(
        'Database connection is not using TLS. Review provider-issued TLS settings and obtain approval before any configuration change',
      );
    if (!tlsPeerVerified)
      throw new Error(
        'TLS peer certificate is not verified. Review provider CA/settings; do not disable certificate verification',
      );
    if (tables.provenance) {
      const security = (
        await db.query(`SELECT c.relrowsecurity AS rls,
        (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) OR r.rolsuper OR r.rolbypassrls) AS backend_access,
        (SELECT COUNT(*)::int FROM pg_policy WHERE polrelid=c.oid) AS policies
        FROM pg_class c CROSS JOIN pg_roles r
        WHERE c.oid='test_case_imports'::regclass AND r.rolname=current_user`)
      ).rows[0];
      console.log(JSON.stringify({ provenanceSecurity: security }));
      if (!security.rls || !security.backend_access || security.policies !== 0)
        throw new Error(
          'Provenance security does not match the reviewed owner-access/no-client-policy design',
        );
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
  if (modes[0] !== '--check')
    console.log(
      JSON.stringify(
        await migrateTestCaseImports(pool, modes[0] === '--dry-run'),
      ),
    );
}
main()
  .catch((error) => {
    // Do not print driver messages: they can include endpoint/user details.
    console.error(
      error.code
        ? `Deployment database check failed (${error.code}); review privately in Render`
        : error.message,
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
