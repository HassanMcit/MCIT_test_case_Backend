import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/users
   * Create a new user (Admin Only)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user with role (Admin Only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only admin users can create new accounts' })
  @ApiResponse({ status: 409, description: 'Conflict: Email already exists' })
  create(@Request() req: any, @Body() dto: CreateUserDto) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط');
    }
    return this.usersService.create(dto);
  }

  /**
   * GET /api/users
   * List all users with assigned projects (Admin Only)
   */
  @Get()
  @ApiOperation({ summary: 'List all users with assigned projects (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Array of users with their assigned projects' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  findAll(@Request() req: any) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. عرض قائمة المستخدمين مخصص لمدير النظام (admin) فقط');
    }
    return this.usersService.findAll();
  }

  /**
   * GET /api/users/my-assigned-projects
   * For the logged-in User: get all projects assigned to them
   */
  @Get('my-assigned-projects')
  @ApiOperation({ summary: 'Get projects assigned to the currently logged-in user' })
  @ApiResponse({ status: 200, description: 'Array of assigned projects with test metrics' })
  getMyAssignedProjects(@Request() req: any) {
    return this.usersService.getMyAssignedProjects(req.user.id);
  }

  /**
   * POST /api/users/:id/assign-project
   * Assign a project to a user for testing (Admin Only)
   */
  @Post(':id/assign-project')
  @ApiOperation({ summary: 'Assign a project to a user for testing (Admin Only)' })
  @ApiParam({ name: 'id', type: Number, example: 2, description: 'Target User ID' })
  @ApiResponse({ status: 201, description: 'Project assigned to user successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  @ApiResponse({ status: 404, description: 'User or project not found' })
  @ApiResponse({ status: 409, description: 'Project already assigned to this user' })
  assignProject(
    @Request() req: any,
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AssignProjectDto,
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. إسناد المشاريع مخصص لمدير النظام (admin) فقط');
    }
    return this.usersService.assignProject(userId, dto);
  }

  /**
   * DELETE /api/users/:id/assign-project/:projectId
   * Remove project assignment from user (Admin Only)
   */
  @Delete(':id/assign-project/:projectId')
  @ApiOperation({ summary: 'Unassign project from user (Admin Only)' })
  @ApiParam({ name: 'id', type: Number, example: 2 })
  @ApiParam({ name: 'projectId', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project unassigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  unassignProject(
    @Request() req: any,
    @Param('id', ParseIntPipe) userId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. إلغاء إسناد المشاريع مخصص لمدير النظام (admin) فقط');
    }
    return this.usersService.unassignProject(userId, projectId);
  }

  /**
   * GET /api/users/profile
   * Get current user's own profile
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile with assigned projects' })
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  /**
   * PATCH /api/users/profile
   * Update current user's own profile (name, profileImage)
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile (name, avatar)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  /**
   * GET /api/users/:id
   * Get a single user with their test case count and assigned projects
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
