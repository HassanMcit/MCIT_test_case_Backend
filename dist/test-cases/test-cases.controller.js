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
exports.TestCasesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const test_cases_service_1 = require("./test-cases.service");
const test_case_dto_1 = require("./dto/test-case.dto");
let TestCasesController = class TestCasesController {
    constructor(testCasesService) {
        this.testCasesService = testCasesService;
    }
    create(dto) {
        return this.testCasesService.create(dto);
    }
    findAll(page, limit, status, priority, module, projectId, search) {
        return this.testCasesService.findAll({ page, limit, status, priority, module, projectId, search });
    }
    findOne(id) {
        return this.testCasesService.findOne(id);
    }
    update(id, dto) {
        return this.testCasesService.update(id, dto);
    }
    remove(id) {
        return this.testCasesService.remove(id);
    }
};
exports.TestCasesController = TestCasesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new test case' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Test case created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Test case ID already exists' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [test_case_dto_1.CreateTestCaseDto]),
    __metadata("design:returntype", void 0)
], TestCasesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all test cases (filterable, paginated)' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (default 10)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, type: String, example: 'passed', description: 'Filter by status: passed | failed | pending' }),
    (0, swagger_1.ApiQuery)({ name: 'priority', required: false, type: String, example: 'high', description: 'Filter by priority: critical | high | medium | low' }),
    (0, swagger_1.ApiQuery)({ name: 'module', required: false, type: String, example: 'Auth', description: 'Filter by module name (partial match)' }),
    (0, swagger_1.ApiQuery)({ name: 'projectId', required: false, type: Number, example: 1, description: 'Filter by project ID' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String, example: 'login', description: 'Search in testId, module, and scenario' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of test cases' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('priority')),
    __param(4, (0, common_1.Query)('module')),
    __param(5, (0, common_1.Query)('projectId')),
    __param(6, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, Number, String]),
    __metadata("design:returntype", void 0)
], TestCasesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single test case by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Test case found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Test case not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TestCasesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a test case (partial update)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Test case updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Test case not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, test_case_dto_1.UpdateTestCaseDto]),
    __metadata("design:returntype", void 0)
], TestCasesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a test case' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Test case deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Test case not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TestCasesController.prototype, "remove", null);
exports.TestCasesController = TestCasesController = __decorate([
    (0, swagger_1.ApiTags)('Test Cases'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('test-cases'),
    __metadata("design:paramtypes", [test_cases_service_1.TestCasesService])
], TestCasesController);
//# sourceMappingURL=test-cases.controller.js.map