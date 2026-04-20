import { Injectable } from '@nestjs/common';

import type { CurrentUser } from '../../../common/types/current-user.type';
import { UpdateModeDto } from '../dto/mapping.dto';
import { RoomsRepository } from '../repositories/system-config.repositories';
import { SystemConfigAuditService } from './system-config-audit.service';
import { nowIso, requireAdmin } from './system-config-utils';

@Injectable()
export class OperationModeService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly auditService: SystemConfigAuditService,
  ) {}

  getMode() {
    return {
      mode: this.roomsRepository.getActiveRoom().operationMode,
    };
  }

  updateMode(payload: UpdateModeDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    this.roomsRepository.save({
      ...room,
      operationMode: payload.mode,
      updatedAt: nowIso(),
    });
    this.auditService.record('UPDATE_MODE', actor!.id, 'ROOM', room.id, { mode: payload.mode });
    return {
      mode: payload.mode,
    };
  }
}
