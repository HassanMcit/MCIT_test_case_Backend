import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(req: any, dto: CreateUserDto): Promise<{
        id: any;
        userId: any;
        name: any;
        email: any;
        role: any;
        photo: string;
        profileImage: string;
        createdAt: any;
        updatedAt: any;
        _count: {
            testCases: number;
            assignedProjects: number;
        };
        assignedProjects: any[];
    }>;
    findAll(req: any): Promise<{
        id: any;
        userId: any;
        name: any;
        email: any;
        role: any;
        photo: string;
        profileImage: string;
        createdAt: any;
        updatedAt: any;
        _count: {
            testCases: number;
            assignedProjects: number;
        };
        assignedProjects: any[];
    }[]>;
    findAllBasic(req: any, role?: string): Promise<{
        id: any;
        name: any;
        email: any;
        role: any;
        photo: string;
    }[]>;
    getMyAssignedProjects(req: any): Promise<any[]>;
    assignProject(req: any, userId: number, dto: AssignProjectDto): Promise<{
        message: string;
        userId: any;
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
        userId: number;
        projectId: number;
    }>;
    getProfile(req: any): Promise<{
        id: any;
        userId: any;
        name: any;
        email: any;
        role: any;
        photo: string;
        profileImage: string;
        createdAt: any;
        updatedAt: any;
        _count: {
            testCases: number;
            assignedProjects: number;
        };
        assignedProjects: any[];
    }>;
    updateProfile(req: any, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<{
        message: string;
        userId: any;
        photo: string;
        user: {
            id: any;
            userId: any;
            name: any;
            email: any;
            role: any;
            photo: string;
            profileImage: string;
            createdAt: any;
            updatedAt: any;
            _count: {
                testCases: number;
                assignedProjects: number;
            };
            assignedProjects: any[];
        };
    }>;
    updateProfilePost(req: any, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<{
        message: string;
        userId: any;
        photo: string;
        user: {
            id: any;
            userId: any;
            name: any;
            email: any;
            role: any;
            photo: string;
            profileImage: string;
            createdAt: any;
            updatedAt: any;
            _count: {
                testCases: number;
                assignedProjects: number;
            };
            assignedProjects: any[];
        };
    }>;
    uploadProfilePhotoPost(req: any, file: Express.Multer.File): Promise<{
        message: string;
        userId: any;
        photo: string;
        user: {
            id: any;
            userId: any;
            name: any;
            email: any;
            role: any;
            photo: string;
            profileImage: string;
            createdAt: any;
            updatedAt: any;
            _count: {
                testCases: number;
                assignedProjects: number;
            };
            assignedProjects: any[];
        };
    }>;
    uploadProfilePhotoPatch(req: any, file: Express.Multer.File): Promise<{
        message: string;
        userId: any;
        photo: string;
        user: {
            id: any;
            userId: any;
            name: any;
            email: any;
            role: any;
            photo: string;
            profileImage: string;
            createdAt: any;
            updatedAt: any;
            _count: {
                testCases: number;
                assignedProjects: number;
            };
            assignedProjects: any[];
        };
    }>;
    uploadProfilePhotoPut(req: any, file: Express.Multer.File): Promise<{
        message: string;
        userId: any;
        photo: string;
        user: {
            id: any;
            userId: any;
            name: any;
            email: any;
            role: any;
            photo: string;
            profileImage: string;
            createdAt: any;
            updatedAt: any;
            _count: {
                testCases: number;
                assignedProjects: number;
            };
            assignedProjects: any[];
        };
    }>;
    getCurrentUserPhoto(req: any, res: any): Promise<any>;
    getUserPhoto(id: number, res: any): Promise<any>;
    findOne(id: number, req: any): Promise<{
        id: any;
        userId: any;
        name: any;
        email: any;
        role: any;
        photo: string;
        profileImage: string;
        createdAt: any;
        updatedAt: any;
        _count: {
            testCases: number;
            assignedProjects: number;
        };
        assignedProjects: any[];
    }>;
    updateUser(req: any, id: number, dto: UpdateProfileDto & {
        role?: string;
    }): Promise<{
        id: any;
        userId: any;
        name: any;
        email: any;
        role: any;
        photo: string;
        profileImage: string;
        createdAt: any;
        updatedAt: any;
        _count: {
            testCases: number;
            assignedProjects: number;
        };
        assignedProjects: any[];
    }>;
    remove(req: any, id: number): Promise<{
        message: string;
        userId: number;
    }>;
}
