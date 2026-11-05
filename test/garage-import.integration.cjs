// Build first. Isolated PostgreSQL WASM and synthetic source data only; no network or production credentials.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { PGlite } = require(
  process.env.PGLITE_MODULE ||
    path.resolve(
      __dirname,
      '../../.qa-test-tools/node_modules/@electric-sql/pglite',
    ),
);
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { DatabaseService } = require('../dist/database/database.service');
const { DatabaseModule } = require('../dist/database/database.module');
const { TestCasesModule } = require('../dist/test-cases/test-cases.module');
const { ProjectsService } = require('../dist/projects/projects.service');
const {
  createCorsOptions,
  PRODUCTION_FRONTEND_ORIGIN,
} = require('../dist/security/cors');
const {
  collectBaseline,
  connectionUsesTls,
} = require('../scripts/production-baseline.cjs');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');
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
const { GARAGE_HEADERS } = require('../dist/test-cases/garage-import.service');
const route = '/api/test-cases/bulk-import/garage';
const secret = 'isolated-garage-test-key-never-used-in-production';
const auth = (id = 10, role = 'admin', options = {}) =>
  'Bearer ' +
  jwt.sign({ sub: id, role }, secret, { expiresIn: '1h', ...options });
let pg,
  app,
  adapter,
  failMetadata = false;
const rows = Array.from({ length: 51 }, (_, i) => ({
  original: Object.fromEntries(
    GARAGE_HEADERS.map((key) => [
      key,
      {
        'Test Case ID': `TC_${String(i + 1).padStart(3, '0')}`,
        Module: `  صفحة ${i + 1} / Page ${i + 1}  `,
        'Test Scenario': `سيناريو ${i + 1} <script>source text</script>`,
        'Pre-Conditions': i % 2 ? null : 'Logged in\r\nOriginal spacing  ',
        'Test Steps': '1. افتح الصفحة\r\n2. Click "Save"\n3. Verify  ',
        'Expected Result': 'Original expected\r\nresult',
        'Actual Result': i % 2 ? 'Original failure' : 'Original success',
        Status: i % 2 ? 'Fail' : 'Pass',
        'Defect ID': i % 2 ? `BUG_${i}` : null,
        Tester: 'Original Tester',
        'Execution Date': '5/3/2026, 11:06:18 PM',
      }[key] ?? null,
    ]),
  ),
}));
const post = (body) =>
  request(app.getHttpServer())
    .post(route)
    .set('Origin', PRODUCTION_FRONTEND_ORIGIN)
    .set('Authorization', auth())
    .send(body);
const count = async (table) =>
  Number(
    (await adapter.query(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0]
      .total,
  );
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  const query = async (sql, values) => {
    if (failMetadata && sql.startsWith('INSERT INTO test_case_imports'))
      throw new Error('Injected metadata failure');
    const r = values
      ? await pg.query(sql, values)
      : (await pg.exec(sql)).at(-1) || { rows: [] };
    return {
      ...r,
      rowCount: Math.max(r.affectedRows || 0, r.rows?.length || 0),
    };
  };
  adapter = { query, connect: async () => ({ query, release() {} }) };
  const database = new DatabaseService();
  database.db = adapter;
  await database.initTables();
  await migrateWorkflow(adapter);
  await migrateProjectDeadlines(adapter);
  await migrateCacheRevision(adapter);
  const dry = await migrateTestCaseImports(adapter, true);
  assert.equal(dry.dryRun, true);
  assert.equal(
    (await query("SELECT to_regclass('test_case_imports') AS name")).rows[0]
      .name,
    null,
  );
  await migrateTestCaseImports(adapter);
  assert.equal((await migrateTestCaseImports(adapter)).alreadyApplied, true);
  await query(`INSERT INTO users(id,name,email,password,role) VALUES
    (10,'Import Admin','admin@example.test','unused','admin'),
    (20,'Alaa Eldin Mohsen','alaa@example.test','unused','tester'),
    (30,'Hassan Ali','hassan@example.test','unused','tester'),
    (40,'Outsider','outsider@example.test','unused','tester');
    INSERT INTO projects(id,name,application) VALUES(50,'Testing Garage System','Garage System'),(60,'Unrelated','Other');
    INSERT INTO project_assignments("projectId","userId") VALUES(50,20),(50,30);
    INSERT INTO test_cases("testId",module,scenario,steps,"expectedResult","projectId","testerId")
    VALUES('UNRELATED','Other','Keep this record','[]','Unchanged',60,40);`);
  process.env.JWT_SECRET = secret;
  const module = await Test.createTestingModule({
    imports: [DatabaseModule, TestCasesModule],
    providers: [JwtStrategy],
  })
    .overrideProvider(DatabaseService)
    .useValue({ db: adapter })
    .compile();
  app = module.createNestApplication();
  app.enableCors(createCorsOptions());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
  // Suppress stack traces only for the deliberately injected rollback test.
  app.useLogger(false);
  await app.init();
});
after(async () => {
  if (app) await app.close();
  if (pg) await pg.close();
});

void test('Supabase provenance RLS denies ordinary client roles while backend owner access works', async () => {
  const security = (
    await adapter.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid='test_case_imports'::regclass",
    )
  ).rows[0];
  assert.equal(security.relrowsecurity, true);
  await adapter.query(
    'CREATE ROLE isolated_import_client; GRANT USAGE ON SCHEMA public TO isolated_import_client; GRANT SELECT, INSERT ON test_case_imports TO isolated_import_client;',
  );
  await adapter.query('BEGIN; SET LOCAL ROLE isolated_import_client;');
  try {
    assert.equal(
      (await adapter.query('SELECT * FROM test_case_imports')).rows.length,
      0,
    );
    await assert.rejects(
      adapter.query(`INSERT INTO test_case_imports("testCaseId","projectId","sourceKey","sourceTestId","sourceRow","rowHash","batchHash",original)
      VALUES(1,50,'denied','TC_001',1,'hash','batch','{}'::jsonb)`),
      (error) => error.code === '42501',
    );
  } finally {
    await adapter.query('ROLLBACK');
  }
});

void test('JWT authentication, database-backed admin authorization, expiry and verification permissions', async () => {
  await request(app.getHttpServer()).post(route).send({ rows }).expect(401);
  await request(app.getHttpServer())
    .post(route)
    .set('Authorization', auth(20, 'admin'))
    .send({ dryRun: true, rows })
    .expect(403);
  await request(app.getHttpServer())
    .post(route)
    .set('Authorization', auth(10, 'admin', { expiresIn: '-1s' }))
    .send({ rows })
    .expect(401);
  const bad = 'Bearer ' + jwt.sign({ sub: 10 }, 'different-test-key');
  await request(app.getHttpServer())
    .post(route)
    .set('Authorization', bad)
    .send({ rows })
    .expect(401);
  await request(app.getHttpServer())
    .get(`${route}/${'a'.repeat(64)}`)
    .set('Authorization', auth(20))
    .expect(403);
  assert.equal(await count('test_cases'), 1);
});

void test('validates count, original IDs/order, column types, status and missing preview without writes', async () => {
  await post({ dryRun: 'false', rows }).expect(400);
  const defaultPreview = (await post({ rows }).expect(200)).body;
  assert.equal(defaultPreview.dryRun, true);
  await post({ dryRun: true, rows: rows.slice(1) }).expect(400);
  const duplicate = structuredClone(rows);
  duplicate[1] = duplicate[0];
  await post({ dryRun: true, rows: duplicate }).expect(400);
  const invalid = structuredClone(rows);
  invalid[3].original.Status = 'maybe';
  await post({ dryRun: true, rows: invalid }).expect(400);
  invalid[3].original.Status = 'Pass';
  invalid[0].original.Status = '__proto__';
  await post({ dryRun: true, rows: invalid }).expect(400);
  invalid[0].original.Status = 'Pass';
  invalid[0].original.Module = 3;
  await post({ dryRun: true, rows: invalid }).expect(400);
  await post({ dryRun: false, rows }).expect(400);
  assert.equal(await count('test_case_imports'), 0);
});

void test('dry run resolves real project and user IDs, exact page names, Cairo plan and performs no writes', async () => {
  const revision = (
    await adapter.query('SELECT revision FROM app_cache_revision')
  ).rows[0].revision;
  const { body } = await post({ dryRun: true, rows }).expect(200);
  assert.equal(body.wouldInsert, 51);
  assert.equal(body.imported, undefined);
  assert.equal(body.project.id, 50);
  assert.deepEqual(
    body.assignments.map((o) => [o.id, o.count]),
    [
      [20, 30],
      [30, 21],
    ],
  );
  assert.equal(body.plan[0].plannedAt, '2026-11-05T07:00:00.000Z');
  assert.equal(body.plan[29].plannedAt, '2026-11-05T09:25:00.000Z');
  assert.equal(body.plan[30].plannedAt, null);
  assert.equal(body.plan[0].pageName, rows[0].original.Module);
  assert.equal(await count('test_cases'), 1);
  assert.equal(
    (await adapter.query('SELECT revision FROM app_cache_revision')).rows[0]
      .revision,
    revision,
  );
});

void test('ambiguous names, wrong application, missing memberships and missing project fail safely', async () => {
  await adapter.query(
    "INSERT INTO users(id,name,email,password) VALUES(21,'Alaa Eldin Mohsen','duplicate@example.test','unused')",
  );
  await post({ dryRun: true, rows }).expect(409);
  await adapter.query('DELETE FROM users WHERE id=21');
  await adapter.query("UPDATE projects SET application='Wrong' WHERE id=50");
  await post({ dryRun: true, rows }).expect(409);
  await adapter.query(
    "UPDATE projects SET application='Garage System' WHERE id=50",
  );
  await adapter.query('DELETE FROM project_assignments WHERE "userId"=20');
  await post({ dryRun: true, rows }).expect(409);
  await adapter.query(
    'INSERT INTO project_assignments("userId","projectId") VALUES(20,50)',
  );
  await adapter.query(
    "UPDATE projects SET name='Temporarily renamed' WHERE id=50",
  );
  await post({ dryRun: true, rows }).expect(409);
  await adapter.query(
    "UPDATE projects SET name='Testing Garage System' WHERE id=50",
  );
});

void test('existing foreign data causes conflicts, never renumbers IDs or overwrites existing cases', async () => {
  await adapter.query(
    `INSERT INTO test_cases("testId",module,scenario,steps,"expectedResult","projectId") VALUES('TC_001','Garage System','Existing content','[]','Keep',50)`,
  );
  const preview = (await post({ dryRun: true, rows }).expect(200)).body;
  assert.deepEqual(preview.conflicts, ['TC_001']);
  assert.equal(preview.canCommit, false);
  await post({ dryRun: false, rows, previewHash: preview.previewHash }).expect(
    409,
  );
  assert.equal(
    (
      await adapter.query(
        `SELECT scenario FROM test_cases WHERE "testId"='TC_001'`,
      )
    ).rows[0].scenario,
    'Existing content',
  );
  await adapter.query(`DELETE FROM test_cases WHERE "testId"='TC_001'`);
  await adapter.query(`ALTER TABLE test_cases ADD CONSTRAINT isolated_global_testid UNIQUE("testId");
    INSERT INTO test_cases("testId",module,scenario,steps,"expectedResult","projectId") VALUES('TC_001','Other','Other project','[]','Keep',60);`);
  const blocked = (await post({ dryRun: true, rows }).expect(409)).body;
  assert.match(blocked.message, /globally unique/);
  await adapter.query(`DELETE FROM test_cases WHERE "testId"='TC_001';
    ALTER TABLE test_cases DROP CONSTRAINT isolated_global_testid;`);
});

void test('stale preview and mid-transaction failure roll back definitions, metadata and cache revision', async () => {
  const preview = (await post({ dryRun: true, rows }).expect(200)).body;
  await post({ dryRun: false, rows, previewHash: '0'.repeat(64) }).expect(409);
  const revision = (
    await adapter.query('SELECT revision FROM app_cache_revision')
  ).rows[0].revision;
  failMetadata = true;
  try {
    await post({
      dryRun: false,
      rows,
      previewHash: preview.previewHash,
    }).expect(500);
  } finally {
    failMetadata = false;
  }
  assert.equal(await count('test_cases'), 1);
  assert.equal(await count('test_case_imports'), 0);
  assert.equal(
    (await adapter.query('SELECT revision FROM app_cache_revision')).rows[0]
      .revision,
    revision,
  );
});

void test('atomic import persists all original content with correct ownership, no fake executions and real audit times', async () => {
  const preview = (await post({ dryRun: true, rows }).expect(200)).body;
  const before = Date.now();
  const committed = (
    await post({
      dryRun: false,
      rows,
      previewHash: preview.previewHash,
    }).expect(200)
  ).body;
  assert.equal(committed.imported, 51);
  assert.equal(committed.verified, true);
  assert.equal(await count('test_cases'), 52);
  assert.equal(await count('test_executions'), 0);
  const records = (
    await adapter.query(
      `SELECT tc.*,EXTRACT(EPOCH FROM (tc."createdAt" AT TIME ZONE current_setting('TimeZone'))) AS created_epoch,to_jsonb(i) AS meta FROM test_cases tc JOIN test_case_imports i ON i."testCaseId"=tc.id ORDER BY i."sourceRow"`,
    )
  ).rows;
  for (const [i, tc] of records.entries()) {
    assert.equal(tc.testerId, i < 30 ? 20 : 30);
    assert.equal(tc.projectId, 50);
    assert.equal(tc.module, 'Garage System');
    assert.equal(tc.pageName, rows[i].original.Module);
    assert.deepEqual(tc.meta.original, rows[i].original);
    assert.deepEqual(JSON.parse(tc.steps), [rows[i].original['Test Steps']]);
    assert.equal(tc.executedAt, null);
    assert.equal(tc.updatedById, null);
    assert.equal(tc.meta.importedById, 10);
    assert.ok(Number(tc.created_epoch) * 1000 >= before - 1000);
    assert.equal(
      new Date(tc.updatedAt).getTime(),
      new Date(tc.createdAt).getTime(),
    );
  }
  const report = (
    await request(app.getHttpServer())
      .get(`${route}/${committed.batchHash}`)
      .set('Authorization', auth())
      .expect(200)
  ).body;
  assert.equal(report.verified, true);
  assert.deepEqual(
    report.assignments.map((a) => a.count),
    [30, 21],
  );
  const list = (
    await request(app.getHttpServer())
      .get('/api/test-cases?projectId=50&limit=1000')
      .set('Authorization', auth())
      .expect(200)
  ).body;
  assert.equal(list.meta.total, 51);
  const first = list.data.find((r) => r.testId === 'TC_001');
  assert.equal(first.tester.name, 'Alaa Eldin Mohsen');
  assert.deepEqual(first.importMetadata.original, rows[0].original);
  await request(app.getHttpServer())
    .get(`/api/test-cases/${first.id}`)
    .set('Authorization', auth(20))
    .expect(200);
  await request(app.getHttpServer())
    .get(`/api/test-cases/${first.id}`)
    .set('Authorization', auth(40))
    .expect(403);
  const outsider = (
    await request(app.getHttpServer())
      .get('/api/test-cases?projectId=50')
      .set('Authorization', auth(40))
      .expect(200)
  ).body;
  assert.equal(outsider.meta.total, 0);
  const page = (
    await request(app.getHttpServer())
      .get('/api/test-cases?projectId=50&page=2&limit=10&status=failed')
      .set('Authorization', auth())
      .expect(200)
  ).body;
  assert.equal(page.data.length, 10);
  assert.equal(page.meta.total, 25);
  const searched = (
    await request(app.getHttpServer())
      .get('/api/test-cases?projectId=50&search=TC_051')
      .set('Authorization', auth())
      .expect(200)
  ).body;
  assert.equal(searched.meta.total, 1);
  assert.equal(
    (
      await adapter.query(
        `SELECT scenario FROM test_cases WHERE "testId"='UNRELATED'`,
      )
    ).rows[0].scenario,
    'Keep this record',
  );
});

void test('Render runtime probe reads schema, owners, case fingerprint and RLS without modifying records', async () => {
  const before = (await adapter.query('SELECT * FROM test_cases ORDER BY id'))
    .rows;
  const revision = (
    await adapter.query('SELECT revision FROM app_cache_revision')
  ).rows[0].revision;
  const report = await collectBaseline(adapter, {
    expectedCount: 52,
    requireTls: false,
  });
  assert.deepEqual(report.blockers, []);
  assert.equal(report.existingCases.count, 52);
  assert.equal(report.garageCases.length, 51);
  assert.equal(report.importMigrationApplied, true);
  assert.equal(report.provenanceSecurity.rls, true);
  assert.deepEqual(
    report.owners.map((u) => u.id),
    [20, 30],
  );
  assert.deepEqual(
    (await adapter.query('SELECT * FROM test_cases ORDER BY id')).rows,
    before,
  );
  assert.equal(
    (await adapter.query('SELECT revision FROM app_cache_revision')).rows[0]
      .revision,
    revision,
  );
  const mismatch = await collectBaseline(adapter, {
    expectedCount: 65,
    requireTls: false,
  });
  assert.equal(
    mismatch.blockers.some((b) => /case count/.test(b)),
    true,
  );
  assert.equal(
    mismatch.existingCases.fingerprint,
    report.existingCases.fingerprint,
  );
  const noTls = await collectBaseline(adapter, { expectedCount: 52 });
  assert.equal(
    noTls.blockers.some((b) => /TLS/.test(b)),
    true,
  );
  assert.equal(
    connectionUsesTls({ connection: { stream: { encrypted: true } } }),
    true,
  );
  assert.equal(connectionUsesTls({ connection: { stream: {} } }), false);
  await adapter.query(
    'CREATE ROLE isolated_baseline_reader; GRANT USAGE ON SCHEMA public TO isolated_baseline_reader; GRANT SELECT ON ALL TABLES IN SCHEMA public TO isolated_baseline_reader; SET ROLE isolated_baseline_reader;',
  );
  try {
    const limited = await collectBaseline(adapter, {
      expectedCount: 52,
      requireTls: false,
    });
    assert.equal(limited.permissions.can_read_cases, true);
    assert.equal(limited.permissions.can_insert_cases, false);
    assert.equal(limited.permissions.can_update_cache, false);
    assert.equal(
      limited.blockers.some((b) => /privileges/.test(b)),
      true,
    );
    assert.equal(limited.provenanceSecurity.backend_access, false);
  } finally {
    await adapter.query('RESET ROLE');
  }
  await adapter.query(
    fs.readFileSync(
      path.resolve(__dirname, '../scripts/production-baseline.sql'),
      'utf8',
    ),
  );
  assert.deepEqual(
    (await adapter.query('SELECT * FROM test_cases ORDER BY id')).rows,
    before,
  );
  assert.equal(
    (await adapter.query('SELECT revision FROM app_cache_revision')).rows[0]
      .revision,
    revision,
  );
});

void test('rerun is idempotent; changed source or modified persisted content cannot be overwritten', async () => {
  const preview = (await post({ dryRun: true, rows }).expect(200)).body;
  assert.equal(preview.wouldInsert, 0);
  assert.equal(preview.skipped, 51);
  const result = (
    await post({
      dryRun: false,
      rows,
      previewHash: preview.previewHash,
    }).expect(200)
  ).body;
  assert.equal(result.imported, 0);
  assert.equal(result.skipped, 51);
  assert.equal(await count('test_cases'), 52);
  await adapter.query(
    `UPDATE test_cases SET "testId"='RENAMED' WHERE "testId"='TC_001'`,
  );
  assert.deepEqual(
    (await post({ dryRun: true, rows }).expect(200)).body.conflicts,
    ['TC_001'],
  );
  await adapter.query(
    `UPDATE test_cases SET "testId"='TC_001' WHERE "testId"='RENAMED'`,
  );
  await adapter.query(`INSERT INTO test_executions("testCaseId","projectId","testerId",status,"actualResult",snapshot,source)
    SELECT id,50,30,'failed','A later execution','{}'::jsonb,'compatibility' FROM test_cases WHERE "testId"='TC_001'`);
  assert.deepEqual(
    (await post({ dryRun: true, rows }).expect(200)).body.conflicts,
    ['TC_001'],
  );
  await adapter.query('DELETE FROM test_executions');
  const edited = structuredClone(rows);
  edited[0].original['Actual Result'] = 'Changed';
  assert.equal(
    (await post({ dryRun: true, rows: edited }).expect(200)).body.canCommit,
    false,
  );
  await adapter.query(
    `UPDATE test_cases SET scenario='Changed after import' WHERE "testId"='TC_001'`,
  );
  assert.deepEqual(
    (await post({ dryRun: true, rows }).expect(200)).body.conflicts,
    ['TC_001'],
  );
});

void test('project deletion preserves imported provenance and rolls back case detachment on late failures', async () => {
  await adapter.query('BEGIN; SET LOCAL ROLE isolated_import_client;');
  try {
    assert.equal(
      (
        await adapter.query(
          'SELECT COUNT(*)::int AS count FROM test_case_imports',
        )
      ).rows[0].count,
      0,
    );
  } finally {
    await adapter.query('ROLLBACK');
  }
  const service = new ProjectsService({ db: adapter });
  await adapter.query('DELETE FROM project_assignments WHERE "projectId"=50');
  try {
    await assert.rejects(
      service.remove(50),
      (error) =>
        error.status === 400 && /imported source records/.test(error.message),
    );
    assert.equal(
      (
        await adapter.query(
          'SELECT COUNT(*)::int AS count FROM test_cases WHERE "projectId"=50',
        )
      ).rows[0].count,
      51,
    );
    assert.equal(await count('test_case_imports'), 51);
  } finally {
    await adapter.query(
      'INSERT INTO project_assignments("projectId","userId") VALUES(50,20),(50,30)',
    );
  }
  await adapter.query(`INSERT INTO projects(id,name) VALUES(70,'Deletion rollback fixture');
    INSERT INTO test_cases("testId",module,scenario,steps,"expectedResult","projectId") VALUES('DELETE_FIXTURE','Other','Keep association','[]','Keep',70);
    CREATE TABLE isolated_project_blocker("projectId" INTEGER REFERENCES projects(id) ON DELETE RESTRICT);
    INSERT INTO isolated_project_blocker VALUES(70);`);
  const revision = (
    await adapter.query('SELECT revision FROM app_cache_revision')
  ).rows[0].revision;
  await assert.rejects(service.remove(70), (error) =>
    ['23503', '23001'].includes(error.code),
  );
  assert.equal(
    (
      await adapter.query(
        `SELECT "projectId" FROM test_cases WHERE "testId"='DELETE_FIXTURE'`,
      )
    ).rows[0].projectId,
    70,
  );
  assert.equal(
    (await adapter.query('SELECT revision FROM app_cache_revision')).rows[0]
      .revision,
    revision,
  );
  await adapter.query('DROP TABLE isolated_project_blocker');
  await service.remove(70);
  assert.equal(
    (
      await adapter.query(
        `SELECT "projectId" FROM test_cases WHERE "testId"='DELETE_FIXTURE'`,
      )
    ).rows[0].projectId,
    null,
  );
});
