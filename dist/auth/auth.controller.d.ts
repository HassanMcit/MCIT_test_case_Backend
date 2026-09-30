import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto, req: any, res?: any): Promise<{
        access_token: string;
        userId: number;
        user: {
            id: number;
            userId: number;
            name: string;
            email: string;
            role: string;
            photo: string;
            profileImage: string;
        };
    }>;
    getMe(req: any): Promise<import("./auth.service").UserProfile>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        message: string;
        userId: number;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        userId: number;
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
        userId: number;
    }>;
    logout(res?: any): {
        message: string;
    };
}
