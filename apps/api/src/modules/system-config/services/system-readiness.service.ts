import { Injectable } from '@nestjs/common';

import type { CurrentUser } from '../../../common/types/current-user.type';
import { ReadinessStatus } from '../entities/system-config.entities';
import {
  CamerasRepository,
  LayoutsRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
  TsdConnectionConfigsRepository,
  TsdUnitsRepository,
} from '../repositories/system-config.repositories';
import { SystemConfigAuditService } from './system-config-audit.service';
import { requireAdmin } from './system-config-utils';

@Injectable()
export class SystemReadinessService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly tsdConfigsRepository: TsdConnectionConfigsRepository,
    private readonly unitsRepository: TsdUnitsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly layoutsRepository: LayoutsRepository,
    private readonly mappingsRepository: MicCameraMappingsRepository,
    private readonly auditService: SystemConfigAuditService,
  ) {}

  check(actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    const config = this.tsdConfigsRepository.findActiveByRoomId(room.id);
    const units = this.unitsRepository.findByRoomId(room.id);
    const cameras = this.camerasRepository.findByRoomId(room.id);
    const layout = this.layoutsRepository.findByRoomId(room.id);
    const mappings = this.mappingsRepository.findByRoomId(room.id).filter((item) => item.isActive);

    const items = [
      config
        ? {
            category: 'TSD',
            status:
              config.lastTestResult === 'SUCCESS' ? ReadinessStatus.PASSED : ReadinessStatus.WARNING,
            message:
              config.lastTestResult === 'SUCCESS'
                ? 'TS-D1000 connection is configured and test passed'
                : 'TS-D1000 connection is configured but should be tested again',
          }
        : {
            category: 'TSD',
            status: ReadinessStatus.FAILED,
            message: 'TS-D1000 connection is not configured',
          },
      cameras.length > 0
        ? {
            category: 'CAMERA',
            status: ReadinessStatus.PASSED,
            message: `${cameras.length} camera(s) configured`,
          }
        : {
            category: 'CAMERA',
            status: ReadinessStatus.FAILED,
            message: 'No camera configured',
          },
      layout
        ? { category: 'LAYOUT', status: ReadinessStatus.PASSED, message: 'Layout exists' }
        : { category: 'LAYOUT', status: ReadinessStatus.FAILED, message: 'Layout is missing' },
      units.length === 0
        ? {
            category: 'MAPPING',
            status: ReadinessStatus.WARNING,
            message: 'No units have been synced yet',
          }
        : mappings.length < units.length
          ? {
              category: 'MAPPING',
              status: ReadinessStatus.WARNING,
              message: `${units.length - mappings.length} units do not have active mapping`,
            }
          : {
              category: 'MAPPING',
              status: ReadinessStatus.PASSED,
              message: 'All synced units have active mappings',
            },
      {
        category: 'MODE',
        status: ReadinessStatus.PASSED,
        message: `Operation mode is ${room.operationMode}`,
      },
    ];

    const overallStatus = items.some((item) => item.status === ReadinessStatus.FAILED)
      ? ReadinessStatus.FAILED
      : items.some((item) => item.status === ReadinessStatus.WARNING)
        ? ReadinessStatus.WARNING
        : ReadinessStatus.PASSED;

    this.auditService.record('RUN_READINESS_CHECK', actor!.id, 'ROOM', room.id, { overallStatus });
    return {
      overallStatus,
      items,
    };
  }
}
