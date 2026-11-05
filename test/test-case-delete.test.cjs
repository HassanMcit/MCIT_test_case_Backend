const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/test-cases/test-cases.service.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: (name) => name === '@nestjs/common' ? require(name) : {},
});

function setup(hasCycle = false, denied = false) {
  const queries = [];
  const db = {
    query: async (sql, values) => {
      queries.push({ sql, values });
      return { rows: [], rowCount: sql.includes('UNION ALL') && hasCycle ? 1 : 0 };
    },
  };
  const workflow = {
    caseAccess: async () => { if (denied) throw new Error('Access denied'); },
    transaction: async (run) => run(db),
  };
  return { service: new moduleExports.TestCasesService({ db }, workflow), queries };
}

void test('standalone deletion removes legacy/compatibility results before the definition', async () => {
  const { service, queries } = setup();
  await service.remove(42, { id: 1, role: 'admin' });
  const deletes = queries.filter(({ sql }) => sql.startsWith('DELETE'));
  assert.equal(deletes.length, 2);
  assert.match(deletes[0].sql, /DELETE FROM test_executions/);
  assert.match(deletes[0].sql, /source IN \('legacy', 'compatibility'\)/);
  assert.match(deletes[0].sql, /"cycleItemId" IS NULL/);
  assert.match(deletes[1].sql, /DELETE FROM test_cases/);
  for (const query of queries) assert.deepEqual(Array.from(query.values), [42]);
});

void test('cycle history still prevents deletion of any records', async () => {
  const { service, queries } = setup(true);
  await assert.rejects(service.remove(42, { id: 1, role: 'admin' }), (error) => error.status === 409);
  assert.equal(queries.some(({ sql }) => sql.startsWith('DELETE')), false);
});

void test('unauthorized deletion does not write to the database', async () => {
  const { service, queries } = setup(false, true);
  await assert.rejects(service.remove(42, { id: 2, role: 'tester' }), /Access denied/);
  assert.equal(queries.length, 0);
});
