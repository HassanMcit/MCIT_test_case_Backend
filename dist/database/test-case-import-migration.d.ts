import type { Pool } from 'pg';
export declare function migrateTestCaseImports(pool: Pool, dryRun?: boolean): Promise<{
    migration: string;
    alreadyApplied: boolean;
    dryRun: boolean;
}>;
