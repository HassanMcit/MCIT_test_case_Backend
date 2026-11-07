import type { Pool } from 'pg';
export declare function normalizeDatabaseUrl(raw?: string): string;
export declare function assertRuntimeSchemaReady(pool: Pool): Promise<void>;
