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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const database_service_1 = require("../database/database.service");
let AuthService = class AuthService {
    constructor(databaseService, jwtService) {
        this.databaseService = databaseService;
        this.jwtService = jwtService;
    }
    async login(dto) {
        const user = this.databaseService.db
            .prepare('SELECT id, name, email, password, role, photo, profileImage FROM users WHERE email = ?')
            .get(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const payload = { sub: user.id, email: user.email, role: user.role };
        const token = this.jwtService.sign(payload, { expiresIn: '7d' });
        const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
        const userPhoto = user.photo || user.profileImage || DEFAULT_PHOTO;
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                photo: userPhoto,
                profileImage: userPhoto,
            },
        };
    }
    async getMe(userId) {
        const user = this.databaseService.db
            .prepare('SELECT id, name, email, role, photo, profileImage, createdAt FROM users WHERE id = ?')
            .get(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
        const userPhoto = user.photo || user.profileImage || DEFAULT_PHOTO;
        return {
            ...user,
            photo: userPhoto,
            profileImage: userPhoto,
        };
    }
    async changePassword(userId, dto) {
        if (dto.newPassword !== dto.confirmPassword) {
            throw new common_1.BadRequestException('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين');
        }
        if (dto.oldPassword === dto.newPassword) {
            throw new common_1.BadRequestException('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية');
        }
        const user = this.databaseService.db
            .prepare('SELECT id, password FROM users WHERE id = ?')
            .get(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('المستخدم غير موجود');
        }
        const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
        if (!isMatch) {
            throw new common_1.BadRequestException('كلمة المرور الحالية غير صحيحة');
        }
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        this.databaseService.db
            .prepare("UPDATE users SET password = ?, updatedAt = datetime('now') WHERE id = ?")
            .run(hashedPassword, userId);
        return {
            message: 'تم تغيير كلمة المرور بنجاح',
        };
    }
    async forgotPassword(dto) {
        const user = this.databaseService.db
            .prepare('SELECT id, name, email, role FROM users WHERE email = ?')
            .get(dto.email);
        if (!user) {
            throw new common_1.NotFoundException('البريد الإلكتروني غير مسجل في النظام');
        }
        this.databaseService.db
            .prepare('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0')
            .run(dto.email);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.databaseService.db
            .prepare(`
        INSERT INTO password_resets (email, code, expiresAt, used)
        VALUES (?, ?, ?, 0)
      `)
            .run(dto.email, code, expiresAt);
        console.log(`🔑 [Password Reset OTP] User: ${user.name} (${user.email}), Role: ${user.role}, Code: ${code}`);
        return {
            message: `تم إنشاء كود استعادة كلمة المرور وإرساله بنجاح إلى البريد الإلكتروني الخاص بـ ${user.name}`,
            email: user.email,
            code: code,
            expiresIn: '15 دقيقة',
        };
    }
    async verifyResetCode(dto) {
        const record = this.databaseService.db
            .prepare(`
        SELECT id, email, code, expiresAt, used
        FROM password_resets
        WHERE email = ? AND code = ? AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `)
            .get(dto.email, dto.code);
        if (!record) {
            throw new common_1.BadRequestException('كود التحقق غير صحيح أو تم استخدامه بالفعل');
        }
        if (new Date(record.expiresAt).getTime() < Date.now()) {
            throw new common_1.BadRequestException('انتهت صلاحية كود التحقق. يرجى طلب كود جديد');
        }
        return {
            valid: true,
            message: 'كود التحقق صحيح. يمكنك الآن تعيين كلمة المرور وتأكيدها',
        };
    }
    async resetPassword(dto) {
        if (dto.newPassword !== dto.confirmPassword) {
            throw new common_1.BadRequestException('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين');
        }
        const user = this.databaseService.db
            .prepare('SELECT id, name, email FROM users WHERE email = ?')
            .get(dto.email);
        if (!user) {
            throw new common_1.NotFoundException('البريد الإلكتروني غير مسجل في النظام');
        }
        const record = this.databaseService.db
            .prepare(`
        SELECT id, email, code, expiresAt, used
        FROM password_resets
        WHERE email = ? AND code = ? AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `)
            .get(dto.email, dto.code);
        if (!record) {
            throw new common_1.BadRequestException('كود التحقق غير صحيح أو تم استخدامه بالفعل');
        }
        if (new Date(record.expiresAt).getTime() < Date.now()) {
            throw new common_1.BadRequestException('انتهت صلاحية كود التحقق. يرجى طلب كود جديد');
        }
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        this.databaseService.db
            .prepare("UPDATE users SET password = ?, updatedAt = datetime('now') WHERE id = ?")
            .run(hashedPassword, user.id);
        this.databaseService.db
            .prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
            .run(record.id);
        return {
            message: 'تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة',
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map