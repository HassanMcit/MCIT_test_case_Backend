import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  photo?: string;
  profileImage?: string;
  createdAt: string;
}

interface UserRow extends UserProfile {
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Login ──────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = this.databaseService.db
      .prepare('SELECT id, name, email, password, role, photo, profileImage FROM users WHERE email = ?')
      .get(dto.email) as unknown as UserRow | undefined;

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
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

  // ── Get current user ───────────────────────────────────────────────
  async getMe(userId: number): Promise<UserProfile> {
    const user = this.databaseService.db
      .prepare('SELECT id, name, email, role, photo, profileImage, createdAt FROM users WHERE id = ?')
      .get(userId) as unknown as UserProfile | undefined;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
    const userPhoto = user.photo || user.profileImage || DEFAULT_PHOTO;
    return {
      ...user,
      photo: userPhoto,
      profileImage: userPhoto,
    };
  }

  // ── Change Password (Authenticated) ────────────────────────────────
  async changePassword(userId: number, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية');
    }

    const user = this.databaseService.db
      .prepare('SELECT id, password FROM users WHERE id = ?')
      .get(userId) as { id: number; password: string } | undefined;

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    this.databaseService.db
      .prepare("UPDATE users SET password = ?, updatedAt = datetime('now') WHERE id = ?")
      .run(hashedPassword, userId);

    return {
      message: 'تم تغيير كلمة المرور بنجاح',
    };
  }

  // ── Forgot Password: Send/Generate OTP ─────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = this.databaseService.db
      .prepare('SELECT id, name, email, role FROM users WHERE email = ?')
      .get(dto.email) as { id: number; name: string; email: string; role: string } | undefined;

    if (!user) {
      throw new NotFoundException('البريد الإلكتروني غير مسجل في النظام');
    }

    // Invalidate previous active codes for this email
    this.databaseService.db
      .prepare('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0')
      .run(dto.email);

    // Generate 6-digit random code
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

  // ── Verify Reset Code ──────────────────────────────────────────────
  async verifyResetCode(dto: VerifyResetCodeDto) {
    const record = this.databaseService.db
      .prepare(`
        SELECT id, email, code, expiresAt, used
        FROM password_resets
        WHERE email = ? AND code = ? AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `)
      .get(dto.email, dto.code) as { id: number; email: string; code: string; expiresAt: string; used: number } | undefined;

    if (!record) {
      throw new BadRequestException('كود التحقق غير صحيح أو تم استخدامه بالفعل');
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('انتهت صلاحية كود التحقق. يرجى طلب كود جديد');
    }

    return {
      valid: true,
      message: 'كود التحقق صحيح. يمكنك الآن تعيين كلمة المرور وتأكيدها',
    };
  }

  // ── Reset Password with Code ───────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين');
    }

    const user = this.databaseService.db
      .prepare('SELECT id, name, email FROM users WHERE email = ?')
      .get(dto.email) as { id: number; name: string; email: string } | undefined;

    if (!user) {
      throw new NotFoundException('البريد الإلكتروني غير مسجل في النظام');
    }

    const record = this.databaseService.db
      .prepare(`
        SELECT id, email, code, expiresAt, used
        FROM password_resets
        WHERE email = ? AND code = ? AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `)
      .get(dto.email, dto.code) as { id: number; email: string; code: string; expiresAt: string; used: number } | undefined;

    if (!record) {
      throw new BadRequestException('كود التحقق غير صحيح أو تم استخدامه بالفعل');
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('انتهت صلاحية كود التحقق. يرجى طلب كود جديد');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    this.databaseService.db
      .prepare("UPDATE users SET password = ?, updatedAt = datetime('now') WHERE id = ?")
      .run(hashedPassword, user.id);

    // Mark code as used
    this.databaseService.db
      .prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
      .run(record.id);

    return {
      message: 'تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة',
    };
  }
}

