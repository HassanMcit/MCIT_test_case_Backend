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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const assign_project_dto_1 = require("./dto/assign-project.dto");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    create(req, dto) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط');
        }
        return this.usersService.create(dto);
    }
    findAll(req) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. عرض قائمة المستخدمين مخصص لمدير النظام (admin) فقط');
        }
        return this.usersService.findAll();
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
    findOne(id) {
        return this.usersService.findOne(id);
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
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single user by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map