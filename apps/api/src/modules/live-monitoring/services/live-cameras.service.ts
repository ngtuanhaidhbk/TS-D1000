import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { CameraStatusResponse, CameraTargetResponse, CameraTriggerResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveCamerasService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getCameraStatuses(roomId: string): Promise<CameraStatusResponse[]> {
    const cameraStates = this.repository.getCameraRuntimeStates(roomId);

    return cameraStates.map((cs) => ({
      cameraId: cs.camera.id,
      cameraName: cs.camera.name,
      status: this.repository.toCameraStatus(cs.camera.status),
      lastTestAt: cs.camera.lastTestAt ?? null,
      lastTestResult: cs.camera.lastTestResult ?? null,
    }));
  }

  async getCameraTargets(roomId: string): Promise<CameraTargetResponse> {
    const cameraStates = this.repository.getCameraRuntimeStates(roomId);

    const currentTargets = cameraStates
      .filter((cs) => cs.state.currentTargetUnitId && cs.state.currentPresetId)
      .map((cs) => ({
        cameraId: cs.camera.id,
        cameraName: cs.camera.name,
        currentTarget: {
          unitId: cs.state.currentTargetUnitId!,
          unitName: cs.unit?.unitName || cs.state.currentTargetUnitId!,
          presetId: cs.state.currentPresetId!,
          presetName: cs.preset?.presetName || null,
        },
      }));

    return { currentTargets };
  }

  async getCameraTriggers(
    cameraId: string | undefined,
    limit: number = 20,
  ): Promise<CameraTriggerResponse[]> {
    const logs = cameraId ? this.repository.getCameraRuntimeLogs(cameraId, limit) : [];

    return logs.map((log) => ({
      triggerId: log.id,
      cameraId: log.cameraId,
      cameraName: log.cameraName,
      action: log.actionType,
      result: log.result,
      reason: log.reason,
      executedAt: log.triggeredAt,
    }));
  }
}
