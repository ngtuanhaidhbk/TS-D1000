import { Injectable } from '@nestjs/common';

import { CameraStatus } from '../../system-config/entities/system-config.entities';
import {
  CameraPresetsRepository,
  CamerasRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
} from '../../system-config/repositories/system-config.repositories';
import { CameraIntegrationService } from '../../system-config/services/camera-integration.service';
import { nowIso } from '../../system-config/services/system-config-utils';
import { RuntimeRoomStateRepository } from '../repositories/runtime.repositories';
import {
  CameraActionType,
  CameraTriggerResult,
  type CameraTarget,
} from '../entities/runtime.entities';
import { RuntimeCameraLogsRepository, RuntimeCameraStateRepository } from '../repositories/runtime-camera.repositories';

@Injectable()
export class RuntimeCameraTriggerService {
  // Technical policy default; can be made configurable later.
  private readonly antiJitterMs = 1500;

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly mappingsRepository: MicCameraMappingsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly presetsRepository: CameraPresetsRepository,
    private readonly integrationService: CameraIntegrationService,
    private readonly roomStateRepository: RuntimeRoomStateRepository,
    private readonly cameraStateRepository: RuntimeCameraStateRepository,
    private readonly cameraLogsRepository: RuntimeCameraLogsRepository,
  ) {}

  triggerBySpeaker(unitId: string) {
    const room = this.roomsRepository.getActiveRoom();
    const mapping = this.mappingsRepository.findActiveByUnitId(unitId);
    const now = nowIso();

    if (!mapping || mapping.roomId !== room.id) {
      return { result: CameraTriggerResult.SKIPPED, reason: 'NO_ACTIVE_MAPPING' as const };
    }

    const camera = this.camerasRepository.findById(mapping.cameraId);
    const preset = this.presetsRepository.findById(mapping.presetId);
    if (!camera || !preset) {
      this.appendLog(room.id, mapping.cameraId, unitId, mapping.presetId, CameraTriggerResult.SKIPPED, 'MAPPING_INVALID', now);
      return { result: CameraTriggerResult.SKIPPED, reason: 'MAPPING_INVALID' as const };
    }

    if (preset.cameraId !== camera.id) {
      this.appendLog(room.id, camera.id, unitId, preset.id, CameraTriggerResult.SKIPPED, 'PRESET_CAMERA_MISMATCH', now);
      return { result: CameraTriggerResult.SKIPPED, reason: 'PRESET_CAMERA_MISMATCH' as const };
    }

    if (camera.status !== CameraStatus.ACTIVE) {
      this.appendLog(room.id, camera.id, unitId, preset.id, CameraTriggerResult.SKIPPED, 'CAMERA_NOT_ACTIVE', now);
      return { result: CameraTriggerResult.SKIPPED, reason: 'CAMERA_NOT_ACTIVE' as const };
    }

    const target: CameraTarget = { unitId, cameraId: camera.id, presetId: preset.id };
    if (this.shouldSuppress(camera.id, target, now)) {
      this.appendLog(room.id, camera.id, unitId, preset.id, CameraTriggerResult.SKIPPED, 'ANTI_JITTER', now);
      this.cameraStateRepository.markResult(camera.id, {
        lastResult: CameraTriggerResult.SKIPPED,
        lastReason: 'ANTI_JITTER',
      });
      return { result: CameraTriggerResult.SKIPPED, reason: 'ANTI_JITTER' as const };
    }

    try {
      this.integrationService.recallPreset(camera, preset.presetCode);

      this.roomStateRepository.save({
        ...this.roomStateRepository.getByRoomId(room.id),
        currentCameraTarget: target,
        updatedAt: now,
      });

      this.cameraStateRepository.markResult(camera.id, {
        currentTargetUnitId: unitId,
        currentPresetId: preset.id,
        lastSwitchAt: now,
        lastResult: CameraTriggerResult.SUCCESS,
        lastReason: null,
      });

      this.appendLog(room.id, camera.id, unitId, preset.id, CameraTriggerResult.SUCCESS, null, now);
      return { result: CameraTriggerResult.SUCCESS as const };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Camera trigger failed';
      this.cameraStateRepository.markResult(camera.id, {
        lastResult: CameraTriggerResult.FAILED,
        lastReason: reason,
      });
      this.appendLog(room.id, camera.id, unitId, preset.id, CameraTriggerResult.FAILED, reason, now);
      return { result: CameraTriggerResult.FAILED as const, reason };
    }
  }

  private shouldSuppress(cameraId: string, target: CameraTarget, nowIsoString: string) {
    const state = this.cameraStateRepository.getOrCreate(cameraId);
    if (!state.lastSwitchAt) return false;
    const lastMs = Date.parse(state.lastSwitchAt);
    const nowMs = Date.parse(nowIsoString);
    if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) return false;

    if (state.currentTargetUnitId === target.unitId && state.currentPresetId === target.presetId) {
      return true; // no-op target
    }

    return nowMs - lastMs < this.antiJitterMs;
  }

  private appendLog(
    roomId: string,
    cameraId: string,
    unitId: string | null,
    presetId: string | null,
    result: CameraTriggerResult,
    reason: string | null,
    now: string,
  ) {
    this.cameraLogsRepository.append({
      roomId,
      cameraId,
      unitId,
      presetId,
      actionType: CameraActionType.TRIGGER_PRESET,
      result,
      reason,
      triggeredAt: now,
      actorUserId: null,
    });
  }
}
