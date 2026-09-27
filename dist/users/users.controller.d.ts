import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(req: any, dto: CreateUserDto): Promise<any>;
    findAll(req: any): Promise<any[]>;
    getMyAssignedProjects(req: any): Promise<any[]>;
    assignProject(req: any, userId: number, dto: AssignProjectDto): Promise<{
        message: string;
        assignment: {
            userId: any;
            userName: any;
            projectId: any;
            projectName: any;
            assignedAt: string;
        };
    }>;
    unassignProject(req: any, userId: number, projectId: number): Promise<{
        message: string;
    }>;
    findOne(id: number): Promise<any>;
}
