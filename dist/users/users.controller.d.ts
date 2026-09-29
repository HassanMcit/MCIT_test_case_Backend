import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
    getProfile(req: any): Promise<any>;
    updateProfile(req: any, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<any>;
    updateProfilePost(req: any, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<any>;
    uploadProfilePhotoPost(req: any, file: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: any;
    }>;
    uploadProfilePhotoPatch(req: any, file: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: any;
    }>;
    uploadProfilePhotoPut(req: any, file: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: any;
    }>;
    findOne(id: number): Promise<any>;
}
