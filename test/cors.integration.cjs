// Actual Nest CORS middleware, Passport JWT strategy and database-backed roles.
// No production app startup, external network, database or credentials.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const {
  Controller,
  Get,
  Post,
  Req,
  ForbiddenException,
} = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  createCorsOptions,
  PRODUCTION_FRONTEND_ORIGIN: production,
  PRODUCTION_BACKEND_ORIGIN: backend,
} = require('../dist/security/cors');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');
const { Public } = require('../dist/auth/public.decorator');
const { DatabaseService } = require('../dist/database/database.service');
const secret = 'isolated-cors-tests-only-not-production';
const preview = 'https://trusted-preview.example.test';
const developer = 'http://localhost:3000';
let app,
  writes = 0;
class ProbeController {
  public() {
    return { ok: true };
  }
  write(req) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    writes++;
    return { ok: true };
  }
}
Controller('probe')(ProbeController);
Get('public')(
  ProbeController.prototype,
  'public',
  Object.getOwnPropertyDescriptor(ProbeController.prototype, 'public'),
);
Public()(
  ProbeController.prototype,
  'public',
  Object.getOwnPropertyDescriptor(ProbeController.prototype, 'public'),
);
Post('write')(
  ProbeController.prototype,
  'write',
  Object.getOwnPropertyDescriptor(ProbeController.prototype, 'write'),
);
Req()(ProbeController.prototype, 'write', 0);
const token = (id = 1, role = 'admin') =>
  'Bearer ' + jwt.sign({ sub: id, role }, secret, { expiresIn: '1h' });
const write = (origin) => {
  const req = request(app.getHttpServer()).post('/probe/write');
  return origin === undefined ? req : req.set('Origin', origin);
};
before(async () => {
  process.env.JWT_SECRET = secret;
  const module = await Test.createTestingModule({
    controllers: [ProbeController],
    providers: [
      JwtStrategy,
      {
        provide: DatabaseService,
        useValue: {
          db: {
            query: async (_sql, params) => ({
              rows:
                params[0] === 1
                  ? [
                      {
                        id: 1,
                        name: 'Local Admin',
                        role: 'admin',
                        minTokenIat: 0,
                      },
                    ]
                  : [
                      {
                        id: 2,
                        name: 'Local Tester',
                        role: 'tester',
                        minTokenIat: 0,
                      },
                    ],
            }),
          },
        },
      },
    ],
  }).compile();
  app = module.createNestApplication();
  app.enableCors(createCorsOptions(`${preview},${developer}`));
  app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
  app.useLogger(false);
  await app.init();
});
after(async () => {
  if (app) await app.close();
});

void test('production, explicit preview and explicit development preflights allow bearer JSON requests', async () => {
  for (const origin of [production, backend, preview, developer]) {
    const r = await request(app.getHttpServer())
      .options('/probe/write')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);
    assert.equal(r.headers['access-control-allow-origin'], origin);
    assert.equal(r.headers['access-control-allow-credentials'], 'true');
    assert.match(r.headers.vary, /Origin/);
    assert.match(r.headers['access-control-allow-headers'], /Authorization/);
    assert.match(r.headers['access-control-allow-methods'], /POST/);
    assert.equal(r.headers['access-control-max-age'], '300');
  }
});
void test('untrusted origins, suffix lookalikes, unconfigured previews and null origins are rejected before handlers', async () => {
  const before = writes;
  for (const origin of [
    'https://untrusted.example',
    `${production}.evil.example`,
    'https://other-preview.vercel.app',
    'null',
    'http://localhost:3001',
    `${production}/path`,
  ]) {
    const preflight = await request(app.getHttpServer())
      .options('/probe/write')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(403);
    assert.equal(preflight.headers['access-control-allow-origin'], undefined);
    assert.equal(
      preflight.headers['access-control-allow-credentials'],
      undefined,
    );
    await write(origin).set('Authorization', token()).send({}).expect(403);
  }
  assert.equal(writes, before);
});
void test('CORS does not replace JWT authentication or current-role administrator authorization', async () => {
  await write(production).send({}).expect(401);
  await write(production)
    .set('Cookie', 'authjs.session-token=local-placeholder')
    .send({})
    .expect(401);
  await write(production)
    .set('Authorization', 'Bearer invalid-local-test-token')
    .send({})
    .expect(401);
  await write(production)
    .set('Authorization', token(2, 'admin'))
    .send({})
    .expect(403);
  const r = await write(production)
    .set('Authorization', token())
    .send({})
    .expect(201);
  assert.equal(r.headers['access-control-allow-origin'], production);
  assert.equal(r.body.ok, true);
});
void test('Origin-less server-to-server calls remain functional and still require bearer authentication', async () => {
  await write().send({}).expect(401);
  const r = await write().set('Authorization', token()).send({}).expect(201);
  assert.equal(r.headers['access-control-allow-origin'], undefined);
  await request(app.getHttpServer()).get('/probe/public').expect(200);
});
void test('cross-origin form submissions cannot mutate protected routes; preflights never execute handlers', async () => {
  const before = writes;
  await write('https://untrusted.example')
    .type('form')
    .send({ value: 'csrf' })
    .expect(403);
  await write(production).type('form').send({ value: 'csrf' }).expect(401);
  await request(app.getHttpServer())
    .options('/probe/write')
    .set('Origin', production)
    .set('Access-Control-Request-Method', 'POST')
    .expect(204);
  assert.equal(writes, before);
});
void test('default configuration trusts production services; invalid allowlist configuration fails closed', () => {
  const defaults = createCorsOptions();
  defaults.origin(developer, (error, allowed) => {
    assert.equal(error.status, 403);
    assert.equal(allowed, false);
  });
  defaults.origin(production, (error, allowed) => {
    assert.equal(error, null);
    assert.equal(allowed, true);
  });
  defaults.origin(backend, (error, allowed) => {
    assert.equal(error, null);
    assert.equal(allowed, true);
  });
  for (const value of [
    '*',
    'https://*.vercel.app',
    'null',
    'https://trusted.example/path',
    'https://user:password@example.test',
    'http://preview.example.test',
    'https://trusted.example?x=1',
    'https://trusted.example#fragment',
  ])
    assert.throws(() => createCorsOptions(value), /CORS_ALLOWED_ORIGINS/);
});
