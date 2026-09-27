export declare enum Priority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum Status {
    PASSED = "passed",
    FAILED = "failed",
    PENDING = "pending"
}
export declare class CreateTestCaseDto {
    testId?: string;
    module: string;
    pageName?: string;
    scenario: string;
    preConditions?: string;
    steps: string[];
    expectedResult: string;
    actualResult?: string;
    priority?: Priority;
    status?: Status;
    notes?: string;
    executedAt?: string;
    testerId?: number;
    projectId?: number;
}
declare const UpdateTestCaseDto_base: import("@nestjs/common").Type<Partial<CreateTestCaseDto>>;
export declare class UpdateTestCaseDto extends UpdateTestCaseDto_base {
}
export {};
