import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
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
      .prepare('SELECT id, name, email, password, role FROM users WHERE email = ?')
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

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ── Get current user ───────────────────────────────────────────────
  async getMe(userId: number): Promise<UserProfile> {
    const user = this.databaseService.db
      .prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?')
      .get(userId) as unknown as UserProfile | undefined;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
