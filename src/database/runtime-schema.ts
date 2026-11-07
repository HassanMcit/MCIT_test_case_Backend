import type { Pool } from 'pg';

export function normalizeDatabaseUrl(raw?: string): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('DATABASE_URL_MISSING');
  }
  let value = raw.trim();
  if (/^psql\s+/i.test(value)) {
    value = value.replace(/^psql\s+/i, '').trim();
  }
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1).trim();
  }
  const envPrefixMatch = value.match(
    /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(postgres(?:ql)?:\/\/.+)$/i,
  );
  if (envPrefixMatch) {
    value = envPrefixMatch[1].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1).trim();
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('DATABASE_URL_INVALID_FORMAT');
  }
  if (
    (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') ||
    !parsed.hostname
  ) {
    throw new Error('DATABASE_URL_INVALID_FORMAT');
  }

  const sslmode = parsed.searchParams.get('sslmode');
  const compat = parsed.searchParams.get('uselibpqcompat');
  if (
    !compat &&
    (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'verify-ca')
  ) {
    parsed.searchParams.set('sslmode', 'verify-full');
    return parsed.toString();
  }

  return value;
}

async function connectWithColdStartRetry(pool: Pool) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await pool.connect();
    } catch (error: any) {
      lastError = error;
      const code = typeof error?.code === 'string' ? error.code : '';
      const msg = typeof error?.message === 'string' ? error.message : '';
      const isTransientWakeup =
        code === '57P03' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNRESET' ||
        /timeout expired|Connection terminated/i.test(msg);
      if (!isTransientWakeup || attempt === 2) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw lastError;
}

// Fail closed on an unprepared database. Never repair schema or seed data at startup.
export async function assertRuntimeSchemaReady(pool: Pool) {
  const db = await connectWithColdStartRetry(pool);
  try {
    await db.query('BEGIN READ ONLY');
    await db.query("SET LOCAL statement_timeout = '10s'");
    await db.query(`SELECT "testCaseId","projectId","sourceKey","sourceTestId",
      "sourceRow","rowHash","batchHash",original,"plannedAt","plannedTimezone",
      "importedById","importedAt" FROM test_case_imports LIMIT 0`);
    await db.query('SELECT id FROM test_cases_current LIMIT 0');
    const markers = await db.query(
      `SELECT name FROM schema_migrations WHERE name=ANY($1::text[])`,
      [['20261105_test_case_imports_v1']],
    );
    if (markers.rows.length !== 1) throw new Error('SCHEMA_MIGRATION_REQUIRED');
    const security = await db.query(`SELECT c.relrowsecurity AS rls,
      (c.relowner=r.oid OR r.rolsuper OR r.rolbypassrls) AS backend_access,
      (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies
      FROM pg_class c JOIN pg_roles r ON r.rolname=current_user
      WHERE c.oid='public.test_case_imports'::regclass`);
    const row = security.rows[0];
    if (!row?.rls || !row.backend_access || row.policies !== 0)
      throw new Error('SCHEMA_SECURITY_NOT_READY');
  } finally {
    try {
      await db.query('ROLLBACK');
    } finally {
      db.release();
    }
  }
}
