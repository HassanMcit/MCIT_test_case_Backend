// Test-only preload. The production entrypoint, modules and guards are unmodified.
const path = require('node:path');
const { createHash } = require('node:crypto');
const { PGlite } = require(
  process.env.PGLITE_MODULE ||
    path.resolve(
      __dirname,
      '../../.qa-test-tools/node_modules/@electric-sql/pglite',
    ),
);
const pg = new PGlite();
let startup = true;
const writes = [];
const query = async (sql, params) => {
  const result = params
    ? await pg.query(sql, params)
    : (await pg.exec(sql)).at(-1) || { rows: [] };
  return {
    ...result,
    rowCount: Math.max(result.affectedRows || 0, result.rows?.length || 0),
  };
};
const raw = {
  query,
  connect: async () => ({ query, release() {} }),
  end: async () => {},
};
const snapshot = async () => {
  const tables = {};
  for (const table of [
    'test_cases',
    'users',
    'projects',
    'project_assignments',
    'schema_migrations',
    'test_case_imports',
    'app_cache_revision',
  ]) {
    tables[table] = (await query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
  }
  return {
    hash: createHash('sha256').update(JSON.stringify(tables)).digest('hex'),
    casesHash: createHash('sha256')
      .update(JSON.stringify(tables.test_cases))
      .digest('hex'),
    count: tables.test_cases.length,
    protectedCase: tables.test_cases.find((r) => r.id === 107),
  };
};
let before;
const ready = (async () => {
  await pg.waitReady;
  const { DatabaseService } = require('../dist/database/database.service');
  const database = new DatabaseService();
  database.db = raw;
  await database.initTables();
  for (const [file, method] of [
    ['workflow', 'migrateWorkflow'],
    ['project-deadlines', 'migrateProjectDeadlines'],
    ['cache-revision', 'migrateCacheRevision'],
    ['test-case-import', 'migrateTestCaseImports'],
  ]) {
    await require(`../dist/database/${file}-migration`)[method](raw);
  }
  const password = await require('bcryptjs').hash(
    'isolated-startup-password',
    4,
  );
  await query(
    `INSERT INTO users(id,name,email,password,role) VALUES
    (1,'Hassan Ali','admin@example.test',$1,'admin'),
    (3515,'Alaa Eldin Mohsen','tester@example.test',$1,'tester'),
    (3,'Outsider','outsider@example.test',$1,'tester')`,
    [password],
  );
  await query(`INSERT INTO projects(id,name,application) VALUES (2,'Existing Project','Existing App'),(14,'Testing Garage System','Garage System');
    INSERT INTO project_assignments("projectId","userId") VALUES (14,3515),(14,1);
    INSERT INTO test_cases(id,"testId",module,"pageName",scenario,steps,"expectedResult","testerId","projectId","createdAt","updatedAt")
    SELECT n,'LEGACY_'||n,'Existing App','Page '||n,'Existing scenario '||n,'["Existing step"]','Existing expected',1,2,'2026-01-01','2026-01-01' FROM generate_series(1,72) n;
    INSERT INTO test_cases(id,"testId",module,"pageName",scenario,steps,"expectedResult","testerId","projectId","createdAt","updatedAt") VALUES
    (107,'TC-0004','Garage System','حركات المركبة','Protected existing case','["Protected existing step"]','Protected existing result',3515,14,'2026-01-01','2026-01-01');
    SELECT setval(pg_get_serial_sequence('test_cases','id'),107);
    SELECT setval(pg_get_serial_sequence('projects','id'),14);`);
  before = await snapshot();
})();
const guarded = async (sql, params) => {
  await ready;
  if (
    startup &&
    (/^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i.test(
      sql,
    ) ||
      /\b(setval|nextval)\s*\(/i.test(sql))
  ) {
    writes.push(sql.trim().split(/\s+/)[0]);
    throw new Error('Startup attempted a database mutation');
  }
  return query(sql, params);
};
require('pg').Pool = class {
  query = guarded;
  async connect() {
    await ready;
    return { query: guarded, release() {} };
  }
  async end() {}
};
// No external network calls from auth geolocation in this isolated child.
global.fetch = async () => {
  throw new Error('External network disabled in fixture');
};
const { Server } = require('node:http');
const listen = Reflect.get(Server.prototype, 'listen');
Server.prototype.listen = function (...args) {
  this.once('listening', () => {
    startup = false;
    void snapshot()
      .then((after) =>
        process.send({
          type: 'ready',
          port: this.address().port,
          before,
          after,
          writes,
        }),
      )
      .catch(() => process.exit(2));
  });
  return listen.apply(this, args);
};
process.on('message', (message) => {
  if (message === 'snapshot')
    void snapshot()
      .then((value) => process.send({ type: 'snapshot', value }))
      .catch(() => process.exit(2));
});
