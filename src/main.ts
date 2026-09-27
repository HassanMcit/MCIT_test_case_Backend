import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── CORS ─────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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

bootstrap();
