const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertRuntimeSchemaReady } = require('../dist/database/runtime-schema');

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
