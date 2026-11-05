import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { createCorsOptions } from './security/cors';

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

bootstrap().catch(() => {
  // Fail closed before serving traffic. Do not log connection strings or
  // arbitrary exception messages from configuration/database initialization.
  console.error('Backend startup failed; review deployment configuration and server logs.');
  process.exit(1);
});
