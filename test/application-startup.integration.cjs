const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const path = require('node:path');

void test(
  'production entrypoint cold-start resolves DI and preserves 73 cases; real HTTP authentication and CRUD work',
  { timeout: 45000 },
  async () => {
    const child = fork(path.resolve(__dirname, '../dist/main.js'), [], {
      execArgv: [
        '--require',
        path.resolve(__dirname, 'production-startup.fixture.cjs'),
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '0',
        DATABASE_URL: 'postgresql://unused.invalid/test',
        JWT_SECRET: 'isolated-startup-key',
        ENABLE_PROJECT_DEADLINE_WORKER: 'false',
        CORS_ALLOWED_ORIGINS: '',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let logs = '';
    child.stdout.on('data', (c) => {
      logs = (logs + c).slice(-6000);
    });
    child.stderr.on('data', (c) => {
      logs = (logs + c).slice(-6000);
    });
    const message = (type) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Startup timeout: ${logs}`));
        }, 30000);
        const handler = (m) => {
          if (m.type === type) {
            cleanup();
            resolve(m);
          }
        };
        const exit = (code) => {
          cleanup();
          reject(new Error(`Entrypoint exited ${code}: ${logs}`));
        };
        function cleanup() {
          clearTimeout(timer);
          child.off('message', handler);
          child.off('exit', exit);
        }
        child.on('message', handler);
        child.once('exit', exit);
      });
    try {
      const ready = await message('ready');
      assert.deepEqual(ready.writes, []);
      assert.deepEqual(ready.after, ready.before);
      assert.equal(ready.after.count, 73);
      assert.equal(ready.after.protectedCase.testId, 'TC-0004');
      assert.equal(ready.after.protectedCase.pageName, 'حركات المركبة');
      const base = `http://127.0.0.1:${ready.port}/api`;
      const call = async (route, method = 'GET', body, token) => {
        const r = await fetch(base + route, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: r.status, body: await r.json() };
      };
      assert.equal((await call('/test-cases')).status, 401);
      assert.equal(
        (await call('/test-cases/bulk-import/garage/status')).status,
        401,
      );
      const admin = await call('/auth/login', 'POST', {
        email: 'admin@example.test',
        password: 'isolated-startup-password',
      });
      assert.equal(admin.status, 200);
      const token = admin.body.access_token;
      assert.ok(token);
      const tester = await call('/auth/login', 'POST', {
        email: 'tester@example.test',
        password: 'isolated-startup-password',
      });
      assert.equal(tester.status, 200);
      assert.equal(
        (
          await call(
            '/test-cases/bulk-import/garage/status',
            'GET',
            undefined,
            tester.body.access_token,
          )
        ).status,
        403,
      );
      assert.equal(
        (await call('/test-cases?limit=100', 'GET', undefined, token)).body.meta
          .total,
        73,
      );
      assert.equal(
        (await call('/test-cases/107', 'GET', undefined, token)).body.testId,
        'TC-0004',
      );
      const outsider = await call('/auth/login', 'POST', {
        email: 'outsider@example.test',
        password: 'isolated-startup-password',
      });
      assert.equal(
        (
          await call(
            '/test-cases/107',
            'GET',
            undefined,
            outsider.body.access_token,
          )
        ).status,
        403,
      );
      const created = await call(
        '/projects',
        'POST',
        {
          name: 'Isolated CRUD project',
          application: 'Isolated App',
          startAt: '2026-11-05T08:00:00Z',
          endAt: '2026-11-05T10:00:00Z',
        },
        token,
      );
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const id = created.body.id;
      assert.equal(
        (
          await call(
            `/projects/${id}`,
            'PATCH',
            { description: 'Isolated update' },
            token,
          )
        ).status,
        200,
      );
      assert.equal(
        (await call(`/projects/${id}`, 'DELETE', undefined, token)).status,
        200,
      );
      assert.equal(
        (await call('/test-cases?limit=100', 'GET', undefined, token)).body.meta
          .total,
        73,
      );
      const waiting = message('snapshot');
      child.send('snapshot');
      const final = (await waiting).value;
      assert.deepEqual(final.protectedCase, ready.before.protectedCase);
      assert.equal(final.casesHash, ready.before.casesHash);
      assert.equal(final.count, 73);
    } finally {
      child.kill();
    }
  },
);
