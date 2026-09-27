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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTestCaseDto = exports.CreateTestCaseDto = exports.Status = exports.Priority = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var Priority;
(function (Priority) {
    Priority["CRITICAL"] = "critical";
    Priority["HIGH"] = "high";
    Priority["MEDIUM"] = "medium";
    Priority["LOW"] = "low";
})(Priority || (exports.Priority = Priority = {}));
var Status;
(function (Status) {
    Status["PASSED"] = "passed";
    Status["FAILED"] = "failed";
    Status["PENDING"] = "pending";
})(Status || (exports.Status = Status = {}));
class CreateTestCaseDto {
}
exports.CreateTestCaseDto = CreateTestCaseDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'TC-8492',
        description: 'Custom test ID matching TC-XXXX (validated with Regex)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^TC-\d{4,}$/, {
        message: 'يجب أن يطابق معرّف الاختبار النمط TC-XXXX (مثل TC-8492)',
    }),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "testId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Authentication',
        description: 'System module being tested (validated with Regex)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[\p{L}\p{N}\s\-_.,()&/]{2,50}$/u, {
        message: 'اسم الوحدة البرمجية يجب أن يتكون من 2 إلى 50 حرف مقبولة',
    }),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Login Page',
        description: 'Specific page or screen name',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "pageName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Validate SSO token via SMS 2FA',
        description: 'Test scenario description',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5, { message: 'سيناريو الاختبار يجب ألا يقل عن 5 أحرف' }),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "scenario", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'User must be registered with admin role' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "preConditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: ['Navigate to login', 'Enter credentials', 'Click submit'],
        description: 'Array of test steps',
        type: [String],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTestCaseDto.prototype, "steps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'User is redirected to dashboard' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "expectedResult", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'User was redirected successfully' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "actualResult", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: Priority,
        default: Priority.MEDIUM,
        description: 'Priority level (critical | high | medium | low)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(critical|high|medium|low)$/, {
        message: 'الأولوية يجب أن تكون إما: critical أو high أو medium أو low',
    }),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: Status,
        default: Status.PENDING,
        description: 'Execution status (passed | failed | pending)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(passed|failed|pending)$/, {
        message: 'الحالة يجب أن تكون إما: passed أو failed أو pending',
    }),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Intermittent on mobile' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2026-09-27T14:20:00.000Z',
        description: 'Execution timestamp in ISO 8601 format',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, {
        message: 'تاريخ التنفيذ يجب أن يطابق صيغة ISO 8601 (مثل YYYY-MM-DD أو YYYY-MM-DDTHH:mm:ss.sssZ)',
    }),
    __metadata("design:type", String)
], CreateTestCaseDto.prototype, "executedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'ID of the tester (User)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'معرّف الفاحص يجب أن يكون رقماً صحيحاً' }),
    __metadata("design:type", Number)
], CreateTestCaseDto.prototype, "testerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'ID of the project this test case belongs to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'معرّف المشروع يجب أن يكون رقماً صحيحاً' }),
    __metadata("design:type", Number)
], CreateTestCaseDto.prototype, "projectId", void 0);
class UpdateTestCaseDto extends (0, swagger_1.PartialType)(CreateTestCaseDto) {
}
exports.UpdateTestCaseDto = UpdateTestCaseDto;
//# sourceMappingURL=test-case.dto.js.map