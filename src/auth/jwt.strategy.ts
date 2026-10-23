import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  sid?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          if (req?.query?.token && typeof req.query.token === 'string') {
            return req.query.token;
          }
          const auth = req?.headers?.authorization;
          if (!auth) return null;
          if (typeof auth === 'string') {
            if (auth.startsWith('Bearer ')) {
              return auth.substring(7).trim();
            }
            return auth.trim();
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'qa_suite_super_secret_key_2025_mcit',
    });
  }

  async validate(payload: JwtPayload) {
    const userResult = await this.databaseService.db.query(
      'SELECT id, name, email, role, "minTokenIat" FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = userResult.rows[0] as
      | { id: number; name: string; email: string; role: string; minTokenIat?: string | number }
      | undefined;

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const minIat = Number(user.minTokenIat || 0);
    if (minIat > 0 && (!payload.iat || payload.iat < minIat)) {
      throw new UnauthorizedException('Session has been logged out remotely');
    }

    if (payload.sid) {
      const sessionRes = await this.databaseService.db.query(
        'SELECT "isActive" FROM user_login_sessions WHERE "sessionId" = $1',
        [payload.sid]
      );
      if (sessionRes.rows.length > 0 && !sessionRes.rows[0].isActive) {
        throw new UnauthorizedException('This device session was revoked');
      }
      this.databaseService.db
        .query('UPDATE user_login_sessions SET "lastSeenAt" = NOW() WHERE "sessionId" = $1', [payload.sid])
        .catch(() => {});
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sid: payload.sid,
    };
  }
}
