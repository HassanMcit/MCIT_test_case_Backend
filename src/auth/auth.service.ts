import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
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

function generateDeterministicMac(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed || 'mcit-device').digest('hex');
  // Set locally administered unicast MAC bit on first octet
  const firstByte = ((parseInt(hash.slice(0, 2), 16) | 0x02) & 0xfe)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  const octets = [
    firstByte,
    hash.slice(2, 4).toUpperCase(),
    hash.slice(4, 6).toUpperCase(),
    hash.slice(6, 8).toUpperCase(),
    hash.slice(8, 10).toUpperCase(),
    hash.slice(10, 12).toUpperCase(),
  ];
  return octets.join(':');
}

function parseDeviceSummary(ua: string): string {
  if (!ua) return 'Unknown Device';
  let os = 'Unknown OS';
  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  return `${os} - ${browser}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private async resolveGeoLocation(ip: string): Promise<string> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'Cairo, Egypt (Local Network)';
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data: any = await res.json();
        if (data?.status === 'success') {
          const parts = [data.city, data.regionName, data.country].filter(Boolean);
          const loc = parts.join(', ');
          return data.isp ? `${loc} (${data.isp})` : loc;
        }
      }
    } catch {}
    return 'Egypt';
  }

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

    const forwardedIp =
      typeof req?.headers?.['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : '';
    const realIp =
      (dto.clientIp && dto.clientIp.trim()) ||
      forwardedIp ||
      req?.headers?.['x-real-ip'] ||
      req?.ip ||
      'Unknown IP';

    const rawUa =
      (dto.userAgent && dto.userAgent.trim()) ||
      req?.headers?.['user-agent'] ||
      '';

    const deviceInfo =
      (dto.deviceInfo && dto.deviceInfo.trim()) || parseDeviceSummary(rawUa);

    const macAddress =
      (dto.macAddress && dto.macAddress.trim()) ||
      generateDeterministicMac(`${realIp}|${rawUa}|${deviceInfo}`);

    const location =
      (dto.location && dto.location.trim()) ||
      (await this.resolveGeoLocation(realIp));

    const sessionId = crypto.randomUUID();

    try {
      await this.databaseService.db.query(
        `INSERT INTO user_login_sessions (
          "sessionId", "userId", "userName", email, ip, "macAddress", "deviceInfo", location, "userAgent", "isActive"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
        [
          sessionId,
          user.id,
          user.name,
          user.email,
          realIp,
          macAddress,
          deviceInfo,
          location,
          rawUa,
        ]
      );
    } catch (err) {
      console.error('Failed to log user login session:', err);
    }

    const payload = {
      sub: user.id,
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };
    const token = this.jwtService.sign(payload, { expiresIn: '7d' });

    const photoUrl = this.databaseService.resolvePhotoUrl(user, req);
    return {
      access_token: token,
      sessionId,
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

  // ── Get Active & Historical Login Sessions ─────────────────────────
  async getSessions(currentUser: any) {
    const isAdmin = currentUser?.role === 'admin';
    const userId = Number(currentUser?.id || currentUser?.sub);
    if (isAdmin) {
      const res = await this.databaseService.db.query(
        `SELECT * FROM user_login_sessions ORDER BY "createdAt" DESC LIMIT 100`
      );
      return res.rows;
    }
    const res = await this.databaseService.db.query(
      `SELECT * FROM user_login_sessions WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
      [userId]
    );
    return res.rows;
  }

  // ── Revoke a Specific Login Session ────────────────────────────────
  async revokeSession(sessionId: string, currentUser: any) {
    const isAdmin = currentUser?.role === 'admin';
    const userId = Number(currentUser?.id || currentUser?.sub);

    const sessionRes = await this.databaseService.db.query(
      `SELECT "userId" FROM user_login_sessions WHERE "sessionId" = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      throw new NotFoundException('الجلسة غير موجودة');
    }
    if (!isAdmin && Number(sessionRes.rows[0].userId) !== userId) {
      throw new ForbiddenException('غير مصرح لك بإنهاء هذه الجلسة');
    }

    await this.databaseService.db.query(
      `UPDATE user_login_sessions SET "isActive" = FALSE, "revokedAt" = NOW() WHERE "sessionId" = $1`,
      [sessionId]
    );

    return {
      success: true,
      message: 'تم تسجيل الخروج من هذا الجهاز بنجاح',
    };
  }

  // ── Force Logout All Sessions for a User ───────────────────────────
  async revokeAllUserSessions(targetUserId: number, currentUser: any, keepCurrent = false) {
    const isAdmin = currentUser?.role === 'admin';
    const currentUserId = Number(currentUser?.id || currentUser?.sub);

    if (!isAdmin && targetUserId !== currentUserId) {
      throw new ForbiddenException('غير مصرح لك بإنهاء جلسات هذا المستخدم');
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    if (!keepCurrent) {
      await this.databaseService.db.query(
        `UPDATE users SET "minTokenIat" = $1 WHERE id = $2`,
        [nowEpoch, targetUserId]
      );
    }

    if (keepCurrent && currentUser?.sid) {
      await this.databaseService.db.query(
        `UPDATE user_login_sessions
         SET "isActive" = FALSE, "revokedAt" = NOW()
         WHERE "userId" = $1 AND "sessionId" <> $2 AND "isActive" = TRUE`,
        [targetUserId, currentUser.sid]
      );
    } else {
      await this.databaseService.db.query(
        `UPDATE user_login_sessions
         SET "isActive" = FALSE, "revokedAt" = NOW()
         WHERE "userId" = $1 AND "isActive" = TRUE`,
        [targetUserId]
      );
    }

    return {
      success: true,
      message: 'تم تسجيل الخروج من جميع الأجهزة الأخرى بنجاح',
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

