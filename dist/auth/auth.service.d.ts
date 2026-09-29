import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: string;
    photo?: string;
    createdAt: string;
}
export declare class AuthService {
    private readonly databaseService;
    private readonly jwtService;
    constructor(databaseService: DatabaseService, jwtService: JwtService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
            photo: string;
        };
    }>;
    getMe(userId: number): Promise<UserProfile>;
    changePassword(userId: number, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        email: string;
        code: string;
        expiresIn: string;
    }>;
    verifyResetCode(dto: VerifyResetCodeDto): Promise<{
        valid: boolean;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
