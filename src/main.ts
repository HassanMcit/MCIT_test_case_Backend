import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { createCorsOptions } from './security/cors';

function classifyStartupFailure(error: any): string {
  const msg = typeof error?.message === 'string' ? error.message : '';
  const rawCode = typeof error?.code === 'string' ? error.code : '';
  const safeCode = /^[A-Z0-9_]{2,32}$/.test(rawCode) ? rawCode : '';

  let reason = 'STARTUP_INITIALIZATION_FAILED';
  if (
    msg === 'DATABASE_URL_MISSING' ||
    msg === 'DATABASE_URL_INVALID_FORMAT' ||
    msg === 'SCHEMA_MIGRATION_REQUIRED' ||
    msg === 'SCHEMA_SECURITY_NOT_READY'
  ) {
    reason = msg;
  } else if (msg.startsWith('CORS_ALLOWED_ORIGINS')) {
    reason = 'CORS_CONFIG_INVALID';
  } else if (/timeout expired|Connection terminated due to connection timeout/i.test(msg)) {
    reason = 'DB_CONNECTION_TIMEOUT';
  } else if (/Connection terminated unexpectedly/i.test(msg)) {
    reason = 'DB_CONNECTION_CLOSED';
  } else if (safeCode === '28P01' || safeCode === '28000') {
    reason = 'DB_AUTH_FAILED';
  } else if (safeCode === '3D000') {
    reason = 'DB_DOES_NOT_EXIST';
  } else if (safeCode === '42P01') {
    reason = 'DB_RELATION_MISSING';
  } else if (safeCode === '42501') {
    reason = 'DB_PERMISSION_DENIED';
  } else if (safeCode === '57P01' || safeCode === '57P02' || safeCode === '57P03') {
    reason = 'DB_UNAVAILABLE';
  } else if (safeCode === 'ENOTFOUND' || safeCode === 'EAI_AGAIN') {
    reason = 'DB_DNS_LOOKUP_FAILED';
  } else if (safeCode === 'ECONNREFUSED') {
    reason = 'DB_CONNECTION_REFUSED';
  } else if (
    safeCode === 'ETIMEDOUT' ||
    safeCode === 'ECONNRESET' ||
    safeCode === 'EHOSTUNREACH' ||
    safeCode === 'ENETUNREACH'
  ) {
    reason = 'DB_NETWORK_ERROR';
  } else if (
    safeCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    safeCode === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    safeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    safeCode === 'ERR_TLS_CERT_ALTNAME_INVALID'
  ) {
    reason = 'DB_TLS_VERIFICATION_FAILED';
  }

  return `Backend startup failed; review deployment configuration and server logs. [reason=${reason}${safeCode ? ` code=${safeCode}` : ''}]`;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Body parser limit for large payloads ─────────────────────────
  app.use(json({ limit: '200mb' }));
  app.use(urlencoded({ extended: true, limit: '200mb' }));

  // ── Serve uploaded static files ──────────────────────────────────
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  app.useStaticAssets(uploadDir, { prefix: '/api/uploads/' });

  // ── CORS ─────────────────────────────────────────────────────────
  app.enableCors(createCorsOptions(process.env.CORS_ALLOWED_ORIGINS));

  // ── Global Validation Pipe ───────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown properties
      forbidNonWhitelisted: false,
      transform: true,       // auto-transform payload types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── API Prefix ───────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Swagger UI ───────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('QA Test Suite Manager API')
    .setDescription(
      'Backend REST API for the MCIT Quality Assurance Test Management System. ' +
      'Covers Auth, Dashboard analytics, Test Cases, Projects, and Users.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Authentication & session management')
    .addTag('Dashboard', 'KPI metrics and chart data')
    .addTag('Test Cases', 'Full CRUD for QA test cases')
    .addTag('Projects', 'Full CRUD for QA projects')
    .addTag('Users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 Backend running at http://localhost:${port}`);
  console.log(`📚 Swagger docs at  http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  // Fail closed before serving traffic. Log only allowlisted diagnostic codes,
  // never connection strings, hostnames, credentials, or raw exception text.
  console.error(classifyStartupFailure(error));
  process.exit(1);
});
