import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
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
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = userResult.rows[0] as { id: number; name: string; email: string; role: string } | undefined;

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }
}
