import { Injectable } from '@nestjs/common';

import type { CurrentUser } from '../../../common/types/current-user.type';
import { AppException } from '../../../common/exceptions/app.exception';
import { paginateAndFilter } from '../../system-config/services/system-config-utils';
import { RoomsRepository, TsdUnitsRepository } from '../../system-config/repositories/system-config.repositories';
import { SystemConfigAuditService } from '../../system-config/services/system-config-audit.service';
import { nowIso } from '../../system-config/services/system-config-utils';
import type { ListRuntimeRequestsQueryDto } from '../dto/runtime-requests.dto';
import { SpeakingRequestStatus } from '../entities/runtime.entities';
import { SpeakingRequestsRepository } from '../repositories/runtime.repositories';

@Injectable()
export class ManualRequestsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly unitsRepository: TsdUnitsRepository,
    private readonly requestsRepository: SpeakingRequestsRepository,
    private readonly auditService: SystemConfigAuditService,
  ) {}

  list(query: ListRuntimeRequestsQueryDto) {
    const room = this.roomsRepository.getActiveRoom();
    const mode = room.operationMode;

    if (mode !== 'MANUAL') {
      return {
        items: [],
        pagination: {
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          total: 0,
          totalPages: 0,
        },
      };
    }

    let items = this.requestsRepository.findByRoomId(room.id);
    const status = query.status ?? SpeakingRequestStatus.PENDING;
    items = items.filter((req) => req.status === status);

    // Oldest first by default for operator ergonomics.
    items.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

    const result = paginateAndFilter(items, { page: query.page, pageSize: query.pageSize });
    return {
      items: result.items.map((req) => {
        const unit = this.unitsRepository.findById(req.unitId);
        return {
          id: req.id,
          unitId: req.unitId,
          unitName: unit?.unitName ?? null,
          deviceType: unit?.deviceType ?? null,
          status: req.status,
          createdAt: req.requestedAt,
          updatedAt: req.updatedAt,
          handledBy: req.resolvedBy,
        };
      }),
      pagination: result.pagination,
    };
  }

  approve(requestId: string, actor?: CurrentUser) {
    if (!actor) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const room = this.roomsRepository.getActiveRoom();
    if (room.operationMode !== 'MANUAL') {
      throw new AppException('MANUAL_MODE_REQUIRED', 'Manual mode is required for this action', 422);
    }

    const request = this.requestsRepository.findById(requestId);
    if (!request || request.roomId !== room.id) {
      throw new AppException('REQUEST_NOT_FOUND', 'Request not found', 404);
    }

    if (request.status !== SpeakingRequestStatus.PENDING) {
      throw new AppException('REQUEST_NOT_PENDING', 'Request is not in pending state', 422);
    }

    const now = nowIso();
    this.requestsRepository.save({
      ...request,
      status: SpeakingRequestStatus.APPROVED,
      approvedAt: now,
      resolvedBy: actor.id,
      updatedAt: now,
    });

    this.auditService.record('APPROVE_SPEAKING_REQUEST', actor.id, 'SPEAKING_REQUEST', request.id, {
      roomId: room.id,
      unitId: request.unitId,
    });

    return {
      requestId: request.id,
      status: SpeakingRequestStatus.APPROVED,
    };
  }

  reject(requestId: string, actor?: CurrentUser) {
    if (!actor) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const room = this.roomsRepository.getActiveRoom();
    if (room.operationMode !== 'MANUAL') {
      throw new AppException('MANUAL_MODE_REQUIRED', 'Manual mode is required for this action', 422);
    }

    const request = this.requestsRepository.findById(requestId);
    if (!request || request.roomId !== room.id) {
      throw new AppException('REQUEST_NOT_FOUND', 'Request not found', 404);
    }

    if (request.status !== SpeakingRequestStatus.PENDING) {
      throw new AppException('REQUEST_NOT_PENDING', 'Request is not in pending state', 422);
    }

    const now = nowIso();
    this.requestsRepository.save({
      ...request,
      status: SpeakingRequestStatus.REJECTED,
      rejectedAt: now,
      resolvedBy: actor.id,
      updatedAt: now,
    });

    const unit = this.unitsRepository.findById(request.unitId);
    if (unit && unit.roomId === room.id) {
      this.unitsRepository.save({
        ...unit,
        runtimeState: 'IDLE',
        updatedAt: now,
      });
    }

    this.auditService.record('REJECT_SPEAKING_REQUEST', actor.id, 'SPEAKING_REQUEST', request.id, {
      roomId: room.id,
      unitId: request.unitId,
    });

    return {
      requestId: request.id,
      status: SpeakingRequestStatus.REJECTED,
    };
  }
}

