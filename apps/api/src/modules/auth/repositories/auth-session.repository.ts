import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../../common/base/base.repository';
import { AuthSessionEntity } from '../entities/auth-session.entity';
import { AuthSessionStatus } from '../enums/auth-session-status.enum';

@Injectable()
export class AuthSessionRepository extends BaseRepository<AuthSessionEntity> {
  revoke(sessionId: string, revokedAt: string, revokedReason: string): AuthSessionEntity | null {
    const session = this.findById(sessionId);
    if (!session) {
      return null;
    }

    session.status = AuthSessionStatus.REVOKED;
    session.revokedAt = revokedAt;
    session.revokedReason = revokedReason;
    session.updatedAt = revokedAt;
    this.save(session);
    return session;
  }

  expire(sessionId: string, expiredAt: string): AuthSessionEntity | null {
    const session = this.findById(sessionId);
    if (!session) {
      return null;
    }

    session.status = AuthSessionStatus.EXPIRED;
    session.updatedAt = expiredAt;
    this.save(session);
    return session;
  }

  updateLastSeen(sessionId: string, lastSeenAt: string): AuthSessionEntity | null {
    const session = this.findById(sessionId);
    if (!session) {
      return null;
    }

    session.lastSeenAt = lastSeenAt;
    session.updatedAt = lastSeenAt;
    this.save(session);
    return session;
  }

  findByTokenJti(tokenJti: string): AuthSessionEntity | null {
    return this.list().find((session) => session.tokenJti === tokenJti) ?? null;
  }

  expireActiveSessions(now: string): AuthSessionEntity[] {
    const expiredSessions = this.list().filter(
      (session) =>
        session.status === AuthSessionStatus.ACTIVE &&
        new Date(session.expiresAt).getTime() <= new Date(now).getTime(),
    );

    expiredSessions.forEach((session) => {
      session.status = AuthSessionStatus.EXPIRED;
      session.updatedAt = now;
      this.save(session);
    });

    return expiredSessions;
  }
}
