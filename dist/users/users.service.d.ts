import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    serveUserPhoto(userId: number, res: any): Promise<any>;
    create(dto: CreateUserDto, req?: any): Promise<{
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
    findAll(req?: any): Promise<{
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
    findOne(id: number, req?: any): Promise<{
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
    updateProfile(userId: number, dto: UpdateProfileDto, file?: Express.Multer.File, req?: any): Promise<{
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
    updateProfilePhoto(userId: number, file: Express.Multer.File, req: any): Promise<{
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
