import { Injectable } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { CamerasRepository, LayoutsRepository, MicCameraMappingsRepository, RoomsRepository, TsdConnectionConfigsRepository } from '../repositories/system-config.repositories';

@Injectable()
export class SystemConfigOverviewService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly tsdConfigsRepository: TsdConnectionConfigsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly layoutsRepository: LayoutsRepository,
    private readonly mappingsRepository: MicCameraMappingsRepository,
  ) {}

  getOverview(_actor?: CurrentUser) {
    const room = this.roomsRepository.getActiveRoom();
    if (!room) {
      throw new AppException('ROOM_NOT_FOUND', 'Room not found', 404);
    }

    const tsdConfig = this.tsdConfigsRepository.findActiveByRoomId(room.id);
    const cameras = this.camerasRepository.findByRoomId(room.id);
    const layout = this.layoutsRepository.findByRoomId(room.id);
    const mappings = this.mappingsRepository.findByRoomId(room.id);

    return {
      room: {
        id: room.id,
        name: room.name,
        operationMode: room.operationMode,
      },
      tsdConnection: {
        configured: Boolean(tsdConfig),
        lastTestResult: tsdConfig?.lastTestResult ?? null,
        lastTestAt: tsdConfig?.lastTestAt ?? null,
      },
      layout: {
        configured: Boolean(layout),
        fileType: layout?.fileType ?? null,
      },
      cameraSummary: {
        total: cameras.length,
        active: cameras.filter((item) => item.status === 'ACTIVE').length,
      },
      mappingSummary: {
        total: mappings.length,
        active: mappings.filter((item) => item.isActive).length,
      },
    };
  }
}
