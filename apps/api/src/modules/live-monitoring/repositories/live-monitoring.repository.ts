import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

import {
  CamerasRepository,
  CameraPresetsRepository,
  LayoutDevicesRepository,
  LayoutsRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
  TsdUnitsRepository,
} from '../../system-config/repositories/system-config.repositories';
import type { CameraStatus } from '../../system-config/entities/system-config.entities';
import {
  RuntimeCameraLogsRepository,
  RuntimeCameraStateRepository,
} from '../../runtime/repositories/runtime-camera.repositories';
import {
  RuntimeRoomStateRepository,
  SpeakingRequestsRepository,
} from '../../runtime/repositories/runtime.repositories';
import { CameraActionType, CameraTriggerResult, SpeakingRequestStatus } from '../../runtime/entities/runtime.entities';

import type {
  AlertSeverity,
  AlertStatus,
  CameraRuntimeResult,
  RuntimeAlertEntity,
  RuntimeEventEntity,
  RuntimeRecoveryLogEntity,
} from '../entities/live-monitoring.entities';

type AckRecord = {
  acknowledgedBy: string;
  acknowledgedAt: string;
};

@Injectable()
export class LiveMonitoringRepository {
  private readonly ackedAlerts = new Map<string, AckRecord>();
  private readonly recoveryLogs: RuntimeRecoveryLogEntity[] = [];

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly runtimeRoomStateRepository: RuntimeRoomStateRepository,
    private readonly speakingRequestsRepository: SpeakingRequestsRepository,
    private readonly tsdUnitsRepository: TsdUnitsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly cameraPresetsRepository: CameraPresetsRepository,
    private readonly mappingsRepository: MicCameraMappingsRepository,
    private readonly layoutsRepository: LayoutsRepository,
    private readonly layoutDevicesRepository: LayoutDevicesRepository,
    private readonly runtimeCameraStateRepository: RuntimeCameraStateRepository,
    private readonly runtimeCameraLogsRepository: RuntimeCameraLogsRepository,
  ) {}

  getActiveRoom() {
    return this.roomsRepository.getActiveRoom();
  }

  getRuntimeRoomState(roomId: string) {
    return this.runtimeRoomStateRepository.getByRoomId(roomId);
  }

  getActiveUnits(roomId: string) {
    return this.tsdUnitsRepository.findByRoomId(roomId);
  }

  getSpeakingUnits(roomId: string) {
    return this.getActiveUnits(roomId).filter((unit) => unit.runtimeState === 'SPEAKING');
  }

  getPendingRequests(roomId: string) {
    return this.speakingRequestsRepository
      .findByRoomId(roomId)
      .filter((req) => req.status === SpeakingRequestStatus.PENDING)
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  }

  getLayout(roomId: string) {
    return this.layoutsRepository.findByRoomId(roomId);
  }

  getLayoutDevices(roomId: string) {
    return this.layoutDevicesRepository.findByRoomId(roomId);
  }

  getCameras(roomId: string) {
    return this.camerasRepository.findByRoomId(roomId);
  }

  getCameraRuntimeStates(roomId: string) {
    const cameras = this.getCameras(roomId);
    return cameras.map((camera) => {
      const state = this.runtimeCameraStateRepository.getOrCreate(camera.id);
      const unit = state.currentTargetUnitId ? this.tsdUnitsRepository.findById(state.currentTargetUnitId) : null;
      const preset = state.currentPresetId ? this.cameraPresetsRepository.findById(state.currentPresetId) : null;
      return {
        camera,
        state,
        unit,
        preset,
      };
    });
  }

  getCameraRuntimeLogs(cameraId: string, limit: number = 50) {
    const logs = this.runtimeCameraLogsRepository
      .listByCameraId(cameraId)
      .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
      .slice(0, limit);

    const camera = this.camerasRepository.findById(cameraId);
    return logs.map((log) => ({
      ...log,
      cameraName: camera?.name ?? cameraId,
    }));
  }

  getRuntimeEvents(
    roomId: string,
    options: {
      eventType?: string;
      unitId?: string;
      result?: string;
      from?: Date;
      to?: Date;
      limit: number;
      offset: number;
    },
  ): { items: RuntimeEventEntity[]; total: number } {
    const cameras = this.getCameras(roomId);
    const cameraIds = new Set(cameras.map((c) => c.id));

    let items: RuntimeEventEntity[] = this.runtimeCameraLogsRepository
      .list()
      .filter((log) => cameraIds.has(log.cameraId))
      .map((log) => {
        const unit = log.unitId ? this.tsdUnitsRepository.findById(log.unitId) : null;
        return {
          id: log.id,
          roomId: log.roomId,
          eventType: log.actionType,
          unitId: log.unitId,
          unitName: unit?.unitName ?? null,
          result: log.result,
          occurredAt: log.triggeredAt,
        };
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    if (options.eventType) {
      items = items.filter((item) => item.eventType === options.eventType);
    }
    if (options.unitId) {
      items = items.filter((item) => item.unitId === options.unitId);
    }
    if (options.result) {
      items = items.filter((item) => item.result === options.result);
    }
    if (options.from) {
      const fromIso = options.from.toISOString();
      items = items.filter((item) => item.occurredAt >= fromIso);
    }
    if (options.to) {
      const toIso = options.to.toISOString();
      items = items.filter((item) => item.occurredAt <= toIso);
    }

    const total = items.length;
    const paged = items.slice(options.offset, options.offset + options.limit);
    return { items: paged, total };
  }

  getActiveAlerts(roomId: string): RuntimeAlertEntity[] {
    const roomState = this.getRuntimeRoomState(roomId);
    const alerts: RuntimeAlertEntity[] = [];
    const now = new Date().toISOString();

    // SSE connection alert
    if (roomState.sseStatus !== 'CONNECTED') {
      const id = 'alert-sse-connection';
      alerts.push({
        id,
        roomId,
        severity: roomState.sseStatus === 'DISCONNECTED' ? 'CRITICAL' : 'WARNING',
        source: 'SSE',
        message:
          roomState.sseStatus === 'DISCONNECTED'
            ? 'Runtime connection is disconnected'
            : 'Runtime connection is reconnecting',
        status: this.ackedAlerts.has(id) ? 'ACKNOWLEDGED' : 'ACTIVE',
        createdAt: now,
        acknowledgedBy: this.ackedAlerts.get(id)?.acknowledgedBy ?? null,
        acknowledgedAt: this.ackedAlerts.get(id)?.acknowledgedAt ?? null,
      });
    }

    // Camera failed trigger alerts
    for (const entry of this.getCameraRuntimeStates(roomId)) {
      if (entry.state.lastResult === CameraTriggerResult.FAILED) {
        const id = `alert-camera-failed-${entry.camera.id}`;
        alerts.push({
          id,
          roomId,
          severity: 'ERROR',
          source: 'CAMERA',
          message: `Last camera trigger failed for ${entry.camera.name}`,
          status: this.ackedAlerts.has(id) ? 'ACKNOWLEDGED' : 'ACTIVE',
          createdAt: entry.state.updatedAt,
          acknowledgedBy: this.ackedAlerts.get(id)?.acknowledgedBy ?? null,
          acknowledgedAt: this.ackedAlerts.get(id)?.acknowledgedAt ?? null,
        });
      }
    }

    return alerts
      .filter((a) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }

  getAlertById(alertId: string): RuntimeAlertEntity | null {
    const room = this.getActiveRoom();
    const found = this.getActiveAlerts(room.id).find((a) => a.id === alertId);
    return found ?? null;
  }

  acknowledgeAlert(alertId: string, userId: string): RuntimeAlertEntity {
    const existing = this.getAlertById(alertId);
    const now = new Date().toISOString();
    this.ackedAlerts.set(alertId, { acknowledgedBy: userId, acknowledgedAt: now });
    return {
      ...(existing ?? {
        id: alertId,
        roomId: this.getActiveRoom().id,
        severity: 'INFO' as AlertSeverity,
        source: 'RUNTIME',
        message: 'Alert acknowledged',
        createdAt: now,
      }),
      status: 'ACKNOWLEDGED' as AlertStatus,
      acknowledgedBy: userId,
      acknowledgedAt: now,
    };
  }

  createRecoveryLog(
    roomId: string,
    action: 'RECONNECT' | 'RECOVER_STATE' | 'REFRESH_SNAPSHOT',
    result: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'TIMEOUT',
    userId: string,
    message?: string,
  ): RuntimeRecoveryLogEntity {
    const log: RuntimeRecoveryLogEntity = {
      id: randomUUID(),
      roomId,
      action,
      result,
      message: message ?? null,
      executedBy: userId,
      executedAt: new Date().toISOString(),
    };
    this.recoveryLogs.unshift(log);
    return log;
  }

  markRuntimeConnection(roomId: string, next: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED') {
    const current = this.runtimeRoomStateRepository.getByRoomId(roomId);
    this.runtimeRoomStateRepository.save({
      ...current,
      sseStatus: next,
      updatedAt: new Date().toISOString(),
    });
  }

  getUnitsWithMappings(roomId: string) {
    const units = this.getActiveUnits(roomId);
    const mappings = this.mappingsRepository.findByRoomId(roomId).filter((m) => m.isActive);
    return units.map((unit) => {
      const mapping = mappings.find((m) => m.unitId === unit.id) ?? null;
      const camera = mapping ? this.camerasRepository.findById(mapping.cameraId) : null;
      const preset = mapping ? this.cameraPresetsRepository.findById(mapping.presetId) : null;
      return {
        unit,
        mapping: mapping && camera && preset ? { mapping, camera, preset } : null,
      };
    });
  }

  toCameraStatus(cameraStatus: CameraStatus): 'ACTIVE' | 'INACTIVE' | 'OFFLINE' {
    return cameraStatus;
  }
}

function severityRank(severity: AlertSeverity): number {
  switch (severity) {
    case 'CRITICAL':
      return 4;
    case 'ERROR':
      return 3;
    case 'WARNING':
      return 2;
    case 'INFO':
    default:
      return 1;
  }
}

