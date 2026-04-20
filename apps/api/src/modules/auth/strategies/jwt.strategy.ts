import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppException } from '../../../common/exceptions/app.exception';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { UsersService } from '../../users/services/users.service';
import { AuthSessionStatus } from '../enums/auth-session-status.enum';
import { AuthSessionRepository } from '../repositories/auth-session.repository';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authSessionRepository: AuthSessionRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-me-for-development'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUser & { sessionId: string }> {
    const user = this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException('USER_INACTIVE', 'User account is inactive', 403);
    }

    const session = this.authSessionRepository.findById(payload.sid);
    if (!session) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (session.tokenJti !== payload.jti) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (session.status === AuthSessionStatus.REVOKED) {
      throw new AppException('SESSION_REVOKED', 'Session revoked', 401);
    }

    if (
      session.status === AuthSessionStatus.EXPIRED ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      this.authSessionRepository.expire(session.id, new Date().toISOString());
      throw new AppException('SESSION_EXPIRED', 'Session expired', 401);
    }

    if (session.status !== AuthSessionStatus.ACTIVE) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      sessionId: session.id,
    };
  }
}
