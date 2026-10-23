"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogsService = void 0;
exports.generateDeterministicMac = generateDeterministicMac;
exports.parseDeviceSummary = parseDeviceSummary;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("node:crypto"));
const database_service_1 = require("../database/database.service");
function generateDeterministicMac(seed) {
    const hash = crypto.createHash('sha256').update(seed || 'mcit-device').digest('hex');
    const firstByte = ((parseInt(hash.slice(0, 2), 16) | 0x02) & 0xfe)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    return [
        firstByte,
        hash.slice(2, 4).toUpperCase(),
        hash.slice(4, 6).toUpperCase(),
        hash.slice(6, 8).toUpperCase(),
        hash.slice(8, 10).toUpperCase(),
        hash.slice(10, 12).toUpperCase(),
    ].join(':');
}
function parseDeviceSummary(ua) {
    if (!ua)
        return 'Unknown Device';
    let os = 'Unknown OS';
    if (/Windows NT 10\.0/i.test(ua))
        os = 'Windows 10/11';
    else if (/Windows NT/i.test(ua))
        os = 'Windows';
    else if (/Mac OS X/i.test(ua))
        os = 'macOS';
    else if (/Android/i.test(ua))
        os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua))
        os = 'iOS';
    else if (/Linux/i.test(ua))
        os = 'Linux';
    let browser = 'Browser';
    if (/Edg\//i.test(ua))
        browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(ua))
        browser = 'Google Chrome';
    else if (/Firefox\//i.test(ua))
        browser = 'Mozilla Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua))
        browser = 'Safari';
    return `${os} - ${browser}`;
}
let AuditLogsService = class AuditLogsService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async resolveLocation(ip) {
        if (!ip || ip === 'Unknown IP' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return 'Cairo, Egypt (Internal Network)';
        }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const data = await res.json();
                if (data?.status === 'success') {
                    const parts = [data.city, data.regionName, data.country].filter(Boolean);
                    const loc = parts.join(', ');
                    return data.isp ? `${loc} (${data.isp})` : loc;
                }
            }
        }
        catch { }
        return 'Egypt';
    }
    async log(dto) {
        try {
            const db = this.databaseService.db;
            const ip = dto.ip || 'Unknown IP';
            const userAgent = dto.userAgent || '';
            const deviceInfo = dto.deviceInfo || parseDeviceSummary(userAgent);
            const macAddress = dto.macAddress || generateDeterministicMac(`${ip}|${userAgent}|${deviceInfo}`);
            const location = dto.location || (await this.resolveLocation(ip));
            await db.query(`INSERT INTO audit_logs (
          "userId", "userName", email, role, action, "actionCategory",
          description, method, endpoint, ip, "macAddress", location,
          "deviceInfo", "userAgent", status, "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
        )`, [
                dto.userId || null,
                dto.userName || null,
                dto.email || null,
                dto.role || null,
                dto.action,
                dto.actionCategory || 'GENERAL',
                dto.description || null,
                dto.method || 'ACTION',
                dto.endpoint || null,
                ip,
                macAddress,
                location,
                deviceInfo,
                userAgent,
                dto.status || 'success',
            ]);
        }
        catch (err) {
            console.error('Failed to write audit log:', err);
        }
    }
    async findAll(query) {
        const db = this.databaseService.db;
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let pidx = 1;
        if (query.userId) {
            conditions.push(`"userId" = $${pidx++}`);
            params.push(Number(query.userId));
        }
        if (query.actionCategory && query.actionCategory !== 'all') {
            conditions.push(`"actionCategory" = $${pidx++}`);
            params.push(query.actionCategory);
        }
        if (query.search && query.search.trim()) {
            const term = `%${query.search.trim()}%`;
            conditions.push(`(
        "userName" ILIKE $${pidx} OR
        email ILIKE $${pidx} OR
        action ILIKE $${pidx} OR
        description ILIKE $${pidx} OR
        ip ILIKE $${pidx} OR
        "macAddress" ILIKE $${pidx} OR
        location ILIKE $${pidx}
      )`);
            params.push(term);
            pidx++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRes = await db.query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
        const total = Number(countRes.rows[0]?.total || 0);
        const dataRes = await db.query(`SELECT * FROM audit_logs
       ${whereClause}
       ORDER BY "createdAt" DESC, id DESC
       LIMIT $${pidx++} OFFSET $${pidx++}`, [...params, limit, offset]);
        return {
            data: dataRes.rows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuditLogsService);
//# sourceMappingURL=audit-logs.service.js.map