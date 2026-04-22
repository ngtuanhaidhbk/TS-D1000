import { Injectable } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { UserRole } from '../../../common/enums/user-role.enum';
import { paginateAndFilter } from '../../system-config/services/system-config-utils';
import { CamerasRepository } from '../../system-config/repositories/system-config.repositories';
import { RuntimeCameraLogsRepository, RuntimeCameraStateRepository } from '../repositories/runtime-camera.repositories';

@Injectable()
export class RuntimeCameraMonitoringService {
  constructor(
    private readonly camerasRepository: CamerasRepository,
    private readonly cameraStateRepository: RuntimeCameraStateRepository,
    private readonly cameraLogsRepository: RuntimeCameraLogsRepository,
  ) {}

  getStatus(cameraId: string, actor?: CurrentUser) {
    this.requireViewer(actor);
    const camera = this.camerasRepository.findById(cameraId);
    if (!camera) {
      throw new AppException('CAMERA_NOT_FOUND', 'Camera not found', 404);
    }
    const state = this.cameraStateRepository.getOrCreate(cameraId);
    return {
      cameraId: camera.id,
      status: camera.status,
      currentTargetUnitId: state.currentTargetUnitId,
      currentPresetId: state.currentPresetId,
      lastSwitchAt: state.lastSwitchAt,
      lastResult: state.lastResult,
      lastReason: state.lastReason,
      updatedAt: state.updatedAt,
    };
  }

  listLogs(
    cameraId: string,
    query: { page?: number; pageSize?: number } | undefined,
    actor?: CurrentUser,
  ) {
    this.requireViewer(actor);
    const camera = this.camerasRepository.findById(cameraId);
    if (!camera) {
      throw new AppException('CAMERA_NOT_FOUND', 'Camera not found', 404);
    }
    const items = this.cameraLogsRepository
      .listByCameraId(cameraId)
      .sort((a, b) => (a.triggeredAt < b.triggeredAt ? 1 : -1))
      .map((entry) => ({
        id: entry.id,
        roomId: entry.roomId,
        cameraId: entry.cameraId,
        unitId: entry.unitId,
        presetId: entry.presetId,
        actionType: entry.actionType,
        result: entry.result,
        reason: entry.reason,
        triggeredAt: entry.triggeredAt,
        actorUserId: entry.actorUserId,
      }));

    return paginateAndFilter(items, {
      page: query?.page,
      pageSize: query?.pageSize,
    });
  }

  private requireViewer(actor?: CurrentUser) {
    if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.OPERATOR)) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }
  }
}

