import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SystemConfigAuditService {
  private readonly logger = new Logger(SystemConfigAuditService.name);

  record(action: string, actorUserId: string, targetType: string, targetId: string, detailJson?: unknown) {
    this.logger.log(
      JSON.stringify({
        actorUserId,
        action,
        targetType,
        targetId,
        result: 'SUCCESS',
        detailJson: detailJson ?? null,
      }),
    );
  }

  recordFailure(action: string, actorUserId: string, targetType: string, targetId: string, detailJson?: unknown) {
    this.logger.warn(
      JSON.stringify({
        actorUserId,
        action,
        targetType,
        targetId,
        result: 'FAILED',
        detailJson: detailJson ?? null,
      }),
    );
  }
}
