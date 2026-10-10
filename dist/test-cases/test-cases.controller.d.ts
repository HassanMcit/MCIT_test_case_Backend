import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';
export declare class TestCasesController {
    private readonly testCasesService;
    constructor(testCasesService: TestCasesService);
    create(dto: CreateTestCaseDto): Promise<any>;
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
    findOne(id: number): Promise<any>;
    update(id: number, dto: UpdateTestCaseDto): Promise<any>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
