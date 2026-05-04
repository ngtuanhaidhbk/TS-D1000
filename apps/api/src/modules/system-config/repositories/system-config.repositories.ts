import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../../common/base/base.repository';
import {
  CameraEntity,
  CameraPresetEntity,
  CameraStatus,
  DeviceType,
  LayoutAnnotationEntity,
  LayoutDeviceEntity,
  LayoutEntity,
  MicCameraMappingEntity,
  OperationMode,
  RoomEntity,
  TsdConnectionConfigEntity,
  TsdUnitEntity,
  UnitRuntimeState,
} from '../entities/system-config.entities';

@Injectable()
export class RoomsRepository extends BaseRepository<RoomEntity> {
  constructor() {
    super();
    const now = new Date().toISOString();
    this.save({
      id: 'room-001',
      name: 'Meeting Room A',
      operationMode: OperationMode.MANUAL,
      createdAt: now,
      updatedAt: now,
    });
  }

  getActiveRoom(): RoomEntity {
    return this.list()[0];
  }
}

@Injectable()
export class TsdConnectionConfigsRepository extends BaseRepository<TsdConnectionConfigEntity> {
  findActiveByRoomId(roomId: string): TsdConnectionConfigEntity | null {
    return this.list().find((item) => item.roomId === roomId && item.isActive) ?? null;
  }
}

@Injectable()
export class TsdUnitsRepository extends BaseRepository<TsdUnitEntity> {
  findByRoomId(roomId: string): TsdUnitEntity[] {
    return this.list().filter((item) => item.roomId === roomId);
  }

  findByRoomAndExternalUnitId(roomId: string, externalUnitId: string): TsdUnitEntity | null {
    return (
      this.list().find(
        (item) => item.roomId === roomId && item.externalUnitId === externalUnitId,
      ) ?? null
    );
  }
}

@Injectable()
export class CamerasRepository extends BaseRepository<CameraEntity> {
  findByRoomId(roomId: string): CameraEntity[] {
    return this.list().filter((item) => item.roomId === roomId);
  }

  countActiveByRoomId(roomId: string): number {
    return this.findByRoomId(roomId).filter((item) => item.status === CameraStatus.ACTIVE).length;
  }

  findByRoomAndEndpoint(roomId: string, ipAddress: string, port: number | null): CameraEntity | null {
    return (
      this.findByRoomId(roomId).find((item) => item.ipAddress === ipAddress && item.port === port) ??
      null
    );
  }
}

@Injectable()
export class CameraPresetsRepository extends BaseRepository<CameraPresetEntity> {
  findByCameraId(cameraId: string): CameraPresetEntity[] {
    return this.list().filter((item) => item.cameraId === cameraId);
  }

  findByCameraAndCode(cameraId: string, presetCode: string): CameraPresetEntity | null {
    return (
      this.findByCameraId(cameraId).find((item) => item.presetCode === presetCode) ?? null
    );
  }
}

@Injectable()
export class LayoutsRepository extends BaseRepository<LayoutEntity> {
  findByRoomId(roomId: string): LayoutEntity | null {
    return this.list().find((item) => item.roomId === roomId) ?? null;
  }
}

@Injectable()
export class LayoutDevicesRepository extends BaseRepository<LayoutDeviceEntity> {
  findByRoomId(roomId: string): LayoutDeviceEntity[] {
    return this.list().filter((item) => item.roomId === roomId);
  }

  findByRoomAndRef(roomId: string, refType: string, refId: string): LayoutDeviceEntity | null {
    return (
      this.findByRoomId(roomId).find((item) => item.refType === refType && item.refId === refId) ??
      null
    );
  }
}

@Injectable()
export class LayoutAnnotationsRepository extends BaseRepository<LayoutAnnotationEntity> {
  findByRoomId(roomId: string): LayoutAnnotationEntity[] {
    return this.list().filter((item) => item.roomId === roomId);
  }
}

@Injectable()
export class MicCameraMappingsRepository extends BaseRepository<MicCameraMappingEntity> {
  findByRoomId(roomId: string): MicCameraMappingEntity[] {
    return this.list().filter((item) => item.roomId === roomId);
  }

  findActiveByUnitId(unitId: string): MicCameraMappingEntity | null {
    return this.list().find((item) => item.unitId === unitId && item.isActive) ?? null;
  }

  findActiveByCameraId(cameraId: string): MicCameraMappingEntity[] {
    return this.list().filter((item) => item.cameraId === cameraId && item.isActive);
  }

  findActiveByPresetId(presetId: string): MicCameraMappingEntity[] {
    return this.list().filter((item) => item.presetId === presetId && item.isActive);
  }
}

export function buildSeedUnits(roomId: string): TsdUnitEntity[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'unit-chair-001',
      roomId,
      externalUnitId: 'C01',
      unitName: 'Chairman 01',
      deviceType: DeviceType.CHAIRMAN,
      runtimeState: UnitRuntimeState.IDLE,
      isConnected: true,
      lastEventAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'unit-del-001',
      roomId,
      externalUnitId: 'D01',
      unitName: 'Delegate 01',
      deviceType: DeviceType.DELEGATE,
      runtimeState: UnitRuntimeState.IDLE,
      isConnected: true,
      lastEventAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
