import { ForbiddenException } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const PRODUCTION_FRONTEND_ORIGIN =
  'https://mcit-test-case-front.vercel.app';
export const PRODUCTION_BACKEND_ORIGIN =
  'https://mcit-test-case-backend.onrender.com';

// Additional origins are exact, explicitly trusted origins; never regexes,
// suffix matches, wildcard previews or automatic localhost allowances.
export function createCorsOptions(additionalOrigins = ''): CorsOptions {
  // Preserve same-origin Swagger "Try it out" calls, which also send Origin
  // on POST. This is an exact trusted service origin, not a host-header match.
  const origins = new Set([
    PRODUCTION_FRONTEND_ORIGIN,
    PRODUCTION_BACKEND_ORIGIN,
  ]);
  for (const entry of additionalOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)) {
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error(
        'CORS_ALLOWED_ORIGINS must contain comma-separated exact HTTP(S) origins',
      );
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      entry !== url.origin ||
      url.username ||
      url.password ||
      url.hostname.includes('*') ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    ) {
      throw new Error(
        'CORS_ALLOWED_ORIGINS requires HTTPS origins or explicit HTTP loopback origins, without paths, credentials or wildcards',
      );
    }
    origins.add(entry);
  }
  return {
    origin: (origin, callback) => {
      // CLI / Next.js server-to-server calls do not send Origin. They still
      // pass through the same JWT and database-backed authorization guards.
      if (origin === undefined) return callback(null, true);
      if (!origins.has(origin))
        return callback(new ForbiddenException('Origin is not allowed'), false);
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
