"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.setGlobalPrefix('api');
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('QA Test Suite Manager API')
        .setDescription('Backend REST API for the MCIT Quality Assurance Test Management System. ' +
        'Covers Auth, Dashboard analytics, Test Cases, Projects, and Users.')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
        .addTag('Auth', 'Authentication & session management')
        .addTag('Dashboard', 'KPI metrics and chart data')
        .addTag('Test Cases', 'Full CRUD for QA test cases')
        .addTag('Projects', 'Full CRUD for QA projects')
        .addTag('Users', 'User management')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`🚀 Backend running at http://localhost:${port}`);
    console.log(`📚 Swagger docs at  http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map