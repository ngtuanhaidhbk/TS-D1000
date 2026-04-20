import * as bcrypt from 'bcryptjs';

import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { AuthSessionStatus } from '../enums/auth-session-status.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const activeAdmin = {
    id: 'user-admin-001',
    username: 'admin',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: '2026-04-20T08:00:00.000Z',
    updatedAt: '2026-04-20T08:00:00.000Z',
  };

  const inactiveUser = {
    ...activeAdmin,
    id: 'user-inactive-001',
    username: 'disabled',
    status: UserStatus.INACTIVE,
    role: UserRole.OPERATOR,
  };

  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'ACCESS_TOKEN_TTL_MINUTES') {
        return '60';
      }
      return fallback;
    }),
  };

  const usersService = {
    findByUsername: jest.fn(),
    findById: jest.fn(),
  };

  const authSessionRepository = {
    save: jest.fn((value) => value),
    findById: jest.fn(),
    revoke: jest.fn(),
    expire: jest.fn(),
    updateLastSeen: jest.fn(),
    deleteById: jest.fn(),
  };

  const passwordService = {
    compare: jest.fn(),
  };

  const tokenService = {
    sign: jest.fn(),
    getExpiresAt: jest.fn(() => '2026-04-20T12:00:00.000Z'),
  };

  const authAuditService = {
    logLoginSuccess: jest.fn(),
    logLoginFailure: jest.fn(),
    logLogoutSuccess: jest.fn(),
  };

  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(
      configService as never,
      usersService as never,
      authSessionRepository as never,
      passwordService as never,
      tokenService as never,
      authAuditService as never,
    );
  });

  it('returns token, expiry and user info for valid login', async () => {
    usersService.findByUsername.mockReturnValue(activeAdmin);
    passwordService.compare.mockResolvedValue(true);
    tokenService.sign.mockResolvedValue('jwt-token');

    const result = await authService.login({
      username: '  admin  ',
      password: 'Admin123!',
    });

    expect(usersService.findByUsername).toHaveBeenCalledWith('admin');
    expect(result).toEqual({
      token: 'jwt-token',
      expiresAt: '2026-04-20T12:00:00.000Z',
      user: {
        id: activeAdmin.id,
        username: activeAdmin.username,
        role: activeAdmin.role,
        status: activeAdmin.status,
      },
    });
    expect(authSessionRepository.save).toHaveBeenCalledTimes(1);
    expect(tokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: activeAdmin.id,
        sid: expect.any(String),
        jti: expect.any(String),
        role: activeAdmin.role,
      }),
    );
    expect(authAuditService.logLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it('throws INVALID_CREDENTIALS for unknown user', async () => {
    usersService.findByUsername.mockReturnValue(null);

    await expect(
      authService.login({
        username: 'missing',
        password: 'bad-password',
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });

    expect(authAuditService.logLoginFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'missing',
        reason: 'INVALID_CREDENTIALS',
      }),
    );
  });

  it('throws USER_INACTIVE for inactive user', async () => {
    usersService.findByUsername.mockReturnValue(inactiveUser);

    await expect(
      authService.login({
        username: 'disabled',
        password: 'Any123!',
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'USER_INACTIVE',
      statusCode: 403,
    });
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    usersService.findByUsername.mockReturnValue(activeAdmin);
    passwordService.compare.mockResolvedValue(false);

    await expect(
      authService.login({
        username: 'admin',
        password: 'Wrong123!',
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
  });

  it('cleans up session and throws INTERNAL_ERROR when token signing fails', async () => {
    usersService.findByUsername.mockReturnValue(activeAdmin);
    passwordService.compare.mockResolvedValue(true);
    tokenService.sign.mockRejectedValue(new Error('sign failure'));

    await expect(
      authService.login({
        username: 'admin',
        password: 'Admin123!',
      }),
    ).rejects.toMatchObject<AppException>({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });

    expect(authSessionRepository.save).toHaveBeenCalledTimes(1);
    expect(authSessionRepository.deleteById).toHaveBeenCalledTimes(1);
  });

  it('returns current user and session from me()', async () => {
    usersService.findById.mockReturnValue(activeAdmin);
    authSessionRepository.findById.mockReturnValue({
      id: 'session-001',
      userId: activeAdmin.id,
      tokenJti: 'jti-001',
      status: AuthSessionStatus.ACTIVE,
      issuedAt: '2026-04-20T08:00:00.000Z',
      expiresAt: '2099-04-20T12:00:00.000Z',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T08:00:00.000Z',
    });

    const result = await authService.me({
      id: activeAdmin.id,
      username: activeAdmin.username,
      role: activeAdmin.role,
      sessionId: 'session-001',
    });

    expect(result).toEqual({
      user: {
        id: activeAdmin.id,
        username: activeAdmin.username,
        role: activeAdmin.role,
        status: activeAdmin.status,
      },
      session: {
        id: 'session-001',
        expiresAt: '2099-04-20T12:00:00.000Z',
      },
    });
    expect(authSessionRepository.updateLastSeen).toHaveBeenCalledWith(
      'session-001',
      expect.any(String),
    );
  });

  it('revokes active session on logout', async () => {
    authSessionRepository.findById.mockReturnValue({
      id: 'session-001',
      userId: activeAdmin.id,
      tokenJti: 'jti-001',
      status: AuthSessionStatus.ACTIVE,
      issuedAt: '2026-04-20T08:00:00.000Z',
      expiresAt: '2099-04-20T12:00:00.000Z',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T08:00:00.000Z',
    });

    const result = await authService.logout(
      {
        id: activeAdmin.id,
        username: activeAdmin.username,
        role: activeAdmin.role,
      },
      'session-001',
    );

    expect(result).toEqual({
      message: 'Logged out',
    });
    expect(authSessionRepository.revoke).toHaveBeenCalledWith(
      'session-001',
      expect.any(String),
      'USER_LOGOUT',
    );
    expect(authAuditService.logLogoutSuccess).toHaveBeenCalledTimes(1);
  });

  it('throws SESSION_REVOKED when logging out an already revoked session', async () => {
    authSessionRepository.findById.mockReturnValue({
      id: 'session-001',
      userId: activeAdmin.id,
      tokenJti: 'jti-001',
      status: AuthSessionStatus.REVOKED,
      issuedAt: '2026-04-20T08:00:00.000Z',
      expiresAt: '2099-04-20T12:00:00.000Z',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T09:00:00.000Z',
    });

    await expect(
      authService.logout(
        {
          id: activeAdmin.id,
          username: activeAdmin.username,
          role: activeAdmin.role,
        },
        'session-001',
      ),
    ).rejects.toMatchObject<AppException>({
      code: 'SESSION_REVOKED',
      statusCode: 401,
    });
  });
});
