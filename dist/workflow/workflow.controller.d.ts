import { WorkflowService } from './workflow.service';
import { AddCycleItemsDto, AssignCycleItemDto, CreateCycleDto, CreateExecutionDto, CreateReleaseDto, UpdateCycleDto, UpdateReleaseDto, WorkflowQueryDto } from './workflow.dto';
export declare class WorkflowController {
    private readonly service;
    constructor(service: WorkflowService);
    releases(id: number, q: WorkflowQueryDto, req: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createRelease(id: number, dto: CreateReleaseDto, req: any): Promise<any>;
    release(projectId: number, id: number, req: any): Promise<any>;
    updateRelease(projectId: number, id: number, dto: UpdateReleaseDto, req: any): Promise<any>;
    cycles(q: WorkflowQueryDto, req: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createCycle(dto: CreateCycleDto, req: any): Promise<any>;
    cycle(id: number, req: any): Promise<any>;
    updateCycle(id: number, dto: UpdateCycleDto, req: any): Promise<any>;
    candidates(id: number, q: WorkflowQueryDto, req: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    addItems(id: number, dto: AddCycleItemsDto, req: any): Promise<{
        added: number;
    }>;
    items(id: number, q: WorkflowQueryDto, req: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    assign(id: number, itemId: number, dto: AssignCycleItemDto, req: any): Promise<any>;
    execute(id: number, itemId: number, dto: CreateExecutionDto, req: any): Promise<any>;
    history(id: number, q: WorkflowQueryDto, req: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    metrics(q: WorkflowQueryDto, req: any): Promise<{
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
}
