import { Injectable } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { UserRole } from '../../../common/enums/user-role.enum';
import { SystemConfigAuditService } from '../../system-config/services/system-config-audit.service';
import { LiveMonitoringRepository } from '../../live-monitoring/repositories/live-monitoring.repository';
import { RuntimeCameraLogsRepository } from '../../runtime/repositories/runtime-camera.repositories';
import { CameraTriggerResult } from '../../runtime/entities/runtime.entities';
import { LogArchiveService } from './log-archive.service';
import {
  type LogDetail,
  type LogListItem,
  LogLevel,
  LogResult,
  LogSource,
  LogType,
} from '../entities/logging.entities';
import type {
  AuditLogListQueryDto,
  GenericLogsQueryDto,
  RuntimeLogListQueryDto,
} from '../dto/log-query.dto';

@Injectable()
export class LogQueryService {
  constructor(
    private readonly auditService: SystemConfigAuditService,
    private readonly liveRepository: LiveMonitoringRepository,
    private readonly runtimeCameraLogsRepository: RuntimeCameraLogsRepository,
    private readonly archiveService: LogArchiveService,
  ) {}

  getAuditLogs(query: AuditLogListQueryDto, actor?: CurrentUser) {
    if (!actor || actor.role !== UserRole.ADMIN) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const from = query.from ?? null;
    const to = query.to ?? null;
    const keyword = query.keyword?.trim().toLowerCase() ?? null;

    let items = this.auditService
      .list()
      .filter((e) => e.archivedAt === null)
      .filter((e) => (query.actorUserId ? e.actorUserId === query.actorUserId : true))
      .filter((e) => (query.action ? e.action === query.action : true))
      .filter((e) => (query.result ? e.result === query.result : true))
      .filter((e) => (from ? e.createdAt >= from : true))
      .filter((e) => (to ? e.createdAt <= to : true));

    if (keyword) {
      items = items.filter((e) => {
        const blob = JSON.stringify({
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId,
          detailJson: e.detailJson,
        }).toLowerCase();
        return blob.includes(keyword);
      });
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    const mapped: LogListItem[] = paged.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      logType: LogType.AUDIT,
      level: LogLevel.INFO,
      source: LogSource.USER,
      action: e.action,
      result: e.result === 'SUCCESS' ? LogResult.SUCCESS : LogResult.FAILED,
      actorUserId: e.actorUserId,
      roomId: null,
      targetType: e.targetType,
      targetId: e.targetId,
      eventType: null,
      message: this.auditMessage(e.action, e.targetType, e.targetId),
      archivedAt: e.archivedAt,
    }));

    return { items: mapped, page, pageSize, total };
  }

  getRuntimeLogs(query: RuntimeLogListQueryDto, actor?: CurrentUser) {
    if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.OPERATOR)) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }

    const room = this.liveRepository.getActiveRoom();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    // In this demo, runtime events are derived from existing runtime camera logs.
    const { items, total } = this.liveRepository.getRuntimeEvents(room.id, {
      eventType: query.eventType,
      unitId: query.unitId,
      result: query.result,
      from: fromDate,
      to: toDate,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const mapped: LogListItem[] = items.map((e) => ({
      id: e.id,
      createdAt: e.occurredAt,
      logType: LogType.RUNTIME,
      level: this.levelFromResult(e.result),
      source: LogSource.RUNTIME_ENGINE,
      action: null,
      result: this.resultFromRuntimeResult(e.result),
      actorUserId: null,
      roomId: e.roomId,
      targetType: e.unitId ? 'UNIT' : null,
      targetId: e.unitId ?? null,
      eventType: e.eventType,
      message: `${e.eventType}${e.unitName ? `: ${e.unitName}` : ''}`,
      archivedAt: null,
    }));

    return { items: mapped, page, pageSize, total };
  }

  getLogs(query: GenericLogsQueryDto, actor?: CurrentUser) {
    const logType = query.logType ?? null;
    if (logType === LogType.AUDIT) {
      return this.getAuditLogs(
        {
          ...query,
          actorUserId: undefined,
        } as unknown as AuditLogListQueryDto,
        actor,
      );
    }
    if (logType === LogType.RUNTIME) {
      return this.getRuntimeLogs(query as unknown as RuntimeLogListQueryDto, actor);
    }

    // CAMERA / SYSTEM_ERROR / MANUAL_OPERATION are served as runtime camera logs for now.
    return this.getCameraLogsAsGeneric(query, actor);
  }

  getLogDetail(id: string, actor?: CurrentUser): LogDetail {
    if (!actor) throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);

    // Prefer audit if admin and exists
    if (actor.role === UserRole.ADMIN) {
      const audit = this.auditService.findById(id);
      if (audit) {
        return {
          id: audit.id,
          createdAt: audit.createdAt,
          logType: LogType.AUDIT,
          level: LogLevel.INFO,
          source: LogSource.USER,
          action: audit.action,
          result: audit.result === 'SUCCESS' ? LogResult.SUCCESS : LogResult.FAILED,
          actorUserId: audit.actorUserId,
          roomId: null,
          targetType: audit.targetType,
          targetId: audit.targetId,
          eventType: null,
          message: this.auditMessage(audit.action, audit.targetType, audit.targetId),
          archivedAt: audit.archivedAt,
          detailJson: audit.detailJson,
          errorCode: null,
          errorStack: null,
        };
      }
    }

    const cameraLog = this.runtimeCameraLogsRepository.findById(id);
    if (cameraLog) {
      return {
        id: cameraLog.id,
        createdAt: cameraLog.triggeredAt,
        logType: LogType.CAMERA,
        level: this.levelFromCameraResult(cameraLog.result),
        source: LogSource.CAMERA,
        action: cameraLog.actionType,
        result: this.resultFromCameraResult(cameraLog.result),
        actorUserId: cameraLog.actorUserId,
        roomId: cameraLog.roomId,
        targetType: 'CAMERA',
        targetId: cameraLog.cameraId,
        eventType: cameraLog.actionType,
        message: `Camera ${cameraLog.actionType}`,
        archivedAt: this.archiveService.getCameraArchivedAt(cameraLog.id),
        detailJson: {
          cameraId: cameraLog.cameraId,
          unitId: cameraLog.unitId,
          presetId: cameraLog.presetId,
          reason: cameraLog.reason,
        },
        errorCode: null,
        errorStack: null,
      };
    }

    throw new AppException('NOT_FOUND', 'Log not found', 404);
  }

  private getCameraLogsAsGeneric(query: GenericLogsQueryDto, actor?: CurrentUser) {
    if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.OPERATOR)) {
      throw new AppException('FORBIDDEN', 'Forbidden', 403);
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const from = query.from ?? null;
    const to = query.to ?? null;
    const keyword = query.keyword?.trim().toLowerCase() ?? null;

    let items = this.runtimeCameraLogsRepository.list().filter((i) => !this.archiveService.isCameraArchived(i.id));
    if (query.result) {
      items = items.filter((i) => this.resultFromCameraResult(i.result) === query.result);
    }
    if (from) items = items.filter((i) => i.triggeredAt >= from);
    if (to) items = items.filter((i) => i.triggeredAt <= to);
    if (query.action) items = items.filter((i) => i.actionType === query.action);
    if (query.targetId) items = items.filter((i) => i.cameraId === query.targetId);

    if (keyword) {
      items = items.filter((i) => {
        const blob = JSON.stringify(i).toLowerCase();
        return blob.includes(keyword);
      });
    }

    items.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    const mapped: LogListItem[] = paged.map((i) => ({
      id: i.id,
      createdAt: i.triggeredAt,
      logType: LogType.CAMERA,
      level: this.levelFromCameraResult(i.result),
      source: LogSource.CAMERA,
      action: i.actionType,
      result: this.resultFromCameraResult(i.result),
      actorUserId: i.actorUserId,
      roomId: i.roomId,
      targetType: 'CAMERA',
      targetId: i.cameraId,
      eventType: i.actionType,
      message: `Camera ${i.actionType}`,
      archivedAt: this.archiveService.getCameraArchivedAt(i.id),
    }));

    return { items: mapped, page, pageSize, total };
  }

  private auditMessage(action: string, targetType: string, targetId: string | null) {
    if (targetId) return `${action} (${targetType}:${targetId})`;
    return `${action} (${targetType})`;
  }

  private resultFromCameraResult(result: CameraTriggerResult): LogResult {
    if (result === CameraTriggerResult.SUCCESS) return LogResult.SUCCESS;
    if (result === CameraTriggerResult.SKIPPED) return LogResult.SKIPPED;
    return LogResult.FAILED;
  }

  private levelFromCameraResult(result: CameraTriggerResult): LogLevel {
    if (result === CameraTriggerResult.SUCCESS) return LogLevel.INFO;
    if (result === CameraTriggerResult.SKIPPED) return LogLevel.WARNING;
    return LogLevel.ERROR;
  }

  private resultFromRuntimeResult(result: string): LogResult | null {
    const up = result.toUpperCase();
    if (up === 'SUCCESS') return LogResult.SUCCESS;
    if (up === 'SKIPPED') return LogResult.SKIPPED;
    if (up === 'FAILED') return LogResult.FAILED;
    return null;
  }

  private levelFromResult(result: string): LogLevel {
    const up = result.toUpperCase();
    if (up === 'SUCCESS') return LogLevel.INFO;
    if (up === 'SKIPPED') return LogLevel.WARNING;
    if (up === 'FAILED') return LogLevel.ERROR;
    return LogLevel.INFO;
  }
}
