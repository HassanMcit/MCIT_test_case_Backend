import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService, parseDeviceSummary, generateDeterministicMac } from './audit-logs.service';

function resolveActionInfo(method: string, url: string, body: any): { action: string; category: string; description: string } {
  const cleanUrl = url.split('?')[0];

  // Test cases
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

  // Projects
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

  // Users & Profiles
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

  // Auth
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

  // Quality Applications
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

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const method = req.method?.toUpperCase();

    // We track state modifying methods or login
    const shouldLog =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
      !req.originalUrl?.includes('/api/audit-logs/log');

    if (!shouldLog) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (resData) => {
          this.record(req, resData, 'success', startTime);
        },
        error: (err) => {
          this.record(req, null, `failed: ${err?.message || 'Error'}`, startTime);
        },
      })
    );
  }

  private async record(req: any, resData: any, status: string, startTime: number) {
    try {
      const user = req.user || resData?.user || null;
      const url = req.originalUrl || req.url || '';
      const method = req.method?.toUpperCase() || 'POST';
      const body = req.body || {};

      const actionInfo = resolveActionInfo(method, url, body);

      const forwardedIp =
        typeof req.headers?.['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : '';
      const ip =
        req.headers?.['x-client-ip'] ||
        body?.clientIp ||
        forwardedIp ||
        req.headers?.['x-real-ip'] ||
        req.ip ||
        'Unknown IP';

      const userAgent = req.headers?.['user-agent'] || body?.userAgent || '';
      const deviceInfo =
        req.headers?.['x-device-info'] ||
        body?.deviceInfo ||
        parseDeviceSummary(userAgent);

      const macAddress =
        req.headers?.['x-device-mac'] ||
        body?.macAddress ||
        generateDeterministicMac(`${ip}|${userAgent}|${deviceInfo}`);

      const location =
        req.headers?.['x-location'] ||
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
    } catch (e) {
      console.error('AuditLogInterceptor error:', e);
    }
  }
}
