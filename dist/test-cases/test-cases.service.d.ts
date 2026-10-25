import { DatabaseService } from '../database/database.service';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';
import { WorkflowService } from '../workflow/workflow.service';
interface QueryFilter {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    module?: string;
    projectId?: number;
    search?: string;
}
export declare class TestCasesService {
    private readonly databaseService;
    private readonly workflow;
    constructor(databaseService: DatabaseService, workflow: WorkflowService);
    generateTestId(projectId?: number, module?: string): Promise<string>;
    getNextTestId(projectId?: number, module?: string): Promise<{
        nextId: string;
    }>;
    create(dto: CreateTestCaseDto, currentUser?: any): Promise<any>;
    findAll(query: QueryFilter, currentUser?: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: number, currentUser?: any): Promise<any>;
    update(id: number, dto: UpdateTestCaseDto, currentUser?: any): Promise<any>;
    remove(id: number, currentUser: any): Promise<{
        message: string;
    }>;
}
export {};
