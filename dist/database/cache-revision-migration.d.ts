import type { Pool } from 'pg';
export declare function migrateCacheRevision(pool: Pool, dryRun?: boolean): Promise<{
    migration: string;
    alreadyApplied: boolean;
    dryRun: boolean;
}>;
