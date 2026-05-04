import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { RuntimeStatusResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveRuntimeStatusService {
  private readonly STALE_THRESHOLD_SECONDS = 10;

  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getStatus(roomId: string): Promise<RuntimeStatusResponse> {
    const runtimeState = this.repository.getRuntimeRoomState(roomId);

    const isConnected = runtimeState?.sseStatus === 'CONNECTED';
    const isDataStale = this.isDataStale(runtimeState?.updatedAt);

    return {
      roomId,
      sseStatus: runtimeState?.sseStatus || 'DISCONNECTED',
      isConnected,
      isDataStale,
      lastEventAt: runtimeState?.updatedAt || null,
      staleThresholdSeconds: this.STALE_THRESHOLD_SECONDS,
    };
  }

  private isDataStale(lastEventAt: string | null | undefined): boolean {
    if (!lastEventAt) return true;

    const last = new Date(lastEventAt);
    const now = new Date();
    const diffSeconds = (now.getTime() - last.getTime()) / 1000;
    return diffSeconds > this.STALE_THRESHOLD_SECONDS;
  }
}
