import { Injectable } from '@nestjs/common';

import { RuntimeCameraLogsRepository } from '../../runtime/repositories/runtime-camera.repositories';
import { SystemConfigAuditService } from '../../system-config/services/system-config-audit.service';
import { nowIso } from '../../system-config/services/system-config-utils';
import { LogType } from '../entities/logging.entities';

@Injectable()
export class LogArchiveService {
  private readonly cameraArchivedAt = new Map<string, string>();

  constructor(
    private readonly auditService: SystemConfigAuditService,
    private readonly runtimeCameraLogsRepository: RuntimeCameraLogsRepository,
  ) {}

  getCameraArchivedAt(id: string): string | null {
    return this.cameraArchivedAt.get(id) ?? null;
  }

  isCameraArchived(id: string): boolean {
    return this.cameraArchivedAt.has(id);
  }

  archive(beforeIso: string, logTypes: LogType[] | undefined) {
    const types = logTypes && logTypes.length > 0 ? new Set(logTypes) : null;
    const archivedAt = nowIso();
    let archivedCount = 0;

    if (!types || types.has(LogType.AUDIT)) {
      const res = this.auditService.archive(beforeIso);
      archivedCount += res.archivedCount;
    }

    if (!types || types.has(LogType.CAMERA) || types.has(LogType.RUNTIME)) {
      for (const log of this.runtimeCameraLogsRepository.list()) {
        if (this.cameraArchivedAt.has(log.id)) continue;
        if (log.triggeredAt >= beforeIso) continue;
        this.cameraArchivedAt.set(log.id, archivedAt);
        archivedCount += 1;
      }
    }

    return { archivedCount, archivedAt };
  }
}

