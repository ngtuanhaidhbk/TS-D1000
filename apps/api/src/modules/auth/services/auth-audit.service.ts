import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  logLoginSuccess(input: { actorUserId: string; sessionId: string; username: string }): void {
    this.logger.log(
      JSON.stringify({
        action: 'LOGIN',
        result: 'SUCCESS',
        targetType: 'AUTH_SESSION',
        targetId: input.sessionId,
        actorUserId: input.actorUserId,
        detailJson: {
          username: input.username,
        },
      }),
    );
  }

  logLoginFailure(input: { username: string; reason: string; actorUserId?: string | null }): void {
    this.logger.warn(
      JSON.stringify({
        action: 'LOGIN',
        result: 'FAILED',
        targetType: 'USER',
        targetId: input.actorUserId ?? null,
        actorUserId: input.actorUserId ?? null,
        detailJson: {
          username: input.username,
          reason: input.reason,
        },
      }),
    );
  }

  logLogoutSuccess(input: { actorUserId: string; sessionId: string }): void {
    this.logger.log(
      JSON.stringify({
        action: 'LOGOUT',
        result: 'SUCCESS',
        targetType: 'AUTH_SESSION',
        targetId: input.sessionId,
        actorUserId: input.actorUserId,
        detailJson: {
          reason: 'USER_LOGOUT',
        },
      }),
    );
  }
}
