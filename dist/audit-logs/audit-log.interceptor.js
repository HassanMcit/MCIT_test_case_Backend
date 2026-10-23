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
exports.AuditLogInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const audit_logs_service_1 = require("./audit-logs.service");
function resolveActionInfo(method, url, body) {
    const cleanUrl = url.split('?')[0];
    if (cleanUrl.includes('/api/test-cases')) {
        if (method === 'POST') {
            const tcId = body?.testId || 'حالة اختبار';
            const mod = body?.module || '';
            return {
                action: 'إضافة حالة اختبار',
                category: 'TEST_CASES',
                description: `تمت إضافة حالة الاختبار (${tcId}) في مشروع (${mod})`,
            };
        }
        if (method === 'PATCH' || method === 'PUT') {
            const id = cleanUrl.split('/').pop();
            return {
                action: 'تعديل حالة اختبار',
                category: 'TEST_CASES',
                description: `تم تعديل حالة الاختبار رقم #${id}`,
            };
        }
        if (method === 'DELETE') {
            const id = cleanUrl.split('/').pop();
            return {
                action: 'حذف حالة اختبار',
                category: 'TEST_CASES',
                description: `تم حذف حالة الاختبار رقم #${id}`,
            };
        }
    }
    if (cleanUrl.includes('/api/projects')) {
        if (method === 'POST') {
            const name = body?.name || 'مشروع جديد';
            return {
                action: 'إنشاء مشروع جديد',
                category: 'PROJECTS',
                description: `تم إنشاء المشروع (${name})`,
            };
        }
        if (method === 'PATCH' || method === 'PUT') {
            const id = cleanUrl.split('/').pop();
            return {
                action: 'تعديل مشروع',
                category: 'PROJECTS',
                description: `تم تعديل المشروع رقم #${id}`,
            };
        }
        if (method === 'DELETE') {
            const id = cleanUrl.split('/').pop();
            return {
                action: 'حذف مشروع',
                category: 'PROJECTS',
                description: `تم حذف المشروع رقم #${id}`,
            };
        }
    }
    if (cleanUrl.includes('/api/users/profile')) {
        return {
            action: 'تحديث الملف الشخصي',
            category: 'PROFILE',
            description: 'تم تحديث بيانات الملف الشخصي والصورة',
        };
    }
    if (cleanUrl.includes('/api/users')) {
        if (cleanUrl.includes('/assign-projects')) {
            return {
                action: 'إسناد مشاريع لمستخدم',
                category: 'USER_MANAGEMENT',
                description: `تم تحديث مشاريع المستخدم`,
            };
        }
        if (method === 'POST') {
            const name = body?.name || body?.email || 'مستخدم جديد';
            return {
                action: 'إضافة مستخدم جديد',
                category: 'USER_MANAGEMENT',
                description: `تم إنشاء حساب مستخدم جديد (${name})`,
            };
        }
        if (method === 'DELETE') {
            const id = cleanUrl.split('/').pop();
            return {
                action: 'حذف مستخدم',
                category: 'USER_MANAGEMENT',
                description: `تم حذف المستخدم رقم #${id}`,
            };
        }
    }
    if (cleanUrl.includes('/api/auth/login')) {
        return {
            action: 'تسجيل دخول إلى النظام',
            category: 'AUTH',
            description: `تسجيل دخول ناجح بالحساب (${body?.email || ''})`,
        };
    }
    if (cleanUrl.includes('/api/auth/change-password')) {
        return {
            action: 'تغيير كلمة المرور',
            category: 'SECURITY',
            description: 'تم تغيير كلمة مرور الحساب',
        };
    }
    if (cleanUrl.includes('/api/auth/sessions') && cleanUrl.includes('/revoke')) {
        return {
            action: 'تسجيل خروج جهاز عن بُعد',
            category: 'SECURITY',
            description: 'تم إنهاء جلسة جهاز نشط عن بُعد',
        };
    }
    if (cleanUrl.includes('/api/quality')) {
        return {
            action: 'فحص جودة تطبيق حكومي',
            category: 'QUALITY',
            description: `تم حفظ تقرير فحص جودة التطبيق`,
        };
    }
    return {
        action: `${method} ${cleanUrl}`,
        category: 'SYSTEM',
        description: `تنفيذ عملية ${method} على ${cleanUrl}`,
    };
}
let AuditLogInterceptor = class AuditLogInterceptor {
    constructor(auditLogsService) {
        this.auditLogsService = auditLogsService;
    }
    intercept(context, next) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const method = req.method?.toUpperCase();
        const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
            !req.originalUrl?.includes('/api/audit-logs/log');
        if (!shouldLog) {
            return next.handle();
        }
        const startTime = Date.now();
        return next.handle().pipe((0, operators_1.tap)({
            next: (resData) => {
                this.record(req, resData, 'success', startTime);
            },
            error: (err) => {
                this.record(req, null, `failed: ${err?.message || 'Error'}`, startTime);
            },
        }));
    }
    async record(req, resData, status, startTime) {
        try {
            const user = req.user || resData?.user || null;
            const url = req.originalUrl || req.url || '';
            const method = req.method?.toUpperCase() || 'POST';
            const body = req.body || {};
            const actionInfo = resolveActionInfo(method, url, body);
            const forwardedIp = typeof req.headers?.['x-forwarded-for'] === 'string'
                ? req.headers['x-forwarded-for'].split(',')[0].trim()
                : '';
            const ip = req.headers?.['x-client-ip'] ||
                body?.clientIp ||
                forwardedIp ||
                req.headers?.['x-real-ip'] ||
                req.ip ||
                'Unknown IP';
            const userAgent = req.headers?.['user-agent'] || body?.userAgent || '';
            const deviceInfo = req.headers?.['x-device-info'] ||
                body?.deviceInfo ||
                (0, audit_logs_service_1.parseDeviceSummary)(userAgent);
            const macAddress = req.headers?.['x-device-mac'] ||
                body?.macAddress ||
                (0, audit_logs_service_1.generateDeterministicMac)(`${ip}|${userAgent}|${deviceInfo}`);
            const location = req.headers?.['x-location'] ||
                body?.location ||
                (await this.auditLogsService.resolveLocation(ip));
            await this.auditLogsService.log({
                userId: user?.id || user?.userId || null,
                userName: user?.name || null,
                email: user?.email || body?.email || null,
                role: user?.role || null,
                action: actionInfo.action,
                actionCategory: actionInfo.category,
                description: actionInfo.description,
                method,
                endpoint: url,
                ip,
                macAddress,
                location,
                deviceInfo,
                userAgent,
                status,
            });
        }
        catch (e) {
            console.error('AuditLogInterceptor error:', e);
        }
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_logs_service_1.AuditLogsService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map