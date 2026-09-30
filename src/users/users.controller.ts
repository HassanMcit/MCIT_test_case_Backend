import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ParseIntPipe,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../auth/public.decorator';

const multerPhotoOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = join(process.cwd(), 'uploads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase() || '.png';
      cb(null, `profile-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (!file.mimetype || file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(
      new BadRequestException(
        'الملف المرفوع يجب أن يكون صورة',
      ),
      false,
    );
  },
};

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
    return this.usersService.findAll(req);
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
    return this.usersService.findOne(req.user.id, req);
  }

  /**
   * PATCH /api/users/profile
   * Update current user's own profile (name, photo via FormData or JSON)
   */
  @Patch('profile')
  @UseInterceptors(FileInterceptor('photo', multerPhotoOptions))
  @ApiOperation({
    summary: 'Update current user profile (name, photo - any file size)',
    description: 'تحديث بيانات المستخدم. يدعم رفع صورة شخصية بأي حجم عبر multipart/form-data في حقل photo، أو تحديث الاسم في حقل name',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'اسم المستخدم (اختياري)',
          example: 'Hassan Ali',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'ملف الصورة الشخصية (أي صيغة صورة وبأي حجم بدون حد أقصى)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم تحديث الملف الشخصي بنجاح' })
  updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(req.user.id, dto, file, req);
  }

  /**
   * POST /api/users/profile
   * Alternative POST endpoint to update current user profile
   */
  @Post('profile')
  @UseInterceptors(FileInterceptor('photo', multerPhotoOptions))
  @ApiOperation({
    summary: 'Update current user profile via POST (name, photo - any file size)',
    description: 'تحديث بيانات المستخدم. يدعم رفع صورة شخصية بأي حجم عبر multipart/form-data في حقل photo، أو تحديث الاسم في حقل name',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'اسم المستخدم (اختياري)',
          example: 'Hassan Ali',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'ملف الصورة الشخصية (أي صيغة وبأي حجم بدون حد أقصى)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم تحديث الملف الشخصي بنجاح' })
  updateProfilePost(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(req.user.id, dto, file, req);
  }

  /**
   * POST /api/users/profile/photo
   * Upload & update current user profile image via FormData
   */
  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('photo', multerPhotoOptions))
  @ApiOperation({
    summary: 'Upload and update profile photo via FormData (any size)',
    description: 'رفع صورة شخصية للمستخدم بدون حد أقصى للحجم في حقل photo',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'ملف الصورة الشخصية (أي حجم)',
        },
      },
      required: ['photo'],
    },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded and profile updated' })
  uploadProfilePhotoPost(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePhoto(req.user.id, file, req);
  }

  /**
   * PATCH /api/users/profile/photo
   * Upload & update current user profile image via FormData
   */
  @Patch('profile/photo')
  @UseInterceptors(FileInterceptor('photo', multerPhotoOptions))
  @ApiOperation({
    summary: 'Upload and update profile photo via FormData (any size)',
    description: 'رفع صورة شخصية للمستخدم بدون حد أقصى للحجم في حقل photo',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'ملف الصورة الشخصية (أي حجم)',
        },
      },
      required: ['photo'],
    },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded and profile updated' })
  uploadProfilePhotoPatch(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePhoto(req.user.id, file, req);
  }

  /**
   * PUT /api/users/profile/photo
   * Upload & update current user profile image via FormData
   */
  @Put('profile/photo')
  @UseInterceptors(FileInterceptor('photo', multerPhotoOptions))
  @ApiOperation({
    summary: 'Upload and update profile photo via FormData (any size)',
    description: 'رفع صورة شخصية للمستخدم بدون حد أقصى للحجم في حقل photo',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'ملف الصورة الشخصية (أي حجم)',
        },
      },
      required: ['photo'],
    },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded and profile updated' })
  uploadProfilePhotoPut(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePhoto(req.user.id, file, req);
  }

  /**
   * GET /api/users/profile/photo
   * Stream current authenticated user profile photo
   */
  @Get('profile/photo')
  @ApiOperation({ summary: 'Get current authenticated user profile photo stream' })
  @ApiResponse({ status: 200, description: 'User photo stream (PNG/JPEG)' })
  getCurrentUserPhoto(@Request() req: any, @Res() res: any) {
    return this.usersService.serveUserPhoto(req.user.id, res);
  }

  /**
   * GET /api/users/:id/photo
   * Public endpoint to serve user profile photo as binary image
   */
  @Public()
  @Get(':id/photo')
  @ApiOperation({ summary: 'Get user profile photo (Public)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'User photo stream (PNG/JPEG)' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  getUserPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    return this.usersService.serveUserPhoto(id, res);
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
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.findOne(id, req);
  }
}
