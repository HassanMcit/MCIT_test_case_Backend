import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AddCycleItemsDto, AssignCycleItemDto, CreateCycleDto, CreateExecutionDto, CreateReleaseDto, UpdateCycleDto, UpdateReleaseDto, WorkflowQueryDto } from './workflow.dto';
export interface WorkflowUser {
    id: number;
    role: string;
    name?: string;
}
type Queryable = Pick<PoolClient, 'query'>;
export declare function validateDates(start?: string | null, end?: string | null): void;
export declare function summarize(row: any): {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
    executed: number;
    progress: number;
    passRate: number;
};
export declare class WorkflowService {
    private readonly database;
    constructor(database: DatabaseService);
    admin(user: WorkflowUser): void;
    transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T>;
    project(id: number, user: WorkflowUser, db?: Queryable, lock?: boolean): Promise<any>;
    caseAccess(id: number, user: WorkflowUser, db?: Queryable): Promise<any>;
    private scope;
    private page;
    private paginated;
    releases(projectId: number, q: WorkflowQueryDto, user: WorkflowUser): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    release(projectId: number, id: number, user: WorkflowUser): Promise<any>;
    createRelease(projectId: number, dto: CreateReleaseDto, user: WorkflowUser): Promise<any>;
    private validateRelease;
    private patch;
    updateRelease(projectId: number, id: number, dto: UpdateReleaseDto, user: WorkflowUser): Promise<any>;
    cycles(q: WorkflowQueryDto, user: WorkflowUser): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createCycle(dto: CreateCycleDto, user: WorkflowUser): Promise<any>;
    cycle(id: number, user: WorkflowUser): Promise<any>;
    private lockedCycle;
    updateCycle(id: number, dto: UpdateCycleDto, user: WorkflowUser): Promise<any>;
    candidates(id: number, q: WorkflowQueryDto, user: WorkflowUser): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    private tester;
    addItems(id: number, dto: AddCycleItemsDto, user: WorkflowUser): Promise<{
        added: number;
    }>;
    items(id: number, q: WorkflowQueryDto, user: WorkflowUser): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    assign(id: number, itemId: number, dto: AssignCycleItemDto, user: WorkflowUser): Promise<any>;
    execute(id: number, itemId: number, dto: CreateExecutionDto, user: WorkflowUser): Promise<any>;
    history(id: number, q: WorkflowQueryDto, user: WorkflowUser): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    metrics(q: WorkflowQueryDto, user: WorkflowUser): Promise<{
        totalExecutions: any;
        summary: {
            total: number;
            passed: number;
            failed: number;
            blocked: number;
            skipped: number;
            notRun: number;
            executed: number;
            progress: number;
            passRate: number;
        };
        cycles: any[];
        releases: any[];
    }>;
    appendCompatibility(db: Queryable, tc: any, dto: any, user: WorkflowUser): Promise<void>;
}
export {};
