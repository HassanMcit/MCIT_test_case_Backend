import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';
import { GarageImportDto } from './dto/garage-import.dto';
import { GarageImportService } from './garage-import.service';
export declare class TestCasesController {
    private readonly testCasesService;
    private readonly garageImport;
    constructor(testCasesService: TestCasesService, garageImport: GarageImportService);
    bulkImport(dto: GarageImportDto, req: any): Promise<{
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
    verifyImport(batchHash: string, req: any): Promise<{
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
    create(req: any, dto: CreateTestCaseDto): Promise<any>;
    findAll(req: any, page?: number, limit?: number, status?: string, priority?: string, module?: string, projectId?: number, search?: string, queryUserId?: number, queryUserRole?: string): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getNextId(projectId?: number, module?: string): Promise<{
        nextId: string;
    }>;
    findOne(id: number, req: any): Promise<any>;
    update(req: any, id: number, dto: UpdateTestCaseDto): Promise<any>;
    remove(id: number, req: any): Promise<{
        message: string;
    }>;
}
