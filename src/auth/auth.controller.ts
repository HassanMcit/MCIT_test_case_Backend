import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Authenticate with email & password → returns JWT token + user info
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
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
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's profile (requires JWT)
   */
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid token' })
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  /**
   * POST /api/auth/change-password
   * Changes password for authenticated user (requires current password & matching new passwords)
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password for currently authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'تم تغيير كلمة المرور بنجاح',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Current password invalid or passwords do not match' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset code sent to registered email
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset verification code' })
  @ApiResponse({
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
  })
  @ApiResponse({ status: 404, description: 'Email not registered' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * POST /api/auth/verify-reset-code
   * Check if reset code is valid and not expired
   */
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify reset code validity before resetting password' })
  @ApiResponse({
    status: 200,
    description: 'Code is valid',
    schema: {
      example: {
        valid: true,
        message: 'كود التحقق صحيح. يمكنك الآن تعيين كلمة المرور وتأكيدها',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Code invalid or expired' })
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  /**
   * POST /api/auth/reset-password
   * Resets password using verification code and provides new password + confirmation
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with verification code' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Code invalid/expired or passwords mismatch' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * POST /api/auth/logout
   * Client-side logout (JWT is stateless; instruct client to discard token)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout – invalidate session on client side' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout() {
    // JWT is stateless. For production add a blacklist/Redis store here.
    return { message: 'Logged out successfully' };
  }
}

