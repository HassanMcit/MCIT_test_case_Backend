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
exports.WorkflowController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const workflow_service_1 = require("./workflow.service");
const workflow_dto_1 = require("./workflow.dto");
let WorkflowController = class WorkflowController {
    constructor(service) {
        this.service = service;
    }
    releases(id, q, req) {
        return this.service.releases(id, q, req.user);
    }
    createRelease(id, dto, req) {
        return this.service.createRelease(id, dto, req.user);
    }
    release(projectId, id, req) {
        return this.service.release(projectId, id, req.user);
    }
    updateRelease(projectId, id, dto, req) {
        return this.service.updateRelease(projectId, id, dto, req.user);
    }
    cycles(q, req) {
        return this.service.cycles(q, req.user);
    }
    createCycle(dto, req) {
        return this.service.createCycle(dto, req.user);
    }
    cycle(id, req) {
        return this.service.cycle(id, req.user);
    }
    updateCycle(id, dto, req) {
        return this.service.updateCycle(id, dto, req.user);
    }
    candidates(id, q, req) {
        return this.service.candidates(id, q, req.user);
    }
    addItems(id, dto, req) {
        return this.service.addItems(id, dto, req.user);
    }
    items(id, q, req) {
        return this.service.items(id, q, req.user);
    }
    assign(id, itemId, dto, req) {
        return this.service.assign(id, itemId, dto, req.user);
    }
    execute(id, itemId, dto, req) {
        return this.service.execute(id, itemId, dto, req.user);
    }
    history(id, q, req) {
        return this.service.history(id, q, req.user);
    }
    metrics(q, req) {
        return this.service.metrics(q, req.user);
    }
};
exports.WorkflowController = WorkflowController;
__decorate([
    (0, common_1.Get)('projects/:projectId/releases'),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.WorkflowQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "releases", null);
__decorate([
    (0, common_1.Post)('projects/:projectId/releases'),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.CreateReleaseDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "createRelease", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/releases/:id'),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "release", null);
__decorate([
    (0, common_1.Patch)('projects/:projectId/releases/:id'),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, workflow_dto_1.UpdateReleaseDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "updateRelease", null);
__decorate([
    (0, common_1.Get)('test-cycles'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [workflow_dto_1.WorkflowQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "cycles", null);
__decorate([
    (0, common_1.Post)('test-cycles'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [workflow_dto_1.CreateCycleDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "createCycle", null);
__decorate([
    (0, common_1.Get)('test-cycles/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "cycle", null);
__decorate([
    (0, common_1.Patch)('test-cycles/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.UpdateCycleDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "updateCycle", null);
__decorate([
    (0, common_1.Get)('test-cycles/:id/candidates'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.WorkflowQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "candidates", null);
__decorate([
    (0, common_1.Post)('test-cycles/:id/items'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.AddCycleItemsDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "addItems", null);
__decorate([
    (0, common_1.Get)('test-cycles/:id/items'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.WorkflowQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "items", null);
__decorate([
    (0, common_1.Patch)('test-cycles/:id/items/:itemId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, workflow_dto_1.AssignCycleItemDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)('test-cycles/:id/items/:itemId/executions'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, workflow_dto_1.CreateExecutionDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "execute", null);
__decorate([
    (0, common_1.Get)('test-cases/:id/executions'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, workflow_dto_1.WorkflowQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('dashboard/executions'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [workflow_dto_1.WorkflowQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "metrics", null);
exports.WorkflowController = WorkflowController = __decorate([
    (0, swagger_1.ApiTags)('Execution workflow'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [workflow_service_1.WorkflowService])
], WorkflowController);
//# sourceMappingURL=workflow.controller.js.map