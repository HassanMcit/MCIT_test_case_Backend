import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ForbiddenException,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * POST /api/projects
   * Create a new project (Admin Only)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new project (Admin Only)' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. إنشاء المشاريع مخصص لمدير النظام (admin) فقط');
    }
    return this.projectsService.create(dto);
  }

  /**
   * GET /api/projects
   * List projects with optional filters (Admin sees all, Tester sees assigned projects only)
   */
  @Get()
  @ApiOperation({ summary: 'List projects (Admin sees all, Tester sees assigned only, or filter by assignedToMe / assignedToUserId)' })
  @ApiQuery({ name: 'environment', required: false, example: 'production', description: 'Filter by environment: production | staging' })
  @ApiQuery({ name: 'status',      required: false, example: 'active',     description: 'Filter by status: active | archived' })
  @ApiQuery({ name: 'search',      required: false, example: 'portal',     description: 'Search in name or description' })
  @ApiQuery({ name: 'assignedToMe', required: false, example: true,        description: 'Filter projects assigned to current user (even if admin)' })
  @ApiQuery({ name: 'assignedToUserId', required: false, example: 1,       description: 'Filter projects assigned to a specific user ID' })
  @ApiResponse({ status: 200, description: 'Array of projects with test-case stats' })
  findAll(
    @Request() req: any,
    @Query('environment') environment?: string,
    @Query('status')      status?: string,
    @Query('search')      search?: string,
    @Query('assignedToMe') assignedToMe?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('cacheUser') cacheUser?: string,
  ) {
    return this.projectsService.findAll(
      { environment, status, search, assignedToMe, assignedToUserId },
      req.user,
    );
  }

  /**
   * GET /api/projects/:id
   * Get a single project with its last 5 test cases
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID (includes recent test cases)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project with recent test cases' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not assigned to this project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id, req.user);
  }

  /**
   * PATCH /api/projects/:id
   * Partially update a project (Admin Only)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a project (Admin Only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. تعديل المشاريع مخصص لمدير النظام (admin) فقط');
    }
    return this.projectsService.update(id, dto);
  }

  /**
   * DELETE /api/projects/:id
   * Delete a project (Admin Only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a project (Admin Only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('غير مصرح لك. حذف المشاريع مخصص لمدير النظام (admin) فقط');
    }
    return this.projectsService.remove(id);
  }
}
