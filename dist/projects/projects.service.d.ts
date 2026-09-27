import { DatabaseService } from '../database/database.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
export declare class ProjectsService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    create(dto: CreateProjectDto): Promise<any>;
    findAll(query: {
        environment?: string;
        status?: string;
        search?: string;
    }): Promise<any[]>;
    findOne(id: number): Promise<any>;
    update(id: number, dto: UpdateProjectDto): Promise<any>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
