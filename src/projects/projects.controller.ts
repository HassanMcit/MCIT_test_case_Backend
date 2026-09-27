import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
   * Create a new project
   */
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  /**
   * GET /api/projects
   * List all projects with optional filters (environment, status, search)
   */
  @Get()
  @ApiOperation({ summary: 'List all projects with live test-case stats' })
  @ApiQuery({ name: 'environment', required: false, example: 'production', description: 'Filter by environment: production | staging' })
  @ApiQuery({ name: 'status',      required: false, example: 'active',     description: 'Filter by status: active | archived' })
  @ApiQuery({ name: 'search',      required: false, example: 'portal',     description: 'Search in name or description' })
  @ApiResponse({ status: 200, description: 'Array of projects with test-case stats' })
  findAll(
    @Query('environment') environment?: string,
    @Query('status')      status?: string,
    @Query('search')      search?: string,
  ) {
    return this.projectsService.findAll({ environment, status, search });
  }

  /**
   * GET /api/projects/:id
   * Get a single project with its last 5 test cases
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID (includes recent test cases)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project with recent test cases' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  /**
   * PATCH /api/projects/:id
   * Partially update a project
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a project (partial)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  /**
   * DELETE /api/projects/:id
   * Delete a project
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}
