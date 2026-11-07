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

async function startup({ factoryFails = false, failure, origins = '' } = {}) {
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
          if (failure) throw failure;
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
  assert.match(rejected.errors[0], /\[reason=STARTUP_INITIALIZATION_FAILED\]/);
  const invalid = await startup({ origins: '*' });
  assert.deepEqual(invalid.exits, [1]);
  assert.equal(invalid.listened, false);
  assert.match(invalid.errors[0], /\[reason=CORS_CONFIG_INVALID\]/);
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

void test('startup diagnostics classify database failures without exposing raw secrets', async () => {
  for (const [code, reason] of [
    ['28P01', 'DB_AUTH_FAILED'], ['57P03', 'DB_UNAVAILABLE'],
    ['ETIMEDOUT', 'DB_NETWORK_ERROR'], ['ENOTFOUND', 'DB_DNS_LOOKUP_FAILED'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'DB_TLS_VERIFICATION_FAILED'],
    ['secret://private-host/password', 'STARTUP_INITIALIZATION_FAILED'],
  ]) {
    const failure = Object.assign(new Error('private-host password sensitive-detail'), { code });
    const result = await startup({ failure });
    assert.deepEqual(result.exits, [1]);
    assert.equal(result.listened, false);
    assert.match(result.errors[0], new RegExp('reason=' + reason));
    assert.doesNotMatch(result.errors[0], /private-host|password|sensitive-detail|secret:/);
  }
  const timedOut = await startup({ failure: new Error('timeout expired: sensitive-detail') });
  assert.match(timedOut.errors[0], /reason=DB_CONNECTION_TIMEOUT/);
  assert.doesNotMatch(timedOut.errors[0], /sensitive-detail/);
});
