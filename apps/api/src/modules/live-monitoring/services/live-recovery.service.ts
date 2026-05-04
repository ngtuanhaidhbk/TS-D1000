import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { RecoveryResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveRecoveryService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async runRecovery(
    roomId: string,
    action: 'RECONNECT' | 'RECOVER_STATE' | 'REFRESH_SNAPSHOT',
    userId: string,
  ): Promise<RecoveryResponse> {
    let result: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'TIMEOUT' = 'SUCCESS';
    let message: string | undefined;

    if (action === 'RECONNECT') {
      // Demo behavior: mark reconnecting then connected.
      this.repository.markRuntimeConnection(roomId, 'RECONNECTING');
      this.repository.markRuntimeConnection(roomId, 'CONNECTED');
      message = 'Runtime reconnection successful';
    } else if (action === 'RECOVER_STATE') {
      // Demo behavior: no-op recovery, keep snapshot source-of-truth tables.
      message = 'Runtime state recovery completed';
    } else if (action === 'REFRESH_SNAPSHOT') {
      message = 'Runtime snapshot refreshed';
    } else {
      result = 'FAILED';
      message = 'Invalid recovery action';
    }

    const log = this.repository.createRecoveryLog(roomId, action, result, userId, message);

    return {
      recoveryId: log.id,
      action,
      result,
      message,
      executedAt: log.executedAt,
    };
  }
}
