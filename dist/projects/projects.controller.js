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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const projects_service_1 = require("./projects.service");
const project_dto_1 = require("./dto/project.dto");
let ProjectsController = class ProjectsController {
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    create(req, dto) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. إنشاء المشاريع مخصص لمدير النظام (admin) فقط');
        }
        return this.projectsService.create(dto);
    }
    findAll(req, environment, status, search, assignedToMe, assignedToUserId, cacheUser) {
        return this.projectsService.findAll({ environment, status, search, assignedToMe, assignedToUserId }, req.user);
    }
    findOne(req, id) {
        return this.projectsService.findOne(id, req.user);
    }
    update(req, id, dto) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. تعديل المشاريع مخصص لمدير النظام (admin) فقط');
        }
        return this.projectsService.update(id, dto);
    }
    remove(req, id) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك. حذف المشاريع مخصص لمدير النظام (admin) فقط');
        }
        return this.projectsService.remove(id);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new project (Admin Only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Project created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List projects (Admin sees all, Tester sees assigned only, or filter by assignedToMe / assignedToUserId)' }),
    (0, swagger_1.ApiQuery)({ name: 'environment', required: false, example: 'production', description: 'Filter by environment: production | staging' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, example: 'active', description: 'Filter by status: active | archived' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, example: 'portal', description: 'Search in name or description' }),
    (0, swagger_1.ApiQuery)({ name: 'assignedToMe', required: false, example: true, description: 'Filter projects assigned to current user (even if admin)' }),
    (0, swagger_1.ApiQuery)({ name: 'assignedToUserId', required: false, example: 1, description: 'Filter projects assigned to a specific user ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Array of projects with test-case stats' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('environment')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('assignedToMe')),
    __param(5, (0, common_1.Query)('assignedToUserId')),
    __param(6, (0, common_1.Query)('cacheUser')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a project by ID (includes recent test cases)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project with recent test cases' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Not assigned to this project' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a project (Admin Only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project updated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, project_dto_1.UpdateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a project (Admin Only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project deleted' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "remove", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, swagger_1.ApiTags)('Projects'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map