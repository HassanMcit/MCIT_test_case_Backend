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
exports.ChangePasswordDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Mm$$1020',
        description: 'كلمة المرور الحالية',
    }),
    (0, class_validator_1.IsString)({ message: 'كلمة المرور الحالية يجب أن تكون نصاً' }),
    (0, class_validator_1.MinLength)(6, {
        message: 'كلمة المرور الحالية يجب أن تكون 6 أحرف على الأقل',
    }),
    (0, class_validator_1.MaxLength)(50, {
        message: 'كلمة المرور الحالية لا يمكن أن تتجاوز 50 حرفاً',
    }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "oldPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'NewPass@2026',
        description: 'كلمة المرور الجديدة',
    }),
    (0, class_validator_1.IsString)({ message: 'كلمة المرور الجديدة يجب أن تكون نصاً' }),
    (0, class_validator_1.Matches)(PASSWORD_REGEX, {
        message: 'يجب أن تتكون كلمة المرور من 8 خانات على الأقل، وتحتوي على حرف كبير، وحرف صغير، ورقم، ورمز خاص.',
    }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'NewPass@2026',
        description: 'تأكيد كلمة المرور الجديدة',
    }),
    (0, class_validator_1.IsString)({ message: 'تأكيد كلمة المرور يجب أن يكون نصاً' }),
    (0, class_validator_1.Matches)(PASSWORD_REGEX, {
        message: 'يجب أن تتكون كلمة المرور من 8 خانات على الأقل، وتحتوي على حرف كبير، وحرف صغير، ورقم، ورمز خاص.',
    }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "confirmPassword", void 0);
//# sourceMappingURL=change-password.dto.js.map