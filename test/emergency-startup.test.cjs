// Isolated startup test: no network, production credentials or database writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

for (const setting of [undefined, 'false']) {
  test(`emergency startup skips every migration, seed and schema write (${setting})`, async () => {
    const queries = [];
    const code = ts.transpileModule(
      fs.readFileSync(require.resolve('../src/database/database.service.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } },
    ).outputText;
    const module = { exports: {} };
    vm.runInNewContext(code, {
      exports: module.exports, module,
      process: { env: { DATABASE_URL: 'synthetic', ALLOW_DATABASE_BOOTSTRAP: setting } },
      console: { log() {}, error() {} },
      require(name) {
        if (name === 'pg') return { Pool: class {
          async query(sql) { queries.push(sql); return { rows: [] }; }
        } };
        if (name.startsWith('./')) return new Proxy({}, { get() {
          return () => { throw Error('Migration/import must never execute'); };
        } });
        return require(name);
      },
    });
    const instance = new module.exports.DatabaseService();
    instance.initTables = instance.seedInitialData = () => { throw Error('Bootstrap must never execute'); };
    await instance.onModuleInit();
    assert.deepEqual(queries, ['SELECT 1']);
  });
}
