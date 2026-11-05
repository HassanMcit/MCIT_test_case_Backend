import { DatabaseService } from '../database/database.service';
import { GarageImportDto } from './dto/garage-import.dto';
export declare const GARAGE_HEADERS: string[];
type Actor = {
    id: number;
    role: string;
};
export declare function garageRows(dto: GarageImportDto): {
    original: Record<string, string>;
    testId: string;
    sourceRow: number;
    rowHash: string;
    status: string;
    ownerName: string;
    plannedAt: string;
}[];
export declare class GarageImportService {
    private readonly database;
    constructor(database: DatabaseService);
    private admin;
    private matches;
    run(dto: GarageImportDto, user: Actor): Promise<{
        dryRun: boolean;
        batchHash: string;
        previewHash: string;
        project: any;
        application: string;
        total: number;
        assignments: {
            id: any;
            name: any;
            count: number;
        }[];
        wouldInsert: number;
        skipped: number;
        conflicts: string[];
        canCommit: boolean;
        plan: {
            testId: string;
            sourceRow: number;
            ownerId: any;
            ownerName: any;
            pageName: string;
            plannedAt: string;
            plannedTimezone: string;
            action: string;
            databaseId: any;
        }[];
    } | {
        imported: number;
        verified: boolean;
        verification: {
            verified: boolean;
            total: number;
            mismatches: string[];
            assignments?: undefined;
            batchHash?: undefined;
            ids?: undefined;
        } | {
            verified: boolean;
            total: number;
            assignments: {
                name: string;
                count: number;
            }[];
            mismatches: string[];
            batchHash: string;
            ids: {
                id: any;
                testId: any;
            }[];
        };
        cacheRevision: any;
        dryRun: boolean;
        batchHash: string;
        previewHash: string;
        project: any;
        application: string;
        total: number;
        assignments: {
            id: any;
            name: any;
            count: number;
        }[];
        wouldInsert: number;
        skipped: number;
        conflicts: string[];
        canCommit: boolean;
        plan: {
            testId: string;
            sourceRow: number;
            ownerId: any;
            ownerName: any;
            pageName: string;
            plannedAt: string;
            plannedTimezone: string;
            action: string;
            databaseId: any;
        }[];
    }>;
    private verifyWith;
    verify(batchHash: string, user: Actor): Promise<{
        verified: boolean;
        total: number;
        mismatches: string[];
        assignments?: undefined;
        batchHash?: undefined;
        ids?: undefined;
    } | {
        verified: boolean;
        total: number;
        assignments: {
            name: string;
            count: number;
        }[];
        mismatches: string[];
        batchHash: string;
        ids: {
            id: any;
            testId: any;
        }[];
    }>;
}
export {};
