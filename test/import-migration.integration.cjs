// Isolated real PostgreSQL (WASM). No production environment or network access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PGlite } = require(
  process.env.PGLITE_MODULE ||
    path.resolve(
      __dirname,
      '../../.qa-test-tools/node_modules/@electric-sql/pglite',
    ),
);
const { DatabaseService } = require('../dist/database/database.service');
const { migrateWorkflow } = require('../dist/database/workflow-migration');
const {
  migrateProjectDeadlines,
} = require('../dist/database/project-deadlines-migration');
const {
  migrateCacheRevision,
} = require('../dist/database/cache-revision-migration');
const {
  migrateTestCaseImports,
} = require('../dist/database/test-case-import-migration');
const { TestCasesService } = require('../dist/test-cases/test-cases.service');
const { WorkflowService } = require('../dist/workflow/workflow.service');

void test('migration preview, failed DDL, apply and rerun preserve all 73 legacy cases and API compatibility', async () => {
  const pg = new PGlite();
  await pg.waitReady;
  let failLedger = false;
  const query = async (sql, params) => {
    if (
      failLedger &&
      sql.startsWith('INSERT INTO schema_migrations') &&
      params?.[0] === '20261105_test_case_imports_v1'
    )
      throw new Error('Injected migration-ledger failure after DDL');
    const r = params
      ? await pg.query(sql, params)
      : (await pg.exec(sql)).at(-1) || { rows: [] };
    return {
      ...r,
      rowCount: Math.max(r.affectedRows || 0, r.rows?.length || 0),
    };
  };
  const adapter = { query, connect: async () => ({ query, release() {} }) };
  try {
    const database = new DatabaseService();
    database.db = adapter;
    await database.initTables();
    await migrateWorkflow(adapter);
    await migrateProjectDeadlines(adapter);
    await migrateCacheRevision(adapter);
    await query(`INSERT INTO users(id,name,email,password,role) VALUES(1,'Legacy Admin','legacy@example.test','unused','admin');
      INSERT INTO projects(id,name,application) VALUES(1,'Legacy Project','Legacy App');
      INSERT INTO test_cases("testId",module,"pageName",scenario,"preConditions",steps,"expectedResult","actualResult",notes,"testerId","projectId","createdAt","updatedAt")
      SELECT 'LEGACY_'||n,'Legacy App','Page '||n,'Original scenario '||n,'Original preconditions','["Original step"]','Original expected result',NULL,'Original notes  ',1,1,'2026-01-01 09:00:00','2026-01-01 09:00:00' FROM generate_series(1,73) n;`);
    const original = (await query('SELECT * FROM test_cases ORDER BY id')).rows;
    const originalView = (
      await query('SELECT * FROM test_cases_current ORDER BY id')
    ).rows;
    const revision = (await query('SELECT revision FROM app_cache_revision'))
      .rows[0].revision;
    const absent = async () => {
      assert.equal(
        (await query("SELECT to_regclass('test_case_imports') AS name")).rows[0]
          .name,
        null,
      );
      assert.equal(
        (
          await query(
            "SELECT name FROM schema_migrations WHERE name='20261105_test_case_imports_v1'",
          )
        ).rowCount,
        0,
      );
      assert.deepEqual(
        (await query('SELECT * FROM test_cases ORDER BY id')).rows,
        original,
      );
    };
    await migrateTestCaseImports(adapter, true);
    await absent();
    failLedger = true;
    await assert.rejects(
      migrateTestCaseImports(adapter),
      /Injected migration-ledger failure/,
    );
    failLedger = false;
    await absent();
    await migrateTestCaseImports(adapter);
    assert.equal((await migrateTestCaseImports(adapter)).alreadyApplied, true);
    assert.deepEqual(
      (await query('SELECT * FROM test_cases ORDER BY id')).rows,
      original,
    );
    assert.deepEqual(
      (await query('SELECT * FROM test_cases_current ORDER BY id')).rows,
      originalView,
    );
    assert.equal(
      (await query('SELECT revision FROM app_cache_revision')).rows[0].revision,
      revision,
    );
    assert.equal(
      (await query('SELECT COUNT(*)::int AS count FROM test_case_imports'))
        .rows[0].count,
      0,
    );
    const service = new TestCasesService(
      database,
      new WorkflowService(database),
    );
    const list = await service.findAll(
      { page: 1, limit: 100 },
      { id: 1, role: 'admin' },
    );
    assert.equal(list.meta.total, 73);
    assert.equal(list.data.length, 73);
    assert.equal(
      list.data.every((tc) => tc.importMetadata === null),
      true,
    );
  } finally {
    await pg.close();
  }
});
