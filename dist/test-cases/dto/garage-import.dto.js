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
exports.GarageImportDto = exports.GarageImportRowDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class GarageImportRowDto {
}
exports.GarageImportRowDto = GarageImportRowDto;
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], GarageImportRowDto.prototype, "original", void 0);
class GarageImportDto {
    constructor() {
        this.dryRun = true;
    }
}
exports.GarageImportDto = GarageImportDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ obj }) => obj.dryRun),
    __metadata("design:type", Boolean)
], GarageImportDto.prototype, "dryRun", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^[a-f0-9]{64}$/),
    __metadata("design:type", String)
], GarageImportDto.prototype, "previewHash", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(51),
    (0, class_validator_1.ArrayMaxSize)(51),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GarageImportRowDto),
    __metadata("design:type", Array)
], GarageImportDto.prototype, "rows", void 0);
//# sourceMappingURL=garage-import.dto.js.map