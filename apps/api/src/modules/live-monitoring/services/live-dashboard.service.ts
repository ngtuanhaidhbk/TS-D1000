import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { DashboardResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveDashboardService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getDashboard(roomId: string): Promise<DashboardResponse> {
    const runtimeState = this.repository.getRuntimeRoomState(roomId);
    const speakingUnits = this.repository.getSpeakingUnits(roomId);
    const pendingRequests = this.repository.getPendingRequests(roomId);
    const alerts = this.repository.getActiveAlerts(roomId);
    const cameraStates = this.repository.getCameraRuntimeStates(roomId);

    const target = runtimeState.currentCameraTarget;
    let currentCameraTarget: DashboardResponse['currentCameraTarget'] = null;
    if (target) {
      const matched = cameraStates.find((entry) => entry.camera.id === target.cameraId) ?? null;
      currentCameraTarget = {
        cameraId: target.cameraId,
        cameraName: matched?.camera.name ?? target.cameraId,
        unitId: target.unitId,
        unitName: matched?.unit?.unitName ?? target.unitId,
        presetId: target.presetId,
        presetName: matched?.preset?.presetName ?? target.presetId,
      };
    }

    return {
      roomId,
      operationMode: runtimeState.operationMode,
      sseStatus: runtimeState.sseStatus,
      lastEventAt: runtimeState.updatedAt ?? null,
      activeSpeakerCount: speakingUnits.length,
      pendingRequestCount: pendingRequests.length,
      currentCameraTarget,
      activeAlerts: alerts.map((alert) => ({
        id: alert.id,
        severity: alert.severity,
        source: alert.source,
        message: alert.message,
        status: alert.status,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        createdAt: alert.createdAt,
      })),
    };
  }
}
