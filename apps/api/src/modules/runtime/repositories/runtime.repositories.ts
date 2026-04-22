import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../../common/base/base.repository';
import { OperationMode } from '../../system-config/entities/system-config.entities';
import { RoomsRepository } from '../../system-config/repositories/system-config.repositories';
import type { RuntimeRoomStateEntity, SpeakingRequestEntity } from '../entities/runtime.entities';
import { SseStatus } from '../entities/runtime.entities';

@Injectable()
export class RuntimeRoomStateRepository extends BaseRepository<RuntimeRoomStateEntity> {
  constructor(private readonly roomsRepository: RoomsRepository) {
    super();
    const room = this.roomsRepository.getActiveRoom();
    const now = new Date().toISOString();
    this.save({
      id: room.id,
      roomId: room.id,
      operationMode: room.operationMode ?? OperationMode.MANUAL,
      sseStatus: SseStatus.DISCONNECTED,
      currentCameraTarget: null,
      updatedAt: now,
    });
  }

  getByRoomId(roomId: string): RuntimeRoomStateEntity {
    const existing = this.findById(roomId);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const created: RuntimeRoomStateEntity = {
      id: roomId,
      roomId,
      operationMode: this.roomsRepository.getActiveRoom().operationMode,
      sseStatus: SseStatus.DISCONNECTED,
      currentCameraTarget: null,
      updatedAt: now,
    };
    return this.save(created);
  }
}

@Injectable()
export class SpeakingRequestsRepository extends BaseRepository<SpeakingRequestEntity> {
  findByRoomId(roomId: string): SpeakingRequestEntity[] {
    return this.list().filter((item) => item.roomId === roomId);
  }

  findPendingByUnitId(roomId: string, unitId: string): SpeakingRequestEntity | null {
    return (
      this.findByRoomId(roomId).find((item) => item.unitId === unitId && item.status === 'PENDING') ??
      null
    );
  }
}

