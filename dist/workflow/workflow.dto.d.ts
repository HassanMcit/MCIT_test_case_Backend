export declare enum ReleaseStatus {
    Planning = "planning",
    Active = "active",
    Testing = "testing",
    Released = "released",
    Archived = "archived"
}
export declare enum CycleStatus {
    Planning = "planning",
    Active = "active",
    Completed = "completed",
    Archived = "archived"
}
export declare enum ExecutionStatus {
    NotRun = "not_run",
    Passed = "passed",
    Failed = "failed",
    Blocked = "blocked",
    Skipped = "skipped"
}
export declare class CreateReleaseDto {
    name: string;
    version: string;
    description?: string;
    status?: ReleaseStatus;
    startDate?: string | null;
    releaseDate?: string | null;
}
declare const UpdateReleaseDto_base: import("@nestjs/common").Type<Partial<CreateReleaseDto>>;
export declare class UpdateReleaseDto extends UpdateReleaseDto_base {
}
export declare class CreateCycleDto {
    projectId: number;
    releaseId: number;
    name: string;
    description?: string;
    status?: CycleStatus;
    startDate?: string | null;
    endDate?: string | null;
}
export declare class UpdateCycleDto {
    name?: string;
    description?: string;
    status?: CycleStatus;
    startDate?: string | null;
    endDate?: string | null;
}
export declare class CycleItemDto {
    testCaseId: number;
    testerId?: number | null;
}
export declare class AddCycleItemsDto {
    items: CycleItemDto[];
}
export declare class AssignCycleItemDto {
    testerId?: number | null;
}
export declare class CreateExecutionDto {
    status: ExecutionStatus;
    actualResult?: string;
    notes?: string;
    environment?: string;
    executedAt?: string;
    durationSeconds?: number;
}
export declare class WorkflowQueryDto {
    projectId?: number;
    releaseId?: number;
    cycleId?: number;
    testerId?: number;
    page: number;
    limit: number;
    search?: string;
    status?: string;
}
export {};
