"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCTION_BACKEND_ORIGIN = exports.PRODUCTION_FRONTEND_ORIGIN = void 0;
exports.createCorsOptions = createCorsOptions;
const common_1 = require("@nestjs/common");
exports.PRODUCTION_FRONTEND_ORIGIN = 'https://mcit-test-case-front.vercel.app';
exports.PRODUCTION_BACKEND_ORIGIN = 'https://mcit-test-case-backend.onrender.com';
function createCorsOptions(additionalOrigins = '') {
    const origins = new Set([
        exports.PRODUCTION_FRONTEND_ORIGIN,
        exports.PRODUCTION_BACKEND_ORIGIN,
    ]);
    for (const entry of additionalOrigins
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)) {
        let url;
        try {
            url = new URL(entry);
        }
        catch {
            throw new Error('CORS_ALLOWED_ORIGINS must contain comma-separated exact HTTP(S) origins');
        }
        const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (entry !== url.origin ||
            url.username ||
            url.password ||
            url.hostname.includes('*') ||
            (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
            throw new Error('CORS_ALLOWED_ORIGINS requires HTTPS origins or explicit HTTP loopback origins, without paths, credentials or wildcards');
        }
        origins.add(entry);
    }
    return {
        origin: (origin, callback) => {
            if (origin === undefined)
                return callback(null, true);
            if (!origins.has(origin))
                return callback(new common_1.ForbiddenException('Origin is not allowed'), false);
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Cache-Control',
            'Accept',
        ],
        optionsSuccessStatus: 204,
        maxAge: 300,
    };
}
//# sourceMappingURL=cors.js.map