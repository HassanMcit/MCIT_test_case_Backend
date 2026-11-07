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
exports.VerifyResetCodeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const account_email_policy_1 = require("../account-email-policy");
class VerifyResetCodeDto {
}
exports.VerifyResetCodeDto = VerifyResetCodeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'h.ali@mcit.gov.eg',
        description: 'البريد الإلكتروني المسجل',
    }),
    (0, account_email_policy_1.IsAllowedAccountEmail)(),
    __metadata("design:type", String)
], VerifyResetCodeDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '123456',
        description: 'كود التحقق المكون من 6 أرقام',
    }),
    (0, class_validator_1.Matches)(/^[0-9]{6}$/, {
        message: 'كود التحقق يجب أن يتكون من 6 أرقام',
    }),
    __metadata("design:type", String)
], VerifyResetCodeDto.prototype, "code", void 0);
//# sourceMappingURL=verify-reset-code.dto.js.map