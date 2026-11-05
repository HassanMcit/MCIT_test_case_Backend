// Standalone read-only probe for the EXISTING Render runtime. Requires only pg,
// never imports AppModule, starts the server, seeds users or loads a local .env.
const REQUIRED_MIGRATIONS = [
  '20261025_execution_workflow_v1',
  '20261104_project_deadlines_v1',
  '20261104_cache_revision_v1',
];
const IMPORT_MIGRATION = '20261105_test_case_imports_v1';
const OWNERS = ['Alaa Eldin Mohsen', 'Hassan Ali'];
function connectionUsesTls(client) {
  return client.connection?.stream?.encrypted === true;
}
async function collectBaseline(
  pool,
  { expectedCount = 65, requireTls = true } = {},
) {
  const client = await pool.connect();
  const result = {
    checkedAt: new Date().toISOString(),
    mode: 'read-only',
    clientTls: connectionUsesTls(client),
    blockers: [],
    providerChecksStillRequired: [
      'Render/Vercel deployment branches and rollback versions',
      'Supabase backup timestamp, retention and recovery availability',
      'Existing administrator authentication',
    ],
  };
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    if (requireTls && !result.clientTls)
      result.blockers.push(
        'Runtime database client connection is not using TLS; review settings without changing them',
      );
    result.tables = (
      await client.query(`SELECT to_regclass('public.test_cases') AS cases,
      to_regclass('public.test_cases_current') AS current_view,
      to_regclass('public.schema_migrations') AS migrations,
      to_regclass('public.test_case_imports') AS provenance`)
    ).rows[0];
    result.columns = (
      await client.query(`SELECT table_name,column_name,data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name IN ('test_cases','test_case_imports','projects') ORDER BY table_name,ordinal_position`)
    ).rows;
    result.migrations = result.tables.migrations
      ? (
          await client.query(
            'SELECT name FROM public.schema_migrations ORDER BY name',
          )
        ).rows.map((r) => r.name)
      : [];
    if (REQUIRED_MIGRATIONS.some((name) => !result.migrations.includes(name)))
      result.blockers.push(
        'Required workflow/project/cache migrations are missing; review them separately',
      );
    result.importMigrationApplied =
      result.migrations.includes(IMPORT_MIGRATION);
    if (!!result.tables.provenance !== result.importMigrationApplied)
      result.blockers.push('Import table and migration ledger disagree');
    if (result.tables.cases) {
      result.existingCases = (
        await client.query(`SELECT count(*)::int AS count,array_agg(id ORDER BY id) AS ids,
        md5(string_agg(md5(to_jsonb(tc)::text),'' ORDER BY id)) AS fingerprint FROM public.test_cases tc`)
      ).rows[0];
      result.existingCases.expectedCount = expectedCount;
      result.existingCases.countMatches =
        result.existingCases.count === expectedCount;
      if (!result.existingCases.countMatches)
        result.blockers.push(
          'Database case count differs from expected baseline; reconcile database versus UI scope before release',
        );
      result.permissions = (
        await client.query(`SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create,
        has_table_privilege(current_user,'public.test_cases','SELECT') AS can_read_cases,
        has_table_privilege(current_user,'public.test_cases','INSERT') AS can_insert_cases,
        (has_table_privilege(current_user,'public.test_cases','REFERENCES') AND
         has_table_privilege(current_user,'public.projects','REFERENCES') AND
         has_table_privilege(current_user,'public.users','REFERENCES')) AS can_reference_parents,
        CASE WHEN to_regclass('public.app_cache_revision') IS NULL THEN false
         ELSE has_table_privilege(current_user,'public.app_cache_revision','UPDATE') END AS can_update_cache,
        rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`)
      ).rows[0];
      if (
        !result.permissions.can_read_cases ||
        !result.permissions.can_insert_cases ||
        !result.permissions.can_update_cache ||
        (!result.tables.provenance &&
          !result.permissions.can_reference_parents) ||
        (!result.tables.provenance && !result.permissions.can_create)
      )
        result.blockers.push('Runtime database privileges are insufficient');
    } else result.blockers.push('Test case definition table is missing');
    const hasApplication = result.columns.some(
      (c) => c.table_name === 'projects' && c.column_name === 'application',
    );
    result.projects = hasApplication
      ? (
          await client.query(
            "SELECT id,name,application FROM public.projects WHERE name='Testing Garage System' ORDER BY id",
          )
        ).rows
      : [];
    if (
      result.projects.length !== 1 ||
      result.projects[0].application !== 'Garage System'
    )
      result.blockers.push(
        'Exactly one existing target project with application Garage System is required',
      );
    result.owners = (
      await client.query(
        'SELECT id,name,role FROM public.users WHERE name=ANY($1::text[]) ORDER BY name,id',
        [OWNERS],
      )
    ).rows;
    if (
      OWNERS.some(
        (name) => result.owners.filter((u) => u.name === name).length !== 1,
      )
    )
      result.blockers.push(
        'Each owner name must resolve to exactly one existing user',
      );
    result.memberships = (
      await client.query(
        'SELECT "projectId","userId" FROM public.project_assignments WHERE "projectId"=ANY($1::int[]) AND "userId"=ANY($2::int[])',
        [result.projects.map((p) => p.id), result.owners.map((u) => u.id)],
      )
    ).rows;
    if (
      result.projects.length === 1 &&
      result.owners.some(
        (u) =>
          u.role !== 'admin' &&
          !result.memberships.some(
            (m) => m.userId === u.id && m.projectId === result.projects[0].id,
          ),
      )
    )
      result.blockers.push(
        'A non-admin owner lacks existing target project membership',
      );
    result.garageCases = result.tables.cases
      ? (
          await client.query(
            `SELECT id,"testId",module,"pageName","testerId","projectId" FROM public.test_cases WHERE "projectId"=ANY($1::int[]) ORDER BY id`,
            [result.projects.map((p) => p.id)],
          )
        ).rows
      : [];
    result.duplicateIds = result.tables.cases
      ? (
          await client.query(
            `SELECT "projectId","testId",count(*)::int AS count FROM public.test_cases WHERE "projectId"=ANY($1::int[]) GROUP BY "projectId","testId" HAVING count(*)>1`,
            [result.projects.map((p) => p.id)],
          )
        ).rows
      : [];
    if (result.duplicateIds.length)
      result.blockers.push('Target project contains duplicate test IDs');
    if (result.tables.provenance) {
      result.provenanceSecurity = (
        await client.query(`SELECT c.relrowsecurity AS rls,
        (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) OR r.rolsuper OR r.rolbypassrls) AS backend_access,
        (SELECT count(*)::int FROM pg_policy WHERE polrelid=c.oid) AS policies
        FROM pg_class c CROSS JOIN pg_roles r WHERE c.oid='public.test_case_imports'::regclass AND r.rolname=current_user`)
      ).rows[0];
      if (
        !result.provenanceSecurity.rls ||
        !result.provenanceSecurity.backend_access ||
        result.provenanceSecurity.policies !== 0
      )
        result.blockers.push(
          'Existing provenance RLS/access differs from the reviewed design',
        );
    }
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { collectBaseline, connectionUsesTls };
// Also works when pasted as node stdin in the existing Render Shell.
if (!module.parent) {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL must already exist in the Render runtime; no local .env will be loaded',
    );
    process.exitCode = 1;
  } else {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
      max: 1,
    });
    collectBaseline(pool)
      .then((result) => {
        result.environmentPresence = Object.fromEntries(
          ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'PORT'].map((key) => [
            key,
            !!process.env[key],
          ]),
        );
        if (!process.env.JWT_SECRET)
          result.blockers.push('JWT_SECRET is not explicitly configured');
        console.log(JSON.stringify(result, null, 2));
        if (result.blockers.length) process.exitCode = 1;
      })
      .catch((error) => {
        console.error(
          `Read-only database check failed: ${error.code || error.name}`,
        );
        process.exitCode = 1;
      })
      .finally(() => pool.end());
  }
}
