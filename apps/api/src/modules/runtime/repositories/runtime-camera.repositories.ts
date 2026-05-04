import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../../common/base/base.repository';
import {
  type RuntimeCameraLogEntity,
  type RuntimeCameraStateEntity,
} from '../entities/runtime.entities';

@Injectable()
export class RuntimeCameraStateRepository extends BaseRepository<RuntimeCameraStateEntity> {
  getOrCreate(cameraId: string): RuntimeCameraStateEntity {
    const existing = this.findById(cameraId);
    if (existing) return existing;
    const now = new Date().toISOString();
    return this.save({
      id: cameraId,
      cameraId,
      currentTargetUnitId: null,
      currentPresetId: null,
      lastSwitchAt: null,
      lastResult: null,
      lastReason: null,
      updatedAt: now,
    });
  }

  markResult(
    cameraId: string,
    update: Partial<Pick<RuntimeCameraStateEntity, 'currentTargetUnitId' | 'currentPresetId' | 'lastSwitchAt' | 'lastResult' | 'lastReason'>>,
  ) {
    const current = this.getOrCreate(cameraId);
    return this.save({
      ...current,
      ...update,
      updatedAt: new Date().toISOString(),
    });
  }
}

@Injectable()
export class RuntimeCameraLogsRepository extends BaseRepository<RuntimeCameraLogEntity> {
  listByCameraId(cameraId: string): RuntimeCameraLogEntity[] {
    return this.list().filter((item) => item.cameraId === cameraId);
  }

  append(entry: Omit<RuntimeCameraLogEntity, 'id'>) {
    const id = randomUUID();
    return this.save({ id, ...entry });
  }
}
