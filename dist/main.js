"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const app_module_1 = require("./app.module");
const cors_1 = require("./security/cors");
function classifyStartupFailure(error) {
    const msg = typeof error?.message === 'string' ? error.message : '';
    const rawCode = typeof error?.code === 'string' ? error.code : '';
    const safeCode = /^[A-Z0-9_]{2,32}$/.test(rawCode) ? rawCode : '';
    let reason = 'STARTUP_INITIALIZATION_FAILED';
    if (msg === 'DATABASE_URL_MISSING' ||
        msg === 'DATABASE_URL_INVALID_FORMAT' ||
        msg === 'SCHEMA_MIGRATION_REQUIRED' ||
        msg === 'SCHEMA_SECURITY_NOT_READY') {
        reason = msg;
    }
    else if (msg.startsWith('CORS_ALLOWED_ORIGINS')) {
        reason = 'CORS_CONFIG_INVALID';
    }
    else if (/timeout expired|Connection terminated due to connection timeout/i.test(msg)) {
        reason = 'DB_CONNECTION_TIMEOUT';
    }
    else if (/Connection terminated unexpectedly/i.test(msg)) {
        reason = 'DB_CONNECTION_CLOSED';
    }
    else if (safeCode === '28P01' || safeCode === '28000') {
        reason = 'DB_AUTH_FAILED';
    }
    else if (safeCode === '3D000') {
        reason = 'DB_DOES_NOT_EXIST';
    }
    else if (safeCode === '42P01') {
        reason = 'DB_RELATION_MISSING';
    }
    else if (safeCode === '42501') {
        reason = 'DB_PERMISSION_DENIED';
    }
    else if (safeCode === '57P01' || safeCode === '57P02' || safeCode === '57P03') {
        reason = 'DB_UNAVAILABLE';
    }
    else if (safeCode === 'ENOTFOUND' || safeCode === 'EAI_AGAIN') {
        reason = 'DB_DNS_LOOKUP_FAILED';
    }
    else if (safeCode === 'ECONNREFUSED') {
        reason = 'DB_CONNECTION_REFUSED';
    }
    else if (safeCode === 'ETIMEDOUT' ||
        safeCode === 'ECONNRESET' ||
        safeCode === 'EHOSTUNREACH' ||
        safeCode === 'ENETUNREACH') {
        reason = 'DB_NETWORK_ERROR';
    }
    else if (safeCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
        safeCode === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        safeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        safeCode === 'ERR_TLS_CERT_ALTNAME_INVALID') {
        reason = 'DB_TLS_VERIFICATION_FAILED';
    }
    return `Backend startup failed; review deployment configuration and server logs. [reason=${reason}${safeCode ? ` code=${safeCode}` : ''}]`;
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_1.json)({ limit: '200mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '200mb' }));
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
    app.useStaticAssets(uploadDir, { prefix: '/api/uploads/' });
    app.enableCors((0, cors_1.createCorsOptions)(process.env.CORS_ALLOWED_ORIGINS));
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
bootstrap().catch((error) => {
    console.error(classifyStartupFailure(error));
    process.exit(1);
});
//# sourceMappingURL=main.js.map