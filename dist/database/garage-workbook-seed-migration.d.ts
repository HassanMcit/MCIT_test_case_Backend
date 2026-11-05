import type { Pool } from 'pg';
export declare const GARAGE_WORKBOOK_SEED_MIGRATION = "20261105_garage_workbook_seed_v1";
export declare function migrateGarageWorkbookSeed(pool: Pool, dryRun?: boolean): Promise<{
    migration: string;
    skipped: boolean;
    reason: string;
    projectId?: undefined;
    projectName?: undefined;
    application?: undefined;
    insertedCount?: undefined;
    updatedCount?: undefined;
    removedStrayCount?: undefined;
    reassignedStrayCount?: undefined;
    batchHash?: undefined;
} | {
    migration: string;
    projectId: any;
    projectName: any;
    application: any;
    insertedCount: number;
    updatedCount: number;
    removedStrayCount: number;
    reassignedStrayCount: number;
    batchHash: string;
    skipped?: undefined;
    reason?: undefined;
}>;
