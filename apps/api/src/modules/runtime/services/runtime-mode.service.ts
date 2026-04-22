import { Injectable } from '@nestjs/common';

import type { CurrentUser } from '../../../common/types/current-user.type';
import { AppException } from '../../../common/exceptions/app.exception';
import { UserRole } from '../../../common/enums/user-role.enum';
import type { OperationMode } from '../../system-config/entities/system-config.entities';
import { RoomsRepository } from '../../system-config/repositories/system-config.repositories';
import { SystemConfigAuditService } from '../../system-config/services/system-config-audit.service';
import { nowIso } from '../../system-config/services/system-config-utils';
import { RuntimeSnapshotService } from './runtime-snapshot.service';

@Injectable()
export class RuntimeModeService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly auditService: SystemConfigAuditService,
    private readonly snapshotService: RuntimeSnapshotService,
  ) {}

  getMode() {
    const room = this.roomsRepository.getActiveRoom();
    return {
      roomId: room.id,
      mode: room.operationMode,
    };
  }

  updateMode(mode: OperationMode, actor?: CurrentUser) {
    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }

    const room = this.roomsRepository.getActiveRoom();
    const next = mode;
    if (room.operationMode === next) {
      return {
        roomId: room.id,
        mode: room.operationMode,
      };
    }

    this.roomsRepository.save({
      ...room,
      operationMode: next,
      updatedAt: nowIso(),
    });
    this.auditService.record('UPDATE_MODE', actor.id, 'ROOM', room.id, {
      oldMode: room.operationMode,
      newMode: next,
    });
    return {
      roomId: room.id,
      mode: next,
    };
  }

  getSwitchImpact(actor?: CurrentUser) {
    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }

    const snap = this.snapshotService.getSnapshot();
    const hasActiveSpeakers = snap.activeSpeakers.length > 0;
    const hasPendingRequests = snap.pendingRequests.length > 0;
    return {
      hasActiveSpeakers,
      hasPendingRequests,
      warningMessage:
        hasActiveSpeakers || hasPendingRequests
          ? 'There are active speakers or pending requests. Switching mode may affect the current speaking session.'
          : null,
    };
  }
}

