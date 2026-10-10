import { DatabaseService } from '../database/database.service';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';
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
    constructor(databaseService: DatabaseService);
    generateTestId(projectId?: number, module?: string): Promise<string>;
    getNextTestId(projectId?: number, module?: string): Promise<{
        nextId: string;
    }>;
    create(dto: CreateTestCaseDto): Promise<any>;
    findAll(query: QueryFilter, currentUser?: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: number): Promise<any>;
    update(id: number, dto: UpdateTestCaseDto): Promise<any>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
export {};
