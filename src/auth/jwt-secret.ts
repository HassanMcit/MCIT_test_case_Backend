import { randomBytes } from 'node:crypto';

let localEphemeralSecret: string | undefined;

export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.JWT_SECRET?.trim();
  if (configured) return configured;

  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be explicitly configured before starting in production.');
  }

  // Non-production runs get an unpredictable process-local secret instead of a
  // reusable fallback. Staging has NODE_ENV=production and must set JWT_SECRET.
  localEphemeralSecret ??= randomBytes(32).toString('base64url');
  return localEphemeralSecret;
}
