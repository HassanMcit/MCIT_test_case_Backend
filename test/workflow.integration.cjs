// Run after `npm run build`: node --test test/workflow.integration.cjs
// Isolated real PostgreSQL (WASM); no network/database credentials are used.
const { test, before, after } = require('node:test');
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
const {
  migrateWorkflow,
  workflowSql,
} = require('../dist/database/workflow-migration');
const { WorkflowService } = require('../dist/workflow/workflow.service');
const { TestCasesService } = require('../dist/test-cases/test-cases.service');
const { validateDates } = require('../dist/workflow/workflow.service');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { DatabaseModule } = require('../dist/database/database.module');
const { WorkflowModule } = require('../dist/workflow/workflow.module');
const { TestCasesModule } = require('../dist/test-cases/test-cases.module');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');
const jwt = require('jsonwebtoken');
const request = require('supertest');
let pg, db, service, cases, app, release, cycle, item, original;
const admin = { id: 1, role: 'admin', name: 'Admin' },
  tester = { id: 2, role: 'tester', name: 'Tester' },
  outsider = { id: 3, role: 'tester', name: 'Outsider' };
const q = { page: 1, limit: 20 };
const secret = 'isolated-workflow-test-secret-not-for-production';
const auth = (user) =>
  'Bearer ' +
  jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '1h' });
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  const query = async (sql, values) => {
    const result = values
      ? await pg.query(sql, values)
      : (await pg.exec(sql)).at(-1) || { rows: [] };
    // node-postgres returns DATE as YYYY-MM-DD; PGlite returns Date objects.
    for (const field of result.fields || [])
      if (field.dataTypeID === 1082)
        for (const row of result.rows)
          if (row[field.name] instanceof Date)
            row[field.name] = row[field.name].toISOString().slice(0, 10);
    return {
      ...result,
      rowCount: Math.max(result.affectedRows || 0, result.rows?.length || 0),
    };
  };
  const adapter = { query, connect: async () => ({ query, release() {} }) };
  db = new DatabaseService();
  db.db = adapter;
  await db.initTables();
  await query(`INSERT INTO users(id,name,email,password,role) VALUES(1,'Admin','admin@example.test','unused','admin'),(2,'Tester','tester@example.test','unused','tester'),(3,'Outsider','other@example.test','unused','tester');
 INSERT INTO projects(id,name,status,environment) VALUES(1,'Project One','active','staging'),(2,'Project Two','active','production');
 INSERT INTO project_assignments("userId","projectId") VALUES(2,1),(3,2);
 INSERT INTO test_cases("testId",module,scenario,steps,"expectedResult",status,"actualResult","testerId","projectId","executedAt") VALUES
 ('TC-0001','Project One','Login correctly','["Enter credentials","Submit"]','Dashboard','failed','Old failure',2,1,'2026-01-01'),
 ('TC-0002','Project One','Empty password validation','["Submit empty"]','Validation','pending',NULL,2,1,'2026-01-02'),
 ('TC-0003','Project Two','Unrelated project','["Open"]','Opened','pending',NULL,3,2,NULL);`);
  original = (await query('SELECT * FROM test_cases ORDER BY id')).rows;
  const dry = await migrateWorkflow(adapter, true);
  assert.equal(dry.dryRun, true);
  assert.equal(
    (await query("SELECT to_regclass('releases') AS value")).rows[0].value,
    null,
  );
  await migrateWorkflow(adapter);
  service = new WorkflowService(db);
  cases = new TestCasesService(db, service);
  process.env.JWT_SECRET = secret;
  const module = await Test.createTestingModule({
    imports: [DatabaseModule, WorkflowModule, TestCasesModule],
    providers: [JwtStrategy],
  })
    .overrideProvider(DatabaseService)
    .useValue({ db: adapter })
    .compile();
  app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
  await app.init();
});
after(async () => {
  if (app) await app.close();
  if (pg) await pg.close();
});

test('migration dry-run rolls back; apply preserves definitions; rerun does not duplicate legacy history', async () => {
  assert.deepEqual(
    (await db.db.query('SELECT * FROM test_cases ORDER BY id')).rows,
    original,
  );
  let history = await service.history(1, q, admin);
  assert.equal(history.meta.total, 1);
  assert.equal(history.data[0].source, 'legacy');
  assert.equal(history.data[0].actualResult, 'Old failure');
  assert.equal(history.data[0].cycleName, null);
  assert.equal(
    (await service.history(2, q, admin)).meta.total,
    0,
    'pending timestamp is not a completed execution',
  );
  const result = await migrateWorkflow(db.db);
  assert.equal(result.alreadyApplied, true);
  assert.equal((await service.history(1, q, admin)).meta.total, 1);
});
test('JWT and DTO boundaries reject anonymous, tester management, malformed dates and invalid statuses', async () => {
  await request(app.getHttpServer()).get('/api/test-cycles').expect(401);
  await request(app.getHttpServer())
    .post('/api/projects/1/releases')
    .set('Authorization', auth(tester))
    .send({ name: 'Release', version: '1.0' })
    .expect(403);
  await request(app.getHttpServer())
    .post('/api/projects/1/releases')
    .set('Authorization', auth(admin))
    .send({ name: 'Release', version: '1.0', startDate: '2026-02-30' })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/projects/1/releases')
    .set('Authorization', auth(admin))
    .send({ name: 'Release', version: '1.0', status: 'invalid' })
    .expect(400);
  await request(app.getHttpServer())
    .get('/api/test-cycles?limit=5000')
    .set('Authorization', auth(admin))
    .expect(400);
});
test('release CRUD, case-insensitive uniqueness and partial date validation', async () => {
  release = await service.createRelease(
    1,
    {
      name: 'Release One',
      version: '1.0',
      startDate: '2026-01-01',
      releaseDate: '2026-02-01',
    },
    admin,
  );
  await assert.rejects(
    service.createRelease(1, { name: 'Duplicate', version: ' 1.0 ' }, admin),
    (e) => e.status === 409,
  );
  await assert.rejects(
    service.updateRelease(1, release.id, { startDate: '2026-03-01' }, admin),
    (e) => e.status === 400,
  );
  assert.equal((await service.release(1, release.id, tester)).version, '1.0');
  await assert.rejects(
    service.release(1, release.id, outsider),
    (e) => e.status === 403,
  );
  await assert.rejects(
    service.createCycle(
      { projectId: 2, releaseId: release.id, name: 'Wrong project' },
      admin,
    ),
    (e) => e.status === 404,
  );
});
test('cycle membership is atomic and rejects other-project cases/unassigned testers', async () => {
  cycle = await service.createCycle(
    {
      projectId: 1,
      releaseId: release.id,
      name: 'Regression',
      status: 'planning',
    },
    admin,
  );
  await assert.rejects(
    service.addItems(
      cycle.id,
      {
        items: [
          { testCaseId: 1, testerId: 2 },
          { testCaseId: 3, testerId: 2 },
        ],
      },
      admin,
    ),
    (e) => e.status === 400,
  );
  assert.equal((await service.items(cycle.id, q, admin)).meta.total, 0);
  await assert.rejects(
    service.addItems(
      cycle.id,
      { items: [{ testCaseId: 1, testerId: 3 }] },
      admin,
    ),
    (e) => e.status === 400,
  );
  await service.addItems(
    cycle.id,
    { items: [{ testCaseId: 1, testerId: 2 }, { testCaseId: 2 }] },
    admin,
  );
  item = (await service.items(cycle.id, q, admin)).data[0];
  await assert.rejects(
    service.addItems(
      cycle.id,
      { items: [{ testCaseId: 1, testerId: 2 }] },
      admin,
    ),
    (e) => e.status === 409,
  );
  await assert.rejects(
    service.execute(cycle.id, item.id, { status: 'passed' }, tester),
    (e) => e.status === 409,
  );
  await service.updateCycle(cycle.id, { status: 'active' }, admin);
});
test('project and item authorization enforce ownership even when IDs are known', async () => {
  await request(app.getHttpServer())
    .get(`/api/test-cycles/${cycle.id}`)
    .set('Authorization', auth(outsider))
    .expect(403);
  await request(app.getHttpServer())
    .get('/api/test-cases/1/executions')
    .set('Authorization', auth(outsider))
    .expect(403);
  await request(app.getHttpServer())
    .get('/api/test-cases/1')
    .set('Authorization', auth(outsider))
    .expect(403);
  await request(app.getHttpServer())
    .patch('/api/test-cases/1')
    .set('Authorization', auth(outsider))
    .send({ status: 'passed' })
    .expect(403);
  const other = (await service.items(cycle.id, q, admin)).data[1];
  await assert.rejects(
    service.execute(cycle.id, other.id, { status: 'passed' }, tester),
    (e) => e.status === 403,
  );
  await assert.rejects(
    service.assign(cycle.id, item.id, { testerId: 2 }, tester),
    (e) => e.status === 403,
  );
});
test('retests append; definition edits never alter snapshots, results or assignments', async () => {
  await service.execute(
    cycle.id,
    item.id,
    {
      status: 'failed',
      actualResult: 'New failure',
      notes: 'First attempt',
      environment: 'UAT',
      durationSeconds: 15,
    },
    tester,
  );
  await cases.update(1, { scenario: 'Changed definition' }, admin);
  await service.execute(
    cycle.id,
    item.id,
    {
      status: 'passed',
      actualResult: 'Now works',
      environment: 'UAT',
      durationSeconds: 10,
    },
    tester,
  );
  const history = await service.history(1, q, admin);
  assert.equal(history.meta.total, 3);
  assert.deepEqual(
    history.data.map((e) => e.status),
    ['passed', 'failed', 'failed'],
  );
  assert.equal(history.data[0].snapshot.scenario, 'Login correctly');
  assert.equal(history.data[0].testerId, 2);
  assert.equal(
    (
      await db.db.query(
        'SELECT status,"actualResult" FROM test_cases WHERE id=1',
      )
    ).rows[0].status,
    'failed',
    'original legacy result untouched',
  );
  assert.equal(
    (await cases.findOne(1, admin)).status,
    'passed',
    'compatibility view reads latest execution',
  );
  assert.equal((await cases.findOne(1, admin)).scenario, 'Changed definition');
});
test('execution API rejects actor spoofing, invalid durations/statuses and keeps trusted tester identity', async () => {
  await request(app.getHttpServer())
    .post(`/api/test-cycles/${cycle.id}/items/${item.id}/executions`)
    .set('Authorization', auth(tester))
    .send({ status: 'passed', durationSeconds: -1 })
    .expect(400);
  await request(app.getHttpServer())
    .post(`/api/test-cycles/${cycle.id}/items/${item.id}/executions`)
    .set('Authorization', auth(tester))
    .send({ status: 'pending' })
    .expect(400);
  const r = await request(app.getHttpServer())
    .post(`/api/test-cycles/${cycle.id}/items/${item.id}/executions`)
    .set('Authorization', auth(tester))
    .send({ status: 'blocked', testerId: 1, testerName: 'Spoofed' })
    .expect(201);
  assert.equal(r.body.testerId, 2);
  assert.equal(r.body.testerName, 'Tester');
});
test('metrics use latest item results while total executions counts attempts; filters remain scoped', async () => {
  const m = await service.metrics({ cycleId: cycle.id }, tester);
  assert.equal(m.summary.total, 2);
  assert.equal(m.summary.blocked, 1);
  assert.equal(m.summary.notRun, 1);
  assert.equal(m.summary.progress, 50);
  assert.equal(m.totalExecutions, 3);
  assert.equal(m.releases[0].summary.progress, 50);
  const own = await service.metrics({ cycleId: cycle.id, testerId: 2 }, tester);
  assert.equal(own.summary.total, 1);
  assert.equal(own.cycles[0].summary.total, 1);
  const hidden = await service.metrics({ cycleId: cycle.id }, outsider);
  assert.equal(hidden.totalExecutions, 0);
  assert.equal(hidden.summary.total, 0);
  assert.equal(
    (await service.history(1, { page: 2, limit: 2 }, admin)).data.length,
    2,
  );
});
test('legacy result editing appends a compatibility execution; new definitions avoid mutable result storage', async () => {
  await cases.update(
    1,
    {
      status: 'passed',
      actualResult: 'Compatibility retest',
      notes: 'Legacy screen',
    },
    tester,
  );
  assert.equal(
    (await service.history(1, q, admin)).data[0].source,
    'compatibility',
  );
  assert.equal(
    (await cases.findOne(1, tester)).actualResult,
    'Compatibility retest',
  );
  const tc = await cases.create(
    {
      testId: 'TC-0010',
      module: 'Project One',
      scenario: 'New standalone test',
      steps: ['Go'],
      expectedResult: 'Result',
      projectId: 1,
      status: 'passed',
      actualResult: 'Success',
    },
    tester,
  );
  assert.equal(
    (
      await db.db.query(
        'SELECT status,"actualResult","executedAt" FROM test_cases WHERE id=$1',
        [tc.id],
      )
    ).rows[0].status,
    'pending',
  );
  assert.equal(
    (await service.history(tc.id, q, admin)).data[0].actualResult,
    'Success',
  );
});
test('history-bearing cases cannot be moved or deleted; completed cycles reject new attempts', async () => {
  await assert.rejects(
    cases.update(1, { projectId: 2 }, admin),
    (e) => e.status === 409,
  );
  await assert.rejects(cases.remove(1, admin), (e) => e.status === 409);
  await service.updateCycle(cycle.id, { status: 'completed' }, admin);
  await assert.rejects(
    service.execute(cycle.id, item.id, { status: 'failed' }, tester),
    (e) => e.status === 409,
  );
  assert.equal(
    (await service.history(1, q, admin)).data[0].actualResult,
    'Compatibility retest',
  );
});
test('closed releases retain history and reject new cycles', async () => {
  await service.updateRelease(1, release.id, { status: 'released' }, admin);
  await assert.rejects(
    service.createCycle(
      { projectId: 1, releaseId: release.id, name: 'Too late' },
      admin,
    ),
    (e) => e.status === 409,
  );
  await service.updateRelease(1, release.id, { status: 'archived' }, admin);
  await assert.rejects(
    service.updateRelease(1, release.id, { name: 'No edits' }, admin),
    (e) => e.status === 409,
  );
  assert.ok((await service.history(1, q, admin)).meta.total >= 4);
});
test('strict date validation rejects invalid calendars and reversed ranges', () => {
  assert.throws(() => validateDates('2026-02-30', '2026-03-01'));
  assert.throws(() => validateDates('2026-02-02', '2026-01-01'));
  assert.doesNotThrow(() => validateDates('2028-02-29', null));
});
test('the same case preserves outcomes across releases and snapshots the revised definition', async () => {
  const hotfix = await service.createRelease(
    1,
    { name: 'Release Hotfix', version: '1.0 Hotfix', status: 'testing' },
    admin,
  );
  const fixCycle = await service.createCycle(
    {
      projectId: 1,
      releaseId: hotfix.id,
      name: 'Hotfix smoke',
      status: 'active',
    },
    admin,
  );
  await service.addItems(
    fixCycle.id,
    { items: [{ testCaseId: 1, testerId: 2 }] },
    admin,
  );
  const fixItem = (await service.items(fixCycle.id, q, tester)).data[0];
  await service.execute(
    fixCycle.id,
    fixItem.id,
    { status: 'passed', actualResult: 'Hotfix passed' },
    tester,
  );
  const h = await service.history(1, q, tester);
  assert.equal(h.data[0].version, '1.0 Hotfix');
  assert.equal(h.data[0].snapshot.scenario, 'Changed definition');
  const prior = h.data.find((e) => e.actualResult === 'New failure');
  assert.equal(prior.version, '1.0');
  assert.equal(prior.snapshot.scenario, 'Login correctly');
  const result = await request(app.getHttpServer())
    .get(`/api/dashboard/executions?releaseId=${hotfix.id}`)
    .set('Authorization', auth(tester))
    .expect(200);
  assert.equal(result.body.summary.passed, 1);
  assert.equal(result.body.totalExecutions, 1);
});
test('case selection searches and paginates beyond 100 rows without truncating totals', async () => {
  await db.db.query(
    `INSERT INTO test_cases("testId",module,scenario,steps,"expectedResult","projectId") SELECT 'TC-'||lpad(n::text,4,'0'),'Project One','Paginated case '||n,'["Step"]','Expected',1 FROM generate_series(100,204) n`,
  );
  const activeCycle = (
    await service.cycles({ ...q, search: 'Hotfix smoke' }, admin)
  ).data[0];
  const page6 = await service.candidates(
    activeCycle.id,
    { page: 6, limit: 20, search: 'Paginated case' },
    admin,
  );
  assert.equal(page6.meta.total, 105);
  assert.equal(page6.meta.totalPages, 6);
  assert.equal(page6.data.length, 5);
  const response = await request(app.getHttpServer())
    .get(
      `/api/test-cycles/${activeCycle.id}/candidates?page=6&search=Paginated%20case`,
    )
    .set('Authorization', auth(admin))
    .expect(200);
  assert.equal(response.body.meta.total, 105);
  assert.equal(response.body.data.length, 5);
});
