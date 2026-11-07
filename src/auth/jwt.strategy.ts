import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';
import { getJwtSecret } from './jwt-secret';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  sid?: string;
  iat?: number;
}

export const extractAuthorizationHeaderJwt = ExtractJwt.fromAuthHeaderAsBearerToken();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: extractAuthorizationHeaderJwt,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
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
