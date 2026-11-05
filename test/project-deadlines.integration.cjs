// Isolated PostgreSQL engine. Never loads .env or starts the production AppModule.
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
const { migrateTestCaseImports } = require('../dist/database/test-case-import-migration');
const { migrateWorkflow } = require('../dist/database/workflow-migration');
const {
  migrateProjectDeadlines,
} = require('../dist/database/project-deadlines-migration');
const {
  migrateCacheRevision,
} = require('../dist/database/cache-revision-migration');
const { ProjectsService } = require('../dist/projects/projects.service');
const {
  ProjectDeadlinesService,
} = require('../dist/projects/project-deadlines.service');
const { ProjectsController } = require('../dist/projects/projects.controller');
const { UsersService } = require('../dist/users/users.service');
const { UsersController } = require('../dist/users/users.controller');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const request = require('supertest');
const jwt = require('jsonwebtoken');
let pg, db, projects, worker, users, app;
const secret = 'isolated-deadline-tests-only';
const auth = (id, role = 'admin') =>
  'Bearer ' + jwt.sign({ sub: id, role }, secret, { expiresIn: '1h' });
const valid = (extra = {}) => ({
  name: 'Deadline Project',
  startAt: '2026-01-01T08:00:00Z',
  endAt: '2026-01-02T08:00:00Z',
  ...extra,
});
const deadlines = async (id) =>
  (
    await db.db.query(
      'SELECT * FROM project_deadline_deliveries WHERE "projectId"=$1',
      [id],
    )
  ).rows;
const notes = async (id) =>
  (
    await db.db.query(
      'SELECT * FROM notifications WHERE "projectId"=$1 AND "titleEn" LIKE $2',
      [id, 'Project deadline passed:%'],
    )
  ).rows;
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  const query = async (sql, params) => {
    const r = params
      ? await pg.query(sql, params)
      : (await pg.exec(sql)).at(-1) || { rows: [] };
    return {
      ...r,
      rowCount: Math.max(r.affectedRows || 0, r.rows?.length || 0),
    };
  };
  const adapter = { query, connect: async () => ({ query, release() {} }) };
  db = new DatabaseService();
  db.db = adapter;
  await db.initTables();
  await migrateWorkflow(adapter);
  await query(`INSERT INTO users(id,name,email,password,role) VALUES
    (1,'Admin','admin@example.test','unused','admin'),
    (2,'Tester','tester@example.test','unused','tester'),
    (3,'Other','other@example.test','unused','tester'),
    (4,'Ineligible','excluded@example.test','unused','user');
    INSERT INTO projects(name) VALUES('Legacy unscheduled project');`);
  assert.equal((await migrateProjectDeadlines(adapter, true)).dryRun, true);
  assert.equal(
    (
      await query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='endAt'",
      )
    ).rowCount,
    0,
  );
  await migrateProjectDeadlines(adapter);
  await migrateCacheRevision(adapter);
  await migrateTestCaseImports(adapter);
  projects = new ProjectsService(db);
  users = new UsersService(db);
  worker = new ProjectDeadlinesService(db, users);
  process.env.JWT_SECRET = secret;
  const module = await Test.createTestingModule({
    controllers: [ProjectsController, UsersController],
    providers: [
      ProjectsService,
      UsersService,
      JwtStrategy,
      {
        provide: DatabaseService,
        useValue: { db: adapter, resolvePhotoUrl: db.resolvePhotoUrl.bind(db) },
      },
    ],
  }).compile();
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
  worker?.onModuleDestroy();
  if (app) await app.close();
  if (pg) await pg.close();
});

void test('migration is repeatable and preserves legacy null schedules', async () => {
  assert.equal((await migrateProjectDeadlines(db.db)).alreadyApplied, true);
  assert.equal((await migrateCacheRevision(db.db)).alreadyApplied, true);
  const row = (await db.db.query('SELECT * FROM projects WHERE id=1')).rows[0];
  assert.equal(row.endAt, null);
  assert.equal(row.assignedTesterId, null);
});
void test('HTTP create without tester; required dates, ordering, offset, and eligibility validation', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/projects')
    .set('Authorization', auth(1))
    .send(valid())
    .expect(201);
  assert.equal(response.body.assignedTesterId, null);
  await worker.deliverDue();
  assert.equal((await notes(response.body.id)).length, 0);
  for (const body of [
    { name: 'Missing dates' },
    valid({ endAt: '2025-01-01T00:00:00Z' }),
    valid({ startAt: null }),
    valid({ startAt: '2026-01-01T08:00:00' }),
    valid({ endAt: 'not-a-date' }),
    valid({ assignedTesterId: 999 }),
    valid({ assignedTesterId: 4 }),
  ]) {
    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', auth(1))
      .send(body)
      .expect(400);
  }
});
void test('assigned creation persists UTC, membership, bilingual assignment; overdue delivers once across restart/concurrent scans', async () => {
  const p = await projects.create(
    valid({ startAt: '2026-01-01T10:00:00+02:00', assignedTesterId: 2 }),
  );
  assert.equal(new Date(p.startAt).toISOString(), '2026-01-01T08:00:00.000Z');
  assert.equal(p.assignedUsers[0].userId, 2);
  await Promise.all([
    worker.deliverDue(),
    new ProjectDeadlinesService(db, users).deliverDue(),
  ]);
  await new ProjectDeadlinesService(db, users).deliverDue();
  assert.equal((await deadlines(p.id)).length, 1);
  const n = (await notes(p.id))[0];
  assert.equal(n.userId, 2);
  assert.equal(n.read, false);
  assert.match(n.message, /انتهى الوقت/);
  assert.match(n.messageEn, /deadline/);
  assert.ok(n.messageEn.includes(p.name));
  assert.equal(n.link, '/projects?project=' + p.id);
  const mine = await users.getNotifications(2);
  assert.ok(mine.notifications.some((row) => row.id === n.id));
  assert.ok(mine.unreadCount > 0);
  await users.markNotificationRead(3, n.id);
  assert.equal(
    (await notes(p.id))[0].read,
    false,
    'other users cannot mark recipient notification',
  );
  await users.markNotificationRead(2, n.id);
  assert.equal((await notes(p.id))[0].read, true);
});
void test('deadline edits and reassignment notify new recipient once; removal syncs managed membership', async () => {
  const p = await projects.create(valid({ assignedTesterId: 2 }));
  await worker.deliverDue();
  await projects.update(p.id, { assignedTesterId: 3 });
  await worker.deliverDue();
  assert.deepEqual((await deadlines(p.id)).map((r) => r.userId).sort(), [2, 3]);
  await projects.update(p.id, { endAt: '2026-01-03T08:00:00Z' });
  await worker.deliverDue();
  assert.equal((await deadlines(p.id)).length, 3);
  await projects.update(p.id, { endAt: '2026-01-02T08:00:00Z' });
  await worker.deliverDue();
  assert.equal(
    (await deadlines(p.id)).length,
    3,
    'restoring same deadline does not re-notify',
  );
  await projects.update(p.id, { assignedTesterId: null });
  const updated = await projects.findOne(p.id);
  assert.equal(updated.assignedTesterId, null);
  assert.equal(updated.assignedUsers.length, 0);
  await worker.deliverDue();
  assert.equal((await deadlines(p.id)).length, 3);
});
void test('independent team memberships preserved; existing unassignment clears designated tester', async () => {
  const p = await projects.create(valid());
  await users.assignProject(2, { projectId: p.id });
  await projects.update(p.id, { assignedTesterId: 2 });
  await projects.update(p.id, { assignedTesterId: null });
  assert.equal((await projects.findOne(p.id)).assignedUsers.length, 1);
  await projects.update(p.id, { assignedTesterId: 2 });
  await users.unassignProject(2, p.id);
  assert.equal((await projects.findOne(p.id)).assignedTesterId, null);
  await worker.deliverDue();
  assert.equal((await deadlines(p.id)).length, 0);
});
void test('future, archived, completed, cancelled projects never deliver', async () => {
  const future = await projects.create(
    valid({ endAt: '2099-01-02T00:00:00Z', assignedTesterId: 2 }),
  );
  for (const status of ['archived', 'completed', 'cancelled']) {
    const p = await projects.create(valid({ assignedTesterId: 2 }));
    await db.db.query('UPDATE projects SET status=$1 WHERE id=$2', [
      status,
      p.id,
    ]);
    await worker.deliverDue();
    assert.equal((await notes(p.id)).length, 0);
  }
  assert.equal((await notes(future.id)).length, 0);
});
void test('authorization, merged-date edit validation, nullable removal, and eligible tester endpoint', async () => {
  await request(app.getHttpServer())
    .post('/api/projects')
    .send(valid())
    .expect(401);
  await request(app.getHttpServer())
    .post('/api/projects')
    .set('Authorization', auth(2, 'tester'))
    .send(valid())
    .expect(403);
  const p = await projects.create(valid({ assignedTesterId: 2 }));
  await request(app.getHttpServer())
    .get('/api/projects/' + p.id)
    .set('Authorization', auth(3, 'tester'))
    .expect(403);
  await request(app.getHttpServer())
    .patch('/api/projects/' + p.id)
    .set('Authorization', auth(2, 'tester'))
    .send({ assignedTesterId: 3 })
    .expect(403);
  for (const patch of [
    { startAt: null },
    { endAt: null },
    { endAt: '2025-01-01T00:00:00Z' },
  ]) {
    await request(app.getHttpServer())
      .patch('/api/projects/' + p.id)
      .set('Authorization', auth(1))
      .send(patch)
      .expect(400);
  }
  await request(app.getHttpServer())
    .patch('/api/projects/' + p.id)
    .set('Authorization', auth(1))
    .send({ assignedTesterId: null })
    .expect(200);
  await request(app.getHttpServer())
    .get('/api/users/testers')
    .set('Authorization', auth(2, 'tester'))
    .expect(403);
  const eligible = await request(app.getHttpServer())
    .get('/api/users/testers')
    .set('Authorization', auth(1))
    .expect(200);
  assert.deepEqual(eligible.body.map((u) => u.id).sort(), [2, 3]);
  await request(app.getHttpServer())
    .get('/api/users/notifications')
    .set('Authorization', auth(3, 'tester'))
    .expect(200)
    .then((r) => assert.ok(r.body.notifications.every((n) => n.userId === 3)));
});
void test('business writes increment persistent cache revision transactionally; rolled back writes do not', async () => {
  const revision = async () =>
    Number(
      (await db.db.query('SELECT revision FROM app_cache_revision')).rows[0]
        .revision,
    );
  const before = await revision();
  const p = await projects.create(valid());
  assert.ok((await revision()) > before);
  const after = await revision();
  await assert.rejects(projects.update(p.id, { assignedTesterId: 999 }));
  assert.equal(await revision(), after);
  await users.assignProject(2, { projectId: p.id });
  assert.ok((await revision()) > after);
});
void test('scheduler retries errors, prevents overlapping local scans, requires explicit worker opt-in, and cleans up', async () => {
  let calls = 0,
    release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const w = new ProjectDeadlinesService(
    {
      db: {
        query: async () => {
          calls++;
          await gate;
          throw new Error('isolated failure');
        },
      },
    },
    users,
  );
  const first = w.tick();
  await w.tick();
  assert.equal(calls, 1);
  release();
  await first;
  await w.tick();
  assert.equal(calls, 2);
  const startup = new ProjectDeadlinesService(db, users);
  startup.onApplicationBootstrap();
  assert.equal(startup.timer, undefined);
  process.env.ENABLE_PROJECT_DEADLINE_WORKER = 'true';
  try {
    startup.onApplicationBootstrap();
    assert.ok(startup.timer);
    assert.equal(startup.running, false);
  } finally {
    delete process.env.ENABLE_PROJECT_DEADLINE_WORKER;
  }
  startup.onModuleDestroy();
});

void test('deadline SSE event is scoped to its recipient; persistence failures roll back delivery state', async () => {
  const p = await projects.create(valid({ assignedTesterId: 2 }));
  const received = [], other = [];
  const a = users.getNotificationStream(2).subscribe(e => received.push(JSON.parse(e.data)));
  const b = users.getNotificationStream(3).subscribe(e => other.push(JSON.parse(e.data)));
  try {
    await db.db.query(`CREATE FUNCTION reject_deadline_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."titleEn" LIKE 'Project deadline passed:%' THEN RAISE EXCEPTION 'isolated delivery failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_deadline_test BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION reject_deadline_test();`);
    await assert.rejects(worker.deliverDue());
    assert.equal((await deadlines(p.id)).length, 0, 'failed notification must not mark delivery complete');
    await db.db.query('DROP TRIGGER reject_deadline_test ON notifications; DROP FUNCTION reject_deadline_test()');
    await worker.deliverDue();
    assert.ok(received.some(e => e.type === 'NOTIFICATION' && e.payload.projectId === p.id));
    assert.equal(other.some(e => e.type === 'NOTIFICATION' && e.payload.projectId === p.id), false);
    assert.equal((await notes(p.id)).length, 1);
  } finally { a.unsubscribe(); b.unsubscribe(); }
});

void test('Tester and Admin are equally eligible; assignment never grants administrative privileges', async () => {
  const list = await request(app.getHttpServer()).get('/api/users/assignable').set('Authorization', auth(1)).expect(200);
  assert.deepEqual(list.body.map(u => u.id).sort(), [1,2,3]);
  assert.equal(list.body.find(u => u.id === 1).role, 'admin');
  assert.equal(list.body.find(u => u.id === 2).role, 'tester');
  await request(app.getHttpServer()).get('/api/users/assignable').set('Authorization', auth(2, 'tester')).expect(403);
  await request(app.getHttpServer()).get('/api/users/assignable').expect(401);
  const legacyBefore = (await db.db.query('SELECT * FROM projects WHERE id=1')).rows[0];
  const testerBefore = (await db.db.query('SELECT id,name,email,role FROM users WHERE id=2')).rows[0];
  const adminBefore = (await db.db.query('SELECT id,name,email,role FROM users WHERE id=1')).rows[0];
  for (const recipient of [1,2]) {
    const created = await request(app.getHttpServer()).post('/api/projects').set('Authorization', auth(1)).send(valid({assignedTesterId:recipient})).expect(201);
    const id=created.body.id;
    assert.equal(created.body.assignedTesterId, recipient);
    await worker.deliverDue(); await new ProjectDeadlinesService(db, users).deliverDue();
    assert.equal((await deadlines(id)).length, 1);
    assert.equal((await notes(id))[0].userId, recipient);
    const inbox=await users.getNotifications(recipient);
    assert.ok(inbox.notifications.some(n=>n.projectId===id && n.titleEn?.startsWith('Project deadline')));
    await request(app.getHttpServer()).patch('/api/projects/'+id).set('Authorization', auth(2,'tester')).send({assignedTesterId:1}).expect(403);
    const next=recipient===1?2:1;
    await request(app.getHttpServer()).patch('/api/projects/'+id).set('Authorization', auth(1)).send({assignedTesterId:next}).expect(200);
    await worker.deliverDue(); assert.equal((await deadlines(id)).length,2);
    await request(app.getHttpServer()).patch('/api/projects/'+id).set('Authorization', auth(1)).send({assignedTesterId:null}).expect(200);
    await worker.deliverDue(); assert.equal((await deadlines(id)).length,2);
    assert.equal((await projects.findOne(id)).assignedTesterId,null);
  }
  assert.deepEqual((await db.db.query('SELECT * FROM projects WHERE id=1')).rows[0],legacyBefore);
  assert.deepEqual((await db.db.query('SELECT id,name,email,role FROM users WHERE id=2')).rows[0],testerBefore);
  assert.deepEqual((await db.db.query('SELECT id,name,email,role FROM users WHERE id=1')).rows[0],adminBefore);
});
