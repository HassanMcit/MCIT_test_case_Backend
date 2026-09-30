"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const verify_reset_code_dto_1 = require("./dto/verify-reset-code.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const public_decorator_1 = require("./public.decorator");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    login(dto, req, res) {
        if (res?.clearCookie) {
            for (let i = 0; i <= 6; i++) {
                res.clearCookie(`authjs.session-token.${i}`, { path: '/' });
            }
        }
        return this.authService.login(dto, req);
    }
    getMe(req) {
        return this.authService.getMe(req.user.id, req);
    }
    changePassword(req, dto) {
        return this.authService.changePassword(req.user.id, dto);
    }
    forgotPassword(dto) {
        return this.authService.forgotPassword(dto);
    }
    verifyResetCode(dto) {
        return this.authService.verifyResetCode(dto);
    }
    resetPassword(dto) {
        return this.authService.resetPassword(dto);
    }
    logout(res) {
        if (res?.clearCookie) {
            res.clearCookie('authjs.session-token', { path: '/' });
            for (let i = 0; i <= 6; i++) {
                res.clearCookie(`authjs.session-token.${i}`, { path: '/' });
            }
        }
        return { message: 'Logged out successfully' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login with email and password' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns JWT access_token and user profile',
        schema: {
            example: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: 1,
                    name: 'Hassan Ali',
                    email: 'h.ali@mcit.gov.eg',
                    role: 'admin',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated user profile' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the authenticated user profile',
        schema: {
            example: {
                id: 1,
                name: 'Hassan Ali',
                email: 'h.ali@mcit.gov.eg',
                role: 'admin',
                createdAt: '2026-09-27 12:51:07',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized – missing or invalid token' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Change password for currently authenticated user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password changed successfully',
        schema: {
            example: {
                message: 'تم تغيير كلمة المرور بنجاح',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Current password invalid or passwords do not match' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset verification code' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Verification code generated and sent',
        schema: {
            example: {
                message: 'تم إنشاء كود استعادة كلمة المرور وإرساله بنجاح إلى البريد الإلكتروني الخاص بـ Hassan Ali',
                email: 'h.ali@mcit.gov.eg',
                code: '581294',
                expiresIn: '15 دقيقة',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Email not registered' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-reset-code'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify reset code validity before resetting password' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Code is valid',
        schema: {
            example: {
                valid: true,
                message: 'كود التحقق صحيح. يمكنك الآن تعيين كلمة المرور وتأكيدها',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Code invalid or expired' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_reset_code_dto_1.VerifyResetCodeDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyResetCode", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password with verification code' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset successfully',
        schema: {
            example: {
                message: 'تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Code invalid/expired or passwords mismatch' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Logout – invalidate session on client side' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logout successful' }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map