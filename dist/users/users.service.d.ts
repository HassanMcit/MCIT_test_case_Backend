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
    findAll(req?: any): Promise<{
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
    findAllBasic(role?: string, req?: any): Promise<{
        id: any;
        name: any;
        email: any;
        role: any;
        photo: string;
    }[]>;
    findOne(id: number, req?: any): Promise<{
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
    updateUserByAdmin(userId: number, dto: any, req?: any): Promise<{
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
    remove(userId: number, currentUser?: any): Promise<{
        message: string;
        userId: number;
    }>;
    updateProfile(userId: number, dto: UpdateProfileDto, file?: Express.Multer.File, req?: any): Promise<{
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
    updateProfilePhoto(userId: number, file: Express.Multer.File, req: any): Promise<{
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
    assignProject(userId: number, dto: AssignProjectDto): Promise<{
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
    unassignProject(userId: number, projectId: number): Promise<{
        message: string;
        userId: number;
        projectId: number;
    }>;
    getMyAssignedProjects(userId: number): Promise<any[]>;
}
