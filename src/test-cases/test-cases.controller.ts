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
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';

@ApiTags('Test Cases')
@ApiBearerAuth('access-token')
@Controller('test-cases')
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  /**
   * POST /api/test-cases
   * Create a new test case
   */
  @Post()
  @ApiOperation({ summary: 'Create a new test case' })
  @ApiResponse({ status: 201, description: 'Test case created successfully' })
  @ApiResponse({ status: 409, description: 'Test case ID already exists' })
  create(@Body() dto: CreateTestCaseDto) {
    return this.testCasesService.create(dto);
  }

  /**
   * GET /api/test-cases
   * List all test cases with optional filters and pagination
   */
  @Get()
  @ApiOperation({ summary: 'List all test cases (filterable, paginated)' })
  @ApiQuery({ name: 'page',      required: false, type: Number,  example: 1,          description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit',     required: false, type: Number,  example: 10,         description: 'Items per page (default 10)' })
  @ApiQuery({ name: 'status',    required: false, type: String,  example: 'passed',   description: 'Filter by status: passed | failed | pending' })
  @ApiQuery({ name: 'priority',  required: false, type: String,  example: 'high',     description: 'Filter by priority: critical | high | medium | low' })
  @ApiQuery({ name: 'module',    required: false, type: String,  example: 'Auth',     description: 'Filter by module name (partial match)' })
  @ApiQuery({ name: 'projectId', required: false, type: Number,  example: 1,          description: 'Filter by project ID' })
  @ApiQuery({ name: 'search',    required: false, type: String,  example: 'login',    description: 'Search in testId, module, and scenario' })
  @ApiResponse({ status: 200, description: 'Paginated list of test cases' })
  findAll(
    @Request()          req: any,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
    @Query('status')    status?: string,
    @Query('priority')  priority?: string,
    @Query('module')    module?: string,
    @Query('projectId') projectId?: number,
    @Query('search')    search?: string,
    @Query('userId')    queryUserId?: number,
    @Query('userRole')  queryUserRole?: string,
  ) {
    const user = req?.user || (queryUserId ? { id: Number(queryUserId), role: queryUserRole } : undefined);
    return this.testCasesService.findAll(
      { page, limit, status, priority, module, projectId, search },
      user,
    );
  }

  /**
   * GET /api/test-cases/next-id
   * Get next auto-increment testId for a project or module
   */
  @Get('next-id')
  @ApiOperation({ summary: 'Get next auto-increment testId for a project or module' })
  @ApiQuery({ name: 'projectId', required: false, type: Number, description: 'Project ID' })
  @ApiQuery({ name: 'module', required: false, type: String, description: 'Module / Project name' })
  @ApiResponse({ status: 200, description: 'Next testId generated' })
  getNextId(
    @Query('projectId') projectId?: number,
    @Query('module') module?: string,
  ) {
    return this.testCasesService.getNextTestId(projectId ? Number(projectId) : undefined, module);
  }

  /**
   * GET /api/test-cases/:id
   * Get a single test case by its numeric ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single test case by ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Test case found' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testCasesService.findOne(id);
  }

  /**
   * PATCH /api/test-cases/:id
   * Partially update a test case
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a test case (partial update)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Test case updated' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCasesService.update(id, dto);
  }

  /**
   * DELETE /api/test-cases/:id
   * Delete a test case
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a test case' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Test case deleted' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testCasesService.remove(id);
  }
}
