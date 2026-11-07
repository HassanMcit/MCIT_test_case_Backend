const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertRuntimeSchemaReady,
  normalizeDatabaseUrl,
} = require('../dist/database/runtime-schema');

for (const [label, security, missing] of [
  ['matching schema', { rls: true, backend_access: true, policies: 0 }, false],
  ['disabled RLS', { rls: false, backend_access: true, policies: 0 }, false],
  [
    'unexpected client policy',
    { rls: true, backend_access: true, policies: 1 },
    false,
  ],
  [
    'backend role cannot access rows',
    { rls: true, backend_access: false, policies: 0 },
    false,
  ],
  [
    'missing migration ledger entry',
    { rls: true, backend_access: true, policies: 0 },
    true,
  ],
]) {
  const testLabel = typeof label === "string" ? label : "Invalid fixture";
  void test(`startup schema check: ${testLabel}; always read-only with connection released`, async () => {
    const statements = [];
    let released = false;
    const pool = {
      connect: async () => ({
        query: async (sql) => {
          statements.push(sql);
          if (sql.includes('SELECT name FROM schema_migrations'))
            return {
              rows: missing ? [] : [{ name: '20261105_test_case_imports_v1' }],
            };
          if (sql.includes('FROM pg_class c')) return { rows: [security] };
          return { rows: [] };
        },
        release() {
          released = true;
        },
      }),
    };
    if (label === 'matching schema') await assertRuntimeSchemaReady(pool);
    else await assert.rejects(assertRuntimeSchemaReady(pool), /SCHEMA_/);
    assert.equal(statements[0], 'BEGIN READ ONLY');
    assert.equal(statements.at(-1), 'ROLLBACK');
    assert.equal(
      statements.some((s) =>
        /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i.test(
          s,
        ),
      ),
      false,
    );
    assert.equal(released, true);
  });
}

void test('normalizeDatabaseUrl cleans env prefixes, psql wrappers, quotes, and upgrades sslmode=require to verify-full', () => {
  assert.throws(() => normalizeDatabaseUrl(''), /DATABASE_URL_MISSING/);
  assert.throws(
    () => normalizeDatabaseUrl('not-a-valid-url'),
    /DATABASE_URL_INVALID_FORMAT/,
  );
  assert.throws(
    () => normalizeDatabaseUrl('https://example.com/db'),
    /DATABASE_URL_INVALID_FORMAT/,
  );

  const clean = normalizeDatabaseUrl(
    'postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  );
  assert.equal(
    clean,
    'postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require',
  );

  const fromEnvLine = normalizeDatabaseUrl(
    'STAGING_DB_URL=postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require',
  );
  assert.equal(
    fromEnvLine,
    'postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech:5432/neondb?sslmode=verify-full',
  );

  const fromPsql = normalizeDatabaseUrl(
    "psql 'postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=require'",
  );
  assert.equal(
    fromPsql,
    'postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full',
  );
});

void test('cold-start retries transient connections once, never retries authentication failures', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const error of [Object.assign(new Error('waking'), {code:'57P03'}), Object.assign(new Error('network'), {code:'ETIMEDOUT'}), Object.assign(new Error('reset'), {code:'ECONNRESET'}), new Error('timeout expired')]) {
    let attempts = 0;
    const pool = { connect: async () => { attempts++; throw error; } };
    const pending = assert.rejects(assertRuntimeSchemaReady(pool), (e) => e === error);
    await Promise.resolve();
    assert.equal(attempts, 1);
    t.mock.timers.tick(1499);
    await Promise.resolve();
    assert.equal(attempts, 1);
    t.mock.timers.tick(1);
    await pending;
    assert.equal(attempts, 2);
  }
  let attempts = 0;
  const auth = Object.assign(new Error('auth'), { code: '28P01' });
  await assert.rejects(assertRuntimeSchemaReady({connect: async () => { attempts++; throw auth; }}), (e) => e === auth);
  assert.equal(attempts, 1);
});

void test('database initialization passes normalized URL and 30-second timeout and only verifies schema', async () => {
  const pg = require('pg');
  const originalPool = pg.Pool;
  const previousUrl = process.env.DATABASE_URL;
  let options;
  const statements = [];
  pg.Pool = class {
    constructor(config) { options = config; }
    async connect() { return {
      query: async (sql) => {
        statements.push(sql);
        if (sql.includes('SELECT name')) return { rows: [{name:'20261105_test_case_imports_v1'}] };
        if (sql.includes('FROM pg_class')) return { rows: [{rls:true,backend_access:true,policies:0}] };
        return {rows:[]};
      }, release() {},
    }; }
  };
  const modulePath = require.resolve('../dist/database/database.service');
  delete require.cache[modulePath];
  try {
    process.env.DATABASE_URL = ' postgres://fixture.invalid/test?sslmode=require ';
    const { DatabaseService } = require(modulePath);
    const service = new DatabaseService();
    service.initTables = async () => { throw new Error('Automatic DDL prohibited'); };
    await service.onModuleInit();
    assert.equal(options.connectionTimeoutMillis, 30000);
    assert.equal(options.connectionString, 'postgres://fixture.invalid/test?sslmode=verify-full');
    assert.equal(statements[0], 'BEGIN READ ONLY');
    assert.equal(statements.at(-1), 'ROLLBACK');
    assert.ok(statements.every((sql) => /^\s*(SELECT|BEGIN READ ONLY|SET LOCAL|ROLLBACK)\b/i.test(sql)));
  } finally {
    pg.Pool = originalPool;
    delete require.cache[modulePath];
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
});
