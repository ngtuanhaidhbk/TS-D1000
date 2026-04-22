import { Injectable } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CameraStatus } from '../../system-config/entities/system-config.entities';
import { CameraIntegrationService } from '../../system-config/services/camera-integration.service';
import { SystemConfigAuditService } from '../../system-config/services/system-config-audit.service';
import {
  CameraPresetsRepository,
  CamerasRepository,
} from '../../system-config/repositories/system-config.repositories';
import {
  CameraActionType,
  CameraTriggerResult,
} from '../entities/runtime.entities';
import { RuntimeCameraLogsRepository, RuntimeCameraStateRepository } from '../repositories/runtime-camera.repositories';

@Injectable()
export class RuntimeCameraControlService {
  constructor(
    private readonly camerasRepository: CamerasRepository,
    private readonly presetsRepository: CameraPresetsRepository,
    private readonly cameraIntegrationService: CameraIntegrationService,
    private readonly auditService: SystemConfigAuditService,
    private readonly cameraStateRepository: RuntimeCameraStateRepository,
    private readonly cameraLogsRepository: RuntimeCameraLogsRepository,
  ) {}

  recallPreset(cameraId: string, presetId: string, actor?: CurrentUser) {
    this.requireRuntimeActor(actor);
    const camera = this.mustFindCamera(cameraId);
    if (camera.status !== CameraStatus.ACTIVE) {
      throw new AppException('CAMERA_NOT_ACTIVE', 'Camera is not active', 422);
    }
    const preset = this.presetMustExist(presetId);
    if (preset.cameraId !== camera.id) {
      throw new AppException('PRESET_CAMERA_MISMATCH', 'Selected preset does not belong to selected camera', 422);
    }

    const now = new Date().toISOString();
    const result = this.cameraIntegrationService.recallPreset(camera, preset.presetCode);
    this.cameraStateRepository.markResult(camera.id, {
      currentTargetUnitId: null,
      currentPresetId: preset.id,
      lastSwitchAt: now,
      lastResult: CameraTriggerResult.SUCCESS,
      lastReason: null,
    });
    this.cameraLogsRepository.append({
      roomId: camera.roomId,
      cameraId: camera.id,
      unitId: null,
      presetId: preset.id,
      actionType: CameraActionType.MANUAL_PRESET,
      result: CameraTriggerResult.SUCCESS,
      reason: null,
      triggeredAt: now,
      actorUserId: actor!.id,
    });
    this.auditService.record('MANUAL_RECALL_PRESET', actor!.id, 'CAMERA', camera.id);
    return {
      result: result.result,
      executedAt: now,
    };
  }

  move(cameraId: string, action: string, speed: number | null, actor?: CurrentUser) {
    this.requireRuntimeActor(actor);
    const camera = this.mustFindCamera(cameraId);
    if (camera.status !== CameraStatus.ACTIVE) {
      throw new AppException('CAMERA_NOT_ACTIVE', 'Camera is not active', 422);
    }

    const now = new Date().toISOString();
    const result = this.cameraIntegrationService.move(camera, action, speed);
    this.cameraStateRepository.markResult(camera.id, {
      lastResult: CameraTriggerResult.SUCCESS,
      lastReason: null,
    });
    this.cameraLogsRepository.append({
      roomId: camera.roomId,
      cameraId: camera.id,
      unitId: null,
      presetId: null,
      actionType: CameraActionType.MOVE,
      result: CameraTriggerResult.SUCCESS,
      reason: null,
      triggeredAt: now,
      actorUserId: actor!.id,
    });
    this.auditService.record('MANUAL_MOVE_CAMERA', actor!.id, 'CAMERA', camera.id);
    return {
      result: result.result,
      executedAt: now,
    };
  }

  stop(cameraId: string, actor?: CurrentUser) {
    this.requireRuntimeActor(actor);
    const camera = this.mustFindCamera(cameraId);
    if (camera.status !== CameraStatus.ACTIVE) {
      throw new AppException('CAMERA_NOT_ACTIVE', 'Camera is not active', 422);
    }

    const now = new Date().toISOString();
    const result = this.cameraIntegrationService.stop(camera);
    this.cameraStateRepository.markResult(camera.id, {
      lastResult: CameraTriggerResult.SUCCESS,
      lastReason: null,
    });
    this.cameraLogsRepository.append({
      roomId: camera.roomId,
      cameraId: camera.id,
      unitId: null,
      presetId: null,
      actionType: CameraActionType.STOP,
      result: CameraTriggerResult.SUCCESS,
      reason: null,
      triggeredAt: now,
      actorUserId: actor!.id,
    });
    this.auditService.record('MANUAL_STOP_CAMERA', actor!.id, 'CAMERA', camera.id);
    return {
      result: result.result,
      executedAt: now,
    };
  }

  private requireRuntimeActor(actor?: CurrentUser) {
    if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.OPERATOR)) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }
  }

  private mustFindCamera(cameraId: string) {
    const camera = this.camerasRepository.findById(cameraId);
    if (!camera) {
      throw new AppException('CAMERA_NOT_FOUND', 'Camera not found', 404);
    }
    return camera;
  }

  private presetMustExist(presetId: string) {
    const preset = this.presetsRepository.findById(presetId);
    if (!preset) {
      throw new AppException('PRESET_NOT_FOUND', 'Preset not found', 404);
    }
    return preset;
  }
}
