import { Injectable, Logger } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { TsdConfigUpsertDto } from '../dto/tsd-config.dto';
import {
  ConnectionTestResult,
  DeviceType,
  UnitRuntimeState,
  type TsdUnitEntity,
} from '../entities/system-config.entities';
import {
  RoomsRepository,
  TsdConnectionConfigsRepository,
  TsdUnitsRepository,
} from '../repositories/system-config.repositories';
import { SystemConfigAuditService } from './system-config-audit.service';
import { newId, nowIso, paginateAndFilter, requireAdmin } from './system-config-utils';
import { TsdIntegrationService } from './tsd-integration.service';

@Injectable()
export class TsdConfigService {
  private readonly logger = new Logger(TsdConfigService.name);

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly tsdConfigsRepository: TsdConnectionConfigsRepository,
    private readonly tsdUnitsRepository: TsdUnitsRepository,
    private readonly auditService: SystemConfigAuditService,
    private readonly integrationService: TsdIntegrationService,
  ) {}

  getActiveConfig() {
    const room = this.roomsRepository.getActiveRoom();
    const config = this.tsdConfigsRepository.findActiveByRoomId(room.id);
    if (!config) {
      throw new AppException('CONFIG_NOT_FOUND', 'TS-D1000 configuration not found', 404);
    }
    return this.toResponse(config);
  }

  createConfig(payload: TsdConfigUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    if (this.tsdConfigsRepository.findActiveByRoomId(room.id)) {
      throw new AppException('TSD_CONFIG_EXISTS', 'TS-D1000 configuration already exists', 409);
    }

    const now = nowIso();
    const config = this.tsdConfigsRepository.save({
      id: newId(),
      roomId: room.id,
      baseUrl: payload.baseUrl,
      username: payload.username?.trim() || null,
      passwordEncrypted: payload.password?.trim() || null,
      sseEndpoint: payload.sseEndpoint?.trim() || '/api/event',
      isActive: true,
      lastTestResult: null,
      lastTestAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.auditService.record('CREATE_TSD_CONFIG', actor!.id, 'TSD_CONFIG', config.id, {
      roomId: room.id,
      baseUrl: config.baseUrl,
    });

    return this.toResponse(config);
  }

  updateConfig(id: string, payload: TsdConfigUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const config = this.tsdConfigsRepository.findById(id);
    if (!config) {
      throw new AppException('CONFIG_NOT_FOUND', 'TS-D1000 configuration not found', 404);
    }

    const updated = this.tsdConfigsRepository.save({
      ...config,
      baseUrl: payload.baseUrl,
      username: payload.username?.trim() || null,
      passwordEncrypted: payload.password?.trim() || config.passwordEncrypted,
      sseEndpoint: payload.sseEndpoint?.trim() || config.sseEndpoint,
      updatedAt: nowIso(),
    });

    this.auditService.record('UPDATE_TSD_CONFIG', actor!.id, 'TSD_CONFIG', updated.id);
    return this.toResponse(updated);
  }

  testConfig(id: string, actor?: CurrentUser) {
    requireAdmin(actor);
    const config = this.tsdConfigsRepository.findById(id);
    if (!config) {
      throw new AppException('CONFIG_NOT_FOUND', 'TS-D1000 configuration not found', 404);
    }

    try {
      const result = this.integrationService.testConnection(config);
      const testedAt = nowIso();
      this.tsdConfigsRepository.save({
        ...config,
        lastTestResult: result,
        lastTestAt: testedAt,
        updatedAt: testedAt,
      });
      this.auditService.record('TEST_TSD_CONFIG', actor!.id, 'TSD_CONFIG', config.id);
      return { result, testedAt };
    } catch (error) {
      const testedAt = nowIso();
      this.tsdConfigsRepository.save({
        ...config,
        lastTestResult: ConnectionTestResult.FAILED,
        lastTestAt: testedAt,
        updatedAt: testedAt,
      });
      this.logger.error('TS-D1000 connection test failed');
      throw error;
    }
  }

  syncUnits(id: string, actor?: CurrentUser) {
    requireAdmin(actor);
    const config = this.tsdConfigsRepository.findById(id);
    if (!config) {
      throw new AppException('CONFIG_NOT_FOUND', 'TS-D1000 configuration not found', 404);
    }

    const rows = this.integrationService.fetchUnits(config);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    rows.forEach((row) => {
      if (!row.externalUnitId) {
        skipped += 1;
        this.logger.warn('Skipped TS-D unit row with missing externalUnitId');
        return;
      }

      const existing = this.tsdUnitsRepository.findByRoomAndExternalUnitId(config.roomId, row.externalUnitId);
      if (existing) {
        this.tsdUnitsRepository.save({
          ...existing,
          unitName: row.unitName ?? existing.unitName,
          deviceType: row.deviceType,
          updatedAt: nowIso(),
        });
        updated += 1;
        return;
      }

      const entity: TsdUnitEntity = {
        id: newId(),
        roomId: config.roomId,
        externalUnitId: row.externalUnitId,
        unitName: row.unitName ?? null,
        deviceType: row.deviceType ?? DeviceType.DELEGATE,
        runtimeState: UnitRuntimeState.IDLE,
        isConnected: true,
        lastEventAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.tsdUnitsRepository.save(entity);
      created += 1;
    });

    this.auditService.record('SYNC_TSD_UNITS', actor!.id, 'TSD_CONFIG', config.id, {
      created,
      updated,
      skipped,
    });

    return {
      synced: created + updated + skipped,
      created,
      updated,
      skipped,
    };
  }

  listUnits(id: string, query: Record<string, string | undefined>) {
    const config = this.tsdConfigsRepository.findById(id);
    if (!config) {
      throw new AppException('CONFIG_NOT_FOUND', 'TS-D1000 configuration not found', 404);
    }

    let items = this.tsdUnitsRepository.findByRoomId(config.roomId);
    const search = query.search?.trim().toLowerCase();
    const deviceType = query.deviceType?.trim();

    if (search) {
      items = items.filter(
        (item) =>
          item.externalUnitId.toLowerCase().includes(search) ||
          (item.unitName ?? '').toLowerCase().includes(search),
      );
    }

    if (deviceType) {
      items = items.filter((item) => item.deviceType === deviceType);
    }

    const paged = paginateAndFilter(
      items.map((item) => ({
        id: item.id,
        externalUnitId: item.externalUnitId,
        unitName: item.unitName,
        deviceType: item.deviceType,
        runtimeState: item.runtimeState,
        isConnected: item.isConnected,
        lastEventAt: item.lastEventAt,
      })),
      {
        page: query.page ? Number(query.page) : 1,
        pageSize: query.pageSize ? Number(query.pageSize) : 20,
      },
    );

    return paged;
  }

  private toResponse(config: ReturnType<TsdConnectionConfigsRepository['findById']> extends infer T ? Exclude<T, null> : never) {
    return {
      id: config.id,
      baseUrl: config.baseUrl,
      username: config.username,
      sseEndpoint: config.sseEndpoint,
      isActive: config.isActive,
      lastTestResult: config.lastTestResult,
      lastTestAt: config.lastTestAt,
    };
  }
}
