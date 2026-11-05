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
const { migrateGarageWorkbookSeed } = require('../dist/database/garage-workbook-seed-migration');
const { GarageImportService } = require('../dist/test-cases/garage-import.service');

void test('migration preview, failed DDL, apply and rerun preserve all 65 legacy cases and API compatibility', async () => {
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
      SELECT 'LEGACY_'||n,'Legacy App','Page '||n,'Original scenario '||n,'Original preconditions','["Original step"]','Original expected result',NULL,'Original notes  ',1,1,'2026-01-01 09:00:00','2026-01-01 09:00:00' FROM generate_series(1,65) n;`);
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
    assert.equal(list.meta.total, 65);
    assert.equal(list.data.length, 65);
    assert.equal(
      list.data.every((tc) => tc.importMetadata === null),
      true,
    );
    // Seed Testing Garage System + owners + stray wrong-project Garage rows (TC-0034, TC-0035, TC-0004)
    await query(`
      INSERT INTO users(id,name,email,password,role) VALUES
        (2,'Hassan Ali','h.ali@mcit.gov.eg','unused','admin'),
        (3,'Alaa Eldin Mohsen','alaa@mcit.gov.eg','unused','tester');
      INSERT INTO projects(id,name,application) VALUES
        (2,'Testing Attendance Reports','Attendance System'),
        (3,'Testing Garage System','Garage System');
      INSERT INTO test_cases("testId",module,"pageName",scenario,"preConditions",steps,"expectedResult",status,"testerId","projectId")
      VALUES
        ('TC-0034','Garage System','حركة المركبات','Stray wrong project 1',NULL,'["s"]','e','passed',3,2),
        ('TC-0035','Garage System','الحركة','Stray wrong project 2',NULL,'["s"]','e','passed',3,2),
        ('TC-0004','Garage System','حركات المركبة','Stray lone case',NULL,'["s"]','e','passed',2,3);
    `);

    const seedRes = await migrateGarageWorkbookSeed(adapter);
    assert.equal(seedRes.insertedCount, 51);
    assert.equal(seedRes.removedStrayCount, 3);

    const rerunRes = await migrateGarageWorkbookSeed(adapter);
    assert.equal(rerunRes.insertedCount, 0);
    assert.equal(rerunRes.updatedCount, 51);

    const garageImportService = new GarageImportService(database);
    const status = await garageImportService.status();
    assert.equal(status.verified, true);
    assert.equal(status.totalImported, 51);
    assert.equal(status.totalCasesInGarageProject, 51);
    assert.equal(status.wrongProjectGarageCasesCount, 0);
    assert.deepEqual(status.assignments, [
      { name: 'Alaa Eldin Mohsen', count: 30 },
      { name: 'Hassan Ali', count: 21 },
    ]);
  } finally {
    await pg.close();
  }
});
