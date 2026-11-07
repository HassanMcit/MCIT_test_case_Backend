import * as bcrypt from 'bcryptjs';
import { validateSync } from 'class-validator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { getJwtSecret } from './jwt-secret';
import { extractAuthorizationHeaderJwt } from './jwt.strategy';

const previousEnv = {
  NODE_ENV: process.env.NODE_ENV,
  MCIT_DEPLOYMENT_ENV: process.env.MCIT_DEPLOYMENT_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
};

describe('auth security suite', () => {
  afterEach(() => {
    for (const key of Object.keys(previousEnv) as (keyof typeof previousEnv)[]) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  function emailErrors(dto: object, email: string) {
    const value = Object.assign(dto, { email });
    return validateSync(value).filter((error) => error.property === 'email');
  }

  describe('account email policy', () => {
  it('allows synthetic and official addresses in explicit staging even with NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MCIT_DEPLOYMENT_ENV = 'staging';

    expect(emailErrors(new LoginDto(), 'admin@synthetic.local')).toHaveLength(0);
    expect(emailErrors(new LoginDto(), 'admin@mcit.gov.eg')).toHaveLength(0);
    expect(emailErrors(new ForgotPasswordDto(), 'admin@synthetic.local')).toHaveLength(0);
    expect(emailErrors(new VerifyResetCodeDto(), 'admin@synthetic.local')).toHaveLength(0);
    expect(emailErrors(new ResetPasswordDto(), 'admin@synthetic.local')).toHaveLength(0);
    expect(emailErrors(new CreateUserDto(), 'admin@synthetic.local')).toHaveLength(0);
  });

  it('rejects synthetic addresses in production while accepting official addresses', () => {
    process.env.NODE_ENV = 'production';
    process.env.MCIT_DEPLOYMENT_ENV = 'production';

    expect(emailErrors(new LoginDto(), 'admin@synthetic.local')).not.toHaveLength(0);
    expect(emailErrors(new ResetPasswordDto(), 'admin@synthetic.local')).not.toHaveLength(0);
    expect(emailErrors(new ForgotPasswordDto(), 'admin@mcit.gov.eg')).toHaveLength(0);
    expect(emailErrors(new VerifyResetCodeDto(), 'admin@mcit.gov.eg')).toHaveLength(0);
    expect(emailErrors(new ResetPasswordDto(), 'admin@mcit.gov.eg')).toHaveLength(0);
  });

  it('fails closed if production is missing the deployment marker', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MCIT_DEPLOYMENT_ENV;
    expect(emailErrors(new LoginDto(), 'admin@synthetic.local')).not.toHaveLength(0);
    expect(emailErrors(new LoginDto(), 'admin@mcit.gov.eg')).toHaveLength(0);
  });
});

describe('JWT secret configuration', () => {
  it('requires an explicit secret when NODE_ENV is production, including staging', () => {
    process.env.NODE_ENV = 'production';
    process.env.MCIT_DEPLOYMENT_ENV = 'staging';
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET must be explicitly configured/);
  });

  it('uses the configured secret without a fallback', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'isolated-test-signing-secret';
    expect(getJwtSecret()).toBe('isolated-test-signing-secret');
  });
});

describe('JWT transport', () => {
  it('accepts bearer authorization and ignores tokens in query strings', () => {
    expect(extractAuthorizationHeaderJwt({ headers: { authorization: 'Bearer header-token' } } as any))
      .toBe('header-token');
    expect(extractAuthorizationHeaderJwt({ headers: {}, query: { token: 'query-token' } } as any))
      .toBeNull();
  });
});

describe('authentication and password recovery', () => {
  it('keeps password verification required for staging synthetic logins', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MCIT_DEPLOYMENT_ENV = 'staging';
    const passwordHash = await bcrypt.hash('correct-staging-password', 4);
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: 101, name: 'Synthetic Admin', email: 'admin@synthetic.local', password: passwordHash, role: 'admin' }],
    });
    const service = new AuthService(
      { db: { query }, resolvePhotoUrl: vi.fn() } as any,
      { sign: vi.fn() } as any,
    );

    await expect(
      service.login({ email: 'admin@synthetic.local', password: 'wrong-staging-password' } as LoginDto),
    ).rejects.toMatchObject({ status: 401 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not create, log, or return a reset code until secure email delivery exists', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MCIT_DEPLOYMENT_ENV = 'staging';
    const query = vi.fn();
    const service = new AuthService({ db: { query } } as any, {} as any);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(service.forgotPassword({ email: 'admin@synthetic.local' } as ForgotPasswordDto))
      .rejects.toMatchObject({ status: 503 });
    expect(query).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('resets a password only after a valid reset code and returns no code', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MCIT_DEPLOYMENT_ENV = 'staging';
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 101, name: 'Synthetic Admin', email: 'admin@synthetic.local' }] })
      .mockResolvedValueOnce({ rows: [{ id: 9, email: 'admin@synthetic.local', code: '123456', expiresAt: new Date(Date.now() + 60_000).toISOString(), used: 0 }] })
      .mockResolvedValue({ rows: [] });
    const service = new AuthService({ db: { query } } as any, {} as any);
    const result = await service.resetPassword({
      email: 'admin@synthetic.local',
      code: '123456',
      newPassword: 'new-staging-password',
      confirmPassword: 'new-staging-password',
    } as ResetPasswordDto);

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[2][0]).toContain('UPDATE users SET password');
    expect(query.mock.calls[2][1][0]).not.toBe('new-staging-password');
    expect(result).not.toHaveProperty('code');
    expect(result).not.toHaveProperty('email');
  });
});
});
