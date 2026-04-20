import { Injectable, Logger } from '@nestjs/common';

import { AuthSessionRepository } from '../repositories/auth-session.repository';

@Injectable()
export class AuthSessionCleanupService {
  private readonly logger = new Logger(AuthSessionCleanupService.name);

  constructor(private readonly authSessionRepository: AuthSessionRepository) {}

  expireActiveSessions(now: string): number {
    const expiredSessions = this.authSessionRepository.expireActiveSessions(now);

    if (expiredSessions.length > 0) {
      this.logger.log(`Expired ${expiredSessions.length} authentication session(s).`);
    }

    return expiredSessions.length;
  }
}
