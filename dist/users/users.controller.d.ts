import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(req: any, dto: CreateUserDto): Promise<{
        id: any;
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
        assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
    }>;
    findAll(req: any): Promise<{
        id: any;
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
        assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
    }[]>;
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
    getProfile(req: any): Promise<{
        id: any;
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
        assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
    }>;
    updateProfile(req: any, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: {
            id: any;
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
            assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
        };
    }>;
    updateProfilePost(req: any, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: {
            id: any;
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
            assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
        };
    }>;
    uploadProfilePhotoPost(req: any, file: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: {
            id: any;
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
            assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
        };
    }>;
    uploadProfilePhotoPatch(req: any, file: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: {
            id: any;
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
            assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
        };
    }>;
    uploadProfilePhotoPut(req: any, file: Express.Multer.File): Promise<{
        message: string;
        photo: string;
        user: {
            id: any;
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
            assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
        };
    }>;
    getCurrentUserPhoto(req: any, res: any): Promise<any>;
    getUserPhoto(id: number, res: any): Promise<any>;
    findOne(id: number, req: any): Promise<{
        id: any;
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
        assignedProjects: Record<string, import("node:sqlite").SQLOutputValue>[];
    }>;
}
