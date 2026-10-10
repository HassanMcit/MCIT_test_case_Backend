import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(req: any, dto: CreateProjectDto): Promise<any>;
    findAll(req: any, environment?: string, status?: string, search?: string, assignedToMe?: string, assignedToUserId?: string, cacheUser?: string): Promise<any[]>;
    findOne(req: any, id: number): Promise<any>;
    update(req: any, id: number, dto: UpdateProjectDto): Promise<any>;
    remove(req: any, id: number): Promise<{
        message: string;
    }>;
}
