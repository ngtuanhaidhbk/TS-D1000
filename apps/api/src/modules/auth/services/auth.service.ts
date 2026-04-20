import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BaseService } from '../../../common/base/base.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { UsersService } from '../../users/services/users.service';
import { AuthSessionRepository } from '../repositories/auth-session.repository';
import type { LoginRequestDto } from '../dto/login.request.dto';
import { AuthSessionStatus } from '../enums/auth-session-status.enum';
import type { LoginResponseDto } from '../dto/login.response.dto';
import { AuthAuditService } from './auth-audit.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService extends BaseService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly authAuditService: AuthAuditService,
  ) {
    super();
  }

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const normalizedUsername = dto.username.trim();
    const user = this.usersService.findByUsername(normalizedUsername);

    if (!user) {
      this.writeLoginFailureAudit(normalizedUsername, 'INVALID_CREDENTIALS');
      throw new AppException('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.writeLoginFailureAudit(normalizedUsername, 'USER_INACTIVE', user.id);
      throw new AppException('USER_INACTIVE', 'User account is inactive', 403);
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      this.writeLoginFailureAudit(normalizedUsername, 'INVALID_CREDENTIALS', user.id);
      throw new AppException('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }

    const issuedAt = this.getCurrentTimestamp();
    const tokenJti = randomUUID();
    const sessionId = randomUUID();
    const expiresAt = this.tokenService.getExpiresAt(this.getAccessTokenTtlSeconds());

    this.authSessionRepository.save({
      id: sessionId,
      userId: user.id,
      tokenJti,
      status: AuthSessionStatus.ACTIVE,
      issuedAt,
      expiresAt,
      clientType: 'DESKTOP_APP',
      createdAt: issuedAt,
      updatedAt: issuedAt,
    });

    let token: string;
    try {
      token = await this.tokenService.sign({
        sub: user.id,
        sid: sessionId,
        jti: tokenJti,
        role: user.role,
      });
    } catch {
      this.authSessionRepository.deleteById(sessionId);
      throw new AppException('INTERNAL_ERROR', 'Unexpected server error', 500);
    }

    this.safeAudit(() =>
      this.authAuditService.logLoginSuccess({
        actorUserId: user.id,
        sessionId,
        username: user.username,
      }),
    );

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  }

  async me(currentUser: CurrentUser & { sessionId: string }) {
    const user = this.usersService.findById(currentUser.id);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException('USER_INACTIVE', 'User account is inactive', 403);
    }

    const session = this.authSessionRepository.findById(currentUser.sessionId);
    if (!session) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    this.assertActiveSession(session);
    this.authSessionRepository.updateLastSeen(session.id, this.getCurrentTimestamp());

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    };
  }

  async logout(currentUser: CurrentUser, sessionId: string) {
    const session = this.authSessionRepository.findById(sessionId);
    if (!session || session.userId !== currentUser.id) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    this.assertActiveSession(session);

    this.authSessionRepository.revoke(sessionId, this.getCurrentTimestamp(), 'USER_LOGOUT');

    this.safeAudit(() =>
      this.authAuditService.logLogoutSuccess({
        actorUserId: currentUser.id,
        sessionId,
      }),
    );

    return {
      message: 'Logged out',
    };
  }

  private assertActiveSession(session: {
    id: string;
    status: AuthSessionStatus;
    expiresAt: string;
  }): void {
    if (session.status === AuthSessionStatus.REVOKED) {
      throw new AppException('SESSION_REVOKED', 'Session revoked', 401);
    }

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();

    if (session.status === AuthSessionStatus.EXPIRED || expiresAt <= now) {
      this.authSessionRepository.expire(session.id, this.getCurrentTimestamp());
      throw new AppException('SESSION_EXPIRED', 'Session expired', 401);
    }

    if (session.status !== AuthSessionStatus.ACTIVE) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }
  }

  private getAccessTokenTtlSeconds(): number {
    const rawValue = this.configService.get<string>('ACCESS_TOKEN_TTL_MINUTES', '480');
    const ttlMinutes = Number.parseInt(rawValue, 10);

    if (Number.isNaN(ttlMinutes) || ttlMinutes <= 0) {
      return 480 * 60;
    }

    return ttlMinutes * 60;
  }

  private writeLoginFailureAudit(
    username: string,
    reason: 'INVALID_CREDENTIALS' | 'USER_INACTIVE',
    actorUserId?: string,
  ): void {
    this.safeAudit(() =>
      this.authAuditService.logLoginFailure({
        username,
        reason,
        actorUserId,
      }),
    );
  }

  private safeAudit(callback: () => void): void {
    try {
      callback();
    } catch {
      // Audit is best-effort for this foundation layer.
    }
  }
}
