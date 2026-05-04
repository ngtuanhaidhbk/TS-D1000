import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { SnapshotResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveSnapshotService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getSnapshot(roomId: string): Promise<SnapshotResponse> {
    const runtimeState = this.repository.getRuntimeRoomState(roomId);
    const units = this.repository.getActiveUnits(roomId);
    const cameraStates = this.repository.getCameraRuntimeStates(roomId);
    const alerts = this.repository.getActiveAlerts(roomId);

    return {
      roomId,
      operationMode: runtimeState.operationMode,
      sseStatus: runtimeState.sseStatus,
      lastEventAt: runtimeState.updatedAt ?? null,
      roomState: {
        operationMode: runtimeState.operationMode,
        sseStatus: runtimeState.sseStatus,
      },
      units: units.map((u) => ({
        unitId: u.id,
        unitName: u.unitName,
        deviceType: u.deviceType,
        state: u.runtimeState,
        lastEventAt: u.lastEventAt,
      })),
      cameras: cameraStates.map((cs) => ({
        cameraId: cs.camera.id,
        cameraName: cs.camera.name,
        status: cs.camera.status,
        currentTarget: cs.state.currentTargetUnitId
          ? { unitId: cs.state.currentTargetUnitId, presetId: cs.state.currentPresetId }
          : null,
      })),
      alerts: alerts.map((alert) => ({
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
