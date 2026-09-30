"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const assign_project_dto_1 = require("./dto/assign-project.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const public_decorator_1 = require("../auth/public.decorator");
const multerPhotoOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: (req, file, cb) => {
            const dir = (0, path_1.join)(process.cwd(), 'uploads');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = (0, path_1.extname)(file.originalname).toLowerCase() || '.png';
            cb(null, `profile-${uniqueSuffix}${ext}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        cb(new common_1.BadRequestException('الملف المرفوع يجب أن يكون صورة'), false);
    },
};
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    create(req, dto) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط');
        }
        return this.usersService.create(dto, req);
    }
    findAll(req) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. عرض قائمة المستخدمين مخصص لمدير النظام (admin) فقط');
        }
        return this.usersService.findAll(req);
    }
    getMyAssignedProjects(req) {
        return this.usersService.getMyAssignedProjects(req.user.id);
    }
    assignProject(req, userId, dto) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. إسناد المشاريع مخصص لمدير النظام (admin) فقط');
        }
        return this.usersService.assignProject(userId, dto);
    }
    unassignProject(req, userId, projectId) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. إلغاء إسناد المشاريع مخصص لمدير النظام (admin) فقط');
        }
        return this.usersService.unassignProject(userId, projectId);
    }
    getProfile(req) {
        return this.usersService.findOne(req.user.id, req);
    }
    updateProfile(req, dto, file) {
        return this.usersService.updateProfile(req.user.id, dto, file, req);
    }
    updateProfilePost(req, dto, file) {
        return this.usersService.updateProfile(req.user.id, dto, file, req);
    }
    uploadProfilePhotoPost(req, file) {
        return this.usersService.updateProfilePhoto(req.user.id, file, req);
    }
    uploadProfilePhotoPatch(req, file) {
        return this.usersService.updateProfilePhoto(req.user.id, file, req);
    }
    uploadProfilePhotoPut(req, file) {
        return this.usersService.updateProfilePhoto(req.user.id, file, req);
    }
    getCurrentUserPhoto(req, res) {
        return this.usersService.serveUserPhoto(req.user.id, res);
    }
    getUserPhoto(id, res) {
        return this.usersService.serveUserPhoto(id, res);
    }
    findOne(id, req) {
        return this.usersService.findOne(id, req);
    }
    updateUser(req, id, dto) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. تعديل بيانات المستخدمين مخصص لمدير النظام (admin) فقط');
        }
        return this.usersService.updateUserByAdmin(id, dto, req);
    }
    remove(req, id) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. حذف المستخدمين مخصص لمدير النظام (admin) فقط');
        }
        return this.usersService.remove(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user with role (Admin Only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Only admin users can create new accounts' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict: Email already exists' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all users with assigned projects (Admin Only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Array of users with their assigned projects' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-assigned-projects'),
    (0, swagger_1.ApiOperation)({ summary: 'Get projects assigned to the currently logged-in user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Array of assigned projects with test metrics' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getMyAssignedProjects", null);
__decorate([
    (0, common_1.Post)(':id/assign-project'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a project to a user for testing (Admin Only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 2, description: 'Target User ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Project assigned to user successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User or project not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Project already assigned to this user' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, assign_project_dto_1.AssignProjectDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "assignProject", null);
__decorate([
    (0, common_1.Delete)(':id/assign-project/:projectId'),
    (0, swagger_1.ApiOperation)({ summary: 'Unassign project from user (Admin Only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 2 }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project unassigned successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "unassignProject", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated user profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current user profile with assigned projects' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', multerPhotoOptions)),
    (0, swagger_1.ApiOperation)({
        summary: 'Update current user profile (name, photo - any file size)',
        description: 'تحديث بيانات المستخدم. يدعم رفع صورة شخصية بأي حجم عبر multipart/form-data في حقل photo، أو تحديث الاسم في حقل name',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تحديث الملف الشخصي بنجاح' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('profile'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', multerPhotoOptions)),
    (0, swagger_1.ApiOperation)({
        summary: 'Update current user profile via POST (name, photo - any file size)',
        description: 'تحديث بيانات المستخدم. يدعم رفع صورة شخصية بأي حجم عبر multipart/form-data في حقل photo، أو تحديث الاسم في حقل name',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تحديث الملف الشخصي بنجاح' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfilePost", null);
__decorate([
    (0, common_1.Post)('profile/photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', multerPhotoOptions)),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload and update profile photo via FormData (any size)',
        description: 'رفع صورة شخصية للمستخدم بدون حد أقصى للحجم في حقل photo',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Photo uploaded and profile updated' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadProfilePhotoPost", null);
__decorate([
    (0, common_1.Patch)('profile/photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', multerPhotoOptions)),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload and update profile photo via FormData (any size)',
        description: 'رفع صورة شخصية للمستخدم بدون حد أقصى للحجم في حقل photo',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Photo uploaded and profile updated' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadProfilePhotoPatch", null);
__decorate([
    (0, common_1.Put)('profile/photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', multerPhotoOptions)),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload and update profile photo via FormData (any size)',
        description: 'رفع صورة شخصية للمستخدم بدون حد أقصى للحجم في حقل photo',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Photo uploaded and profile updated' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadProfilePhotoPut", null);
__decorate([
    (0, common_1.Get)('profile/photo'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated user profile photo stream' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User photo stream (PNG/JPEG)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getCurrentUserPhoto", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id/photo'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user profile photo (Public)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User photo stream (PNG/JPEG)' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Photo not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getUserPhoto", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single user by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a user by ID (Admin Only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 4019 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a user by ID (Admin Only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 4019 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "remove", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map