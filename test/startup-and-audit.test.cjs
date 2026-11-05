const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { of, lastValueFrom } = require('rxjs');
const {
  AuditLogInterceptor,
} = require('../dist/audit-logs/audit-log.interceptor');
const { createCorsOptions } = require('../dist/security/cors');
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function startup({ factoryFails = false, origins = '' } = {}) {
  const exits = [],
    errors = [];
  let listened = false;
  const app = {
    use() {},
    useStaticAssets() {},
    enableCors() {},
    useGlobalPipes() {},
    setGlobalPrefix() {},
    async listen() {
      listened = true;
    },
  };
  const code = ts.transpileModule(
    fs.readFileSync(require.resolve('../src/main.ts'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
      },
    },
  ).outputText;
  const mocks = {
    '@nestjs/core': {
      NestFactory: {
        create: async () => {
          if (factoryFails)
            throw new Error('sensitive-initialization-error-not-for-logs');
          return app;
        },
      },
    },
    '@nestjs/common': { ValidationPipe: class {} },
    '@nestjs/swagger': {
      SwaggerModule: { createDocument: () => ({}), setup() {} },
      DocumentBuilder: class {
        setTitle() {
          return this;
        }
        setDescription() {
          return this;
        }
        setVersion() {
          return this;
        }
        addBearerAuth() {
          return this;
        }
        addTag() {
          return this;
        }
        build() {
          return {};
        }
      },
    },
    '@nestjs/platform-express': {},
    express: { json() {}, urlencoded() {} },
    path: require('node:path'),
    fs: {
      existsSync: () => true,
      mkdirSync: () => {
        throw new Error('Filesystem writes prohibited');
      },
    },
    './app.module': { AppModule: class {} },
    './security/cors': { createCorsOptions },
  };
  vm.runInNewContext(code, {
    exports: {},
    require: (name) => {
      assert.ok(name in mocks, `Unmocked startup dependency ${name}`);
      return mocks[name];
    },
    process: {
      env: { PORT: '3001', CORS_ALLOWED_ORIGINS: origins },
      cwd: () => '/isolated-test',
      exit: (code) => exits.push(code),
    },
    console: { log() {}, error: (...args) => errors.push(args.join(' ')) },
  });
  await tick();
  return { exits, errors, listened };
}

void test('startup handles rejected initialization and invalid CORS safely; valid startup still listens', async () => {
  const rejected = await startup({ factoryFails: true });
  assert.deepEqual(rejected.exits, [1]);
  assert.equal(rejected.listened, false);
  assert.equal(rejected.errors.length, 1);
  assert.doesNotMatch(rejected.errors[0], /sensitive-initialization/);
  const invalid = await startup({ origins: '*' });
  assert.deepEqual(invalid.exits, [1]);
  assert.equal(invalid.listened, false);
  const valid = await startup();
  assert.equal(valid.listened, true);
  assert.deepEqual(valid.exits, []);
  assert.deepEqual(valid.errors, []);
});

void test('audit logging remains fire-and-forget and contains writer failures without changing the response', async () => {
  let finishAudit,
    logStarted = false;
  const service = {
    resolveLocation: async () => 'Local fixture',
    log: () => {
      logStarted = true;
      return new Promise((resolve) => {
        finishAudit = resolve;
      });
    },
  };
  const interceptor = new AuditLogInterceptor(service);
  const req = {
    method: 'POST',
    originalUrl: '/api/test-cases',
    headers: {},
    body: {},
    ip: '127.0.0.1',
    user: { id: 1, name: 'Fixture', role: 'admin' },
  };
  const context = { switchToHttp: () => ({ getRequest: () => req }) };
  const response = { ok: true };
  assert.deepEqual(
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of(response) }),
    ),
    response,
  );
  await tick();
  assert.equal(logStarted, true);
  finishAudit();
  await tick();
  const errors = [],
    originalError = console.error;
  service.log = async () => {
    throw new Error('isolated audit writer failure');
  };
  console.error = (...args) => errors.push(args[0]);
  try {
    assert.deepEqual(
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(response) }),
      ),
      response,
    );
    await tick();
    assert.equal(errors.length, 1);
    assert.equal(errors[0], 'AuditLogInterceptor error:');
  } finally {
    console.error = originalError;
  }
});
