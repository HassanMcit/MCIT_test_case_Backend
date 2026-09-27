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
exports.CreateUserDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateUserDto {
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'محمود أحمد النجار',
        description: 'Full name of the user',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[\p{L}\p{N}\s\-_.,()'"/]{2,50}$/u, {
        message: 'الاسم يجب أن يتكون من 2 إلى 50 حرف مقبولة',
    }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'mahmoud@mcit.gov.eg',
        description: 'Unique email address',
    }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
        message: 'البريد الإلكتروني غير صالح. يجب أن يطابق الصيغة user@domain.com',
    }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'password123',
        description: 'Password (between 6 and 50 characters)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^.{6,50}$/, {
        message: 'كلمة المرور يجب أن تكون بين 6 إلى 50 حرفاً',
    }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'user',
        description: 'User role: admin | user (optional, defaults to user)',
        enum: ['admin', 'user'],
        default: 'user',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(admin|user)$/, {
        message: 'الدور (role) يجب أن يكون إما admin أو user فقط',
    }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
//# sourceMappingURL=create-user.dto.js.map