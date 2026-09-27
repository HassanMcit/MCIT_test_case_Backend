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
          name: 'Karim Mansour',
          email: 'karim@mcit.gov.eg',
          role: 'lead',
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
        name: 'Karim Mansour',
        email: 'karim@mcit.gov.eg',
        role: 'lead',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid token' })
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
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
