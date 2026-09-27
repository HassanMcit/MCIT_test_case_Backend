import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto): Promise<any>;
    findAll(environment?: string, status?: string, search?: string): Promise<any[]>;
    findOne(id: number): Promise<any>;
    update(id: number, dto: UpdateProjectDto): Promise<any>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
