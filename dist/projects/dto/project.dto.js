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
exports.UpdateProjectDto = exports.CreateProjectDto = exports.ProjectStatus = exports.ProjectEnvironment = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ProjectEnvironment;
(function (ProjectEnvironment) {
    ProjectEnvironment["PRODUCTION"] = "production";
    ProjectEnvironment["STAGING"] = "staging";
})(ProjectEnvironment || (exports.ProjectEnvironment = ProjectEnvironment = {}));
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["ACTIVE"] = "active";
    ProjectStatus["ARCHIVED"] = "archived";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
class CreateProjectDto {
}
exports.CreateProjectDto = CreateProjectDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ISO 8601 timestamp with UTC offset' }),
    (0, class_validator_1.IsISO8601)({ strict: true }),
    (0, class_validator_1.Matches)(/(Z|[+-]\d{2}:\d{2})$/),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "startAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ISO 8601 timestamp with UTC offset' }),
    (0, class_validator_1.IsISO8601)({ strict: true }),
    (0, class_validator_1.Matches)(/(Z|[+-]\d{2}:\d{2})$/),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "endAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        nullable: true,
        description: 'Designated user ID (Tester or Admin); legacy field name retained for compatibility',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProjectDto.prototype, "assignedTesterId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "application", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'البوابة الرقمية المصرية',
        description: 'Project name (validated with Regex)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[\p{L}\p{N}\s\-_.,()&/:'"+–—]{2,200}$/u, {
        message: 'اسم المشروع يجب أن يتكون من 2 إلى 200 حرف ويحتوي على أحرف وأرقام مقبولة',
    }),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'National digital services gateway',
        description: 'Short description',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ProjectEnvironment,
        default: ProjectEnvironment.STAGING,
        description: 'Environment (production | staging)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(production|staging)$/, {
        message: 'البيئة يجب أن تكون إما production أو staging',
    }),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "environment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ProjectStatus,
        default: ProjectStatus.ACTIVE,
        description: 'Status (active | archived)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(active|archived)$/, {
        message: 'حالة المشروع يجب أن تكون إما active أو archived',
    }),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "status", void 0);
class UpdateProjectDto extends (0, swagger_1.PartialType)(CreateProjectDto, {
    skipNullProperties: false,
}) {
}
exports.UpdateProjectDto = UpdateProjectDto;
__decorate([
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsISO8601)({ strict: true }),
    (0, class_validator_1.Matches)(/(Z|[+-]\d{2}:\d{2})$/),
    __metadata("design:type", String)
], UpdateProjectDto.prototype, "startAt", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsISO8601)({ strict: true }),
    (0, class_validator_1.Matches)(/(Z|[+-]\d{2}:\d{2})$/),
    __metadata("design:type", String)
], UpdateProjectDto.prototype, "endAt", void 0);
//# sourceMappingURL=project.dto.js.map