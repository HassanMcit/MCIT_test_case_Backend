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
exports.AuditLogsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const audit_logs_service_1 = require("./audit-logs.service");
let AuditLogsController = class AuditLogsController {
    constructor(auditLogsService) {
        this.auditLogsService = auditLogsService;
    }
    findAll(req, page, limit, search, category, userId) {
        if (req.user?.role !== 'admin') {
            throw new common_1.ForbiddenException('غير مصرح لك بالاطلاع على سجل تدقيق العمليات');
        }
        return this.auditLogsService.findAll({
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 30,
            search,
            actionCategory: category,
            userId: userId ? Number(userId) : undefined,
        });
    }
    async recordClientAction(req, body) {
        const user = req.user;
        const ip = body.ip ||
            req.headers?.['x-client-ip'] ||
            (typeof req.headers?.['x-forwarded-for'] === 'string'
                ? req.headers['x-forwarded-for'].split(',')[0].trim()
                : '') ||
            req.ip;
        const userAgent = body.userAgent || req.headers?.['user-agent'] || '';
        await this.auditLogsService.log({
            userId: user?.id || user?.userId || null,
            userName: user?.name || null,
            email: user?.email || null,
            role: user?.role || null,
            action: body.action || 'إجراء في النظام',
            actionCategory: body.actionCategory || 'CLIENT_ACTION',
            description: body.description || null,
            method: body.method || 'UI_ACTION',
            endpoint: body.endpoint || req.originalUrl,
            ip,
            macAddress: body.macAddress || req.headers?.['x-device-mac'],
            location: body.location || req.headers?.['x-location'],
            deviceInfo: body.deviceInfo || req.headers?.['x-device-info'],
            userAgent,
            status: body.status || 'success',
        });
        return { success: true };
    }
};
exports.AuditLogsController = AuditLogsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity audit logs with client telemetry (Admin Only)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('category')),
    __param(5, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AuditLogsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('log'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Record custom client-side user action' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "recordClientAction", null);
exports.AuditLogsController = AuditLogsController = __decorate([
    (0, swagger_1.ApiTags)('Audit Logs'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('audit-logs'),
    __metadata("design:paramtypes", [audit_logs_service_1.AuditLogsService])
], AuditLogsController);
//# sourceMappingURL=audit-logs.controller.js.map