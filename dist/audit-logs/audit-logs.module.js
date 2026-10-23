"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogsModule = void 0;
const common_1 = require("@nestjs/common");
const audit_logs_service_1 = require("./audit-logs.service");
const audit_logs_controller_1 = require("./audit-logs.controller");
const audit_log_interceptor_1 = require("./audit-log.interceptor");
const database_module_1 = require("../database/database.module");
let AuditLogsModule = class AuditLogsModule {
};
exports.AuditLogsModule = AuditLogsModule;
exports.AuditLogsModule = AuditLogsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [audit_logs_controller_1.AuditLogsController],
        providers: [audit_logs_service_1.AuditLogsService, audit_log_interceptor_1.AuditLogInterceptor],
        exports: [audit_logs_service_1.AuditLogsService, audit_log_interceptor_1.AuditLogInterceptor],
    })
], AuditLogsModule);
//# sourceMappingURL=audit-logs.module.js.map