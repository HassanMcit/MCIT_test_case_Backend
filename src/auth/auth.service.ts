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
  userId?: number;
  name: string;
  email: string;
  role: string;
  photo?: string;
  profileImage?: string;
  createdAt: string;
}

interface UserRow extends UserProfile {
  password: string;
  updatedAt?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Login ──────────────────────────────────────────────────────────
  async login(dto: LoginDto, req?: any) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const userResult = await this.databaseService.db.query(
      'SELECT id, name, email, password, role, photo, "profileImage", "updatedAt" FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );
    const user = userResult.rows[0] as unknown as UserRow | undefined;

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, id: user.id, userId: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload, { expiresIn: '7d' });

    const photoUrl = this.databaseService.resolvePhotoUrl(user, req);
    return {
      access_token: token,
      userId: user.id,
      user: {
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: photoUrl,
        profileImage: photoUrl,
      },
    };
  }

  // ── Get current user ───────────────────────────────────────────────
  async getMe(userId: number, req?: any): Promise<UserProfile> {
    const userResult = await this.databaseService.db.query(
      'SELECT id, name, email, role, photo, "profileImage", "createdAt", "updatedAt" FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0] as unknown as (UserProfile & { updatedAt?: string }) | undefined;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const photoUrl = this.databaseService.resolvePhotoUrl(user, req);
    return {
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: photoUrl,
      profileImage: photoUrl,
      createdAt: user.createdAt,
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

    const numericUserId = Number(userId);
    const userResult = await this.databaseService.db.query(
      'SELECT id, password FROM users WHERE id = $1',
      [numericUserId]
    );
    const user = userResult.rows[0] as { id: number; password: string } | undefined;

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.databaseService.db.query(
      'UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, numericUserId]
    );

    return {
      message: 'تم تغيير كلمة المرور بنجاح',
      userId: numericUserId,
    };
  }

  // ── Forgot Password: Send/Generate OTP ─────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const userResult = await this.databaseService.db.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [dto.email]
    );
    const user = userResult.rows[0] as { id: number; name: string; email: string; role: string } | undefined;

    if (!user) {
      throw new NotFoundException('البريد الإلكتروني غير مسجل في النظام');
    }

    // Invalidate previous active codes for this email
    await this.databaseService.db.query(
      'UPDATE password_resets SET used = 1 WHERE email = $1 AND used = 0',
      [dto.email]
    );

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await this.databaseService.db.query(`
        INSERT INTO password_resets (email, code, "expiresAt", used)
        VALUES ($1, $2, $3, 0)
      `,
      [dto.email, code, expiresAt]
    );

    console.log(`🔑 [Password Reset OTP] User: ${user.name} (${user.email}), Role: ${user.role}, Code: ${code}`);

    return {
      message: `تم إنشاء كود استعادة كلمة المرور وإرساله بنجاح إلى البريد الإلكتروني الخاص بـ ${user.name}`,
      userId: user.id,
      email: user.email,
      code: code,
      expiresIn: '15 دقيقة',
    };
  }

  // ── Verify Reset Code ──────────────────────────────────────────────
  async verifyResetCode(dto: VerifyResetCodeDto) {
    const recordResult = await this.databaseService.db.query(`
        SELECT id, email, code, "expiresAt", used
        FROM password_resets
        WHERE email = $1 AND code = $2 AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `, [dto.email, dto.code]);
    const record = recordResult.rows[0] as { id: number; email: string; code: string; expiresAt: string; used: number } | undefined;

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

    const userResult = await this.databaseService.db.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [dto.email]
    );
    const user = userResult.rows[0] as { id: number; name: string; email: string } | undefined;

    if (!user) {
      throw new NotFoundException('البريد الإلكتروني غير مسجل في النظام');
    }

    const recordResult = await this.databaseService.db.query(`
        SELECT id, email, code, "expiresAt", used
        FROM password_resets
        WHERE email = $1 AND code = $2 AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `, [dto.email, dto.code]);
    const record = recordResult.rows[0] as { id: number; email: string; code: string; expiresAt: string; used: number } | undefined;

    if (!record) {
      throw new BadRequestException('كود التحقق غير صحيح أو تم استخدامه بالفعل');
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('انتهت صلاحية كود التحقق. يرجى طلب كود جديد');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.databaseService.db.query(
      'UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Mark code as used
    await this.databaseService.db.query(
      'UPDATE password_resets SET used = 1 WHERE id = $1',
      [record.id]
    );

    return {
      message: 'تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة',
      userId: user.id,
    };
  }
}

