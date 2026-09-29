import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    create(dto: CreateUserDto): Promise<any>;
    findAll(): Promise<any[]>;
    findOne(id: number): Promise<any>;
    updateProfile(userId: number, dto: UpdateProfileDto, file?: Express.Multer.File, req?: any): Promise<any>;
    updateProfilePhoto(userId: number, file: Express.Multer.File, req: any): Promise<{
        message: string;
        photo: string;
        user: any;
    }>;
    assignProject(userId: number, dto: AssignProjectDto): Promise<{
        message: string;
        assignment: {
            userId: any;
            userName: any;
            projectId: any;
            projectName: any;
            assignedAt: string;
        };
    }>;
    unassignProject(userId: number, projectId: number): Promise<{
        message: string;
    }>;
    getMyAssignedProjects(userId: number): Promise<any[]>;
}
