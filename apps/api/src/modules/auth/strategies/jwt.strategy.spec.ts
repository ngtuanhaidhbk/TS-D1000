import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { AuthSessionStatus } from '../enums/auth-session-status.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    get: jest.fn((_key: string, fallback?: string) => fallback),
  };

  const usersService = {
    findById: jest.fn(),
  };

  const authSessionRepository = {
    findById: jest.fn(),
    expire: jest.fn(),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configService as never,
      usersService as never,
      authSessionRepository as never,
    );
  });

  it('returns current auth context for valid active session and user', async () => {
    usersService.findById.mockReturnValue({
      id: 'user-admin-001',
      username: 'admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    authSessionRepository.findById.mockReturnValue({
      id: 'session-001',
      tokenJti: 'jti-001',
      status: AuthSessionStatus.ACTIVE,
      expiresAt: '2099-04-20T12:00:00.000Z',
    });

    const result = await strategy.validate({
      sub: 'user-admin-001',
      sid: 'session-001',
      jti: 'jti-001',
      role: UserRole.ADMIN,
    });

    expect(result).toEqual({
      id: 'user-admin-001',
      username: 'admin',
      role: UserRole.ADMIN,
      sessionId: 'session-001',
    });
  });

  it('throws USER_INACTIVE when user is inactive', async () => {
    usersService.findById.mockReturnValue({
      id: 'user-operator-001',
      username: 'operator1',
      role: UserRole.OPERATOR,
      status: UserStatus.INACTIVE,
    });

    await expect(
      strategy.validate({
        sub: 'user-operator-001',
        sid: 'session-001',
        jti: 'jti-001',
        role: UserRole.OPERATOR,
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'USER_INACTIVE',
      statusCode: 403,
    });
  });

  it('throws SESSION_REVOKED for revoked sessions', async () => {
    usersService.findById.mockReturnValue({
      id: 'user-admin-001',
      username: 'admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    authSessionRepository.findById.mockReturnValue({
      id: 'session-001',
      tokenJti: 'jti-001',
      status: AuthSessionStatus.REVOKED,
      expiresAt: '2099-04-20T12:00:00.000Z',
    });

    await expect(
      strategy.validate({
        sub: 'user-admin-001',
        sid: 'session-001',
        jti: 'jti-001',
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'SESSION_REVOKED',
      statusCode: 401,
    });
  });

  it('throws SESSION_EXPIRED and expires session when session is past expiry', async () => {
    usersService.findById.mockReturnValue({
      id: 'user-admin-001',
      username: 'admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    authSessionRepository.findById.mockReturnValue({
      id: 'session-001',
      tokenJti: 'jti-001',
      status: AuthSessionStatus.ACTIVE,
      expiresAt: '2000-04-20T12:00:00.000Z',
    });

    await expect(
      strategy.validate({
        sub: 'user-admin-001',
        sid: 'session-001',
        jti: 'jti-001',
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'SESSION_EXPIRED',
      statusCode: 401,
    });

    expect(authSessionRepository.expire).toHaveBeenCalledWith(
      'session-001',
      expect.any(String),
    );
  });
});
