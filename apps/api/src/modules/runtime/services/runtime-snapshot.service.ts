import { Injectable } from '@nestjs/common';

import { RoomsRepository, TsdUnitsRepository } from '../../system-config/repositories/system-config.repositories';
import { SpeakingRequestStatus } from '../entities/runtime.entities';
import type { RuntimeSnapshot } from '../entities/runtime.entities';
import { RuntimeRoomStateRepository, SpeakingRequestsRepository } from '../repositories/runtime.repositories';

@Injectable()
export class RuntimeSnapshotService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly unitsRepository: TsdUnitsRepository,
    private readonly roomStateRepository: RuntimeRoomStateRepository,
    private readonly speakingRequestsRepository: SpeakingRequestsRepository,
  ) {}

  getSnapshot(): RuntimeSnapshot {
    const room = this.roomsRepository.getActiveRoom();
    const runtimeState = this.roomStateRepository.getByRoomId(room.id);

    const units = this.unitsRepository.findByRoomId(room.id);
    const speakingUnits = units.filter((unit) => unit.runtimeState === 'SPEAKING').map((unit) => unit.id);

    const requests = this.speakingRequestsRepository.findByRoomId(room.id);
    const pending = requests
      .filter((req) => req.status === SpeakingRequestStatus.PENDING)
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
      .map((req) => req.id);

    const unitsMap: RuntimeSnapshot['units'] = {};
    for (const unit of units) {
      unitsMap[unit.id] = {
        state: unit.runtimeState,
        lastEventAt: unit.lastEventAt,
      };
    }

    return {
      roomId: room.id,
      operationMode: room.operationMode,
      sseStatus: runtimeState.sseStatus,
      activeSpeakers: speakingUnits,
      pendingRequests: pending,
      currentCameraTarget: runtimeState.currentCameraTarget,
      units: unitsMap,
    };
  }
}

