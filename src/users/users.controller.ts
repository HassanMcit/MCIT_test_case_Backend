import {
  Controller,
  Get,
  Post,
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
   * List all users (for tester assignment dropdowns)
   */
  @Get()
  @ApiOperation({ summary: 'List all users (for assignment dropdowns)' })
  @ApiResponse({ status: 200, description: 'Array of users (passwords excluded)' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /api/users/:id
   * Get a single user with their test case count
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
