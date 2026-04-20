import { Injectable, Logger } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { CameraUpsertDto, DeactivateCameraDto, PresetUpsertDto } from '../dto/camera.dto';
import {
  CameraStatus,
  type CameraEntity,
  type CameraPresetEntity,
} from '../entities/system-config.entities';
import {
  CameraPresetsRepository,
  CamerasRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
} from '../repositories/system-config.repositories';
import { CameraIntegrationService } from './camera-integration.service';
import { SystemConfigAuditService } from './system-config-audit.service';
import { newId, nowIso, paginateAndFilter, requireAdmin } from './system-config-utils';

@Injectable()
export class CameraConfigService {
  private readonly logger = new Logger(CameraConfigService.name);

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly cameraPresetsRepository: CameraPresetsRepository,
    private readonly mappingsRepository: MicCameraMappingsRepository,
    private readonly cameraIntegrationService: CameraIntegrationService,
    private readonly auditService: SystemConfigAuditService,
  ) {}

  listCameras(query: Record<string, string | undefined>) {
    const room = this.roomsRepository.getActiveRoom();
    let items = this.camerasRepository.findByRoomId(room.id);
    const search = query.search?.trim().toLowerCase();
    if (search) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) || item.ipAddress.toLowerCase().includes(search),
      );
    }
    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }
    if (query.protocol) {
      items = items.filter((item) => item.protocol === query.protocol);
    }

    return paginateAndFilter(items.map((item) => this.toCameraResponse(item)), {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 10,
    });
  }

  getCamera(id: string) {
    const camera = this.mustFindCamera(id);
    return this.toCameraResponse(camera);
  }

  createCamera(payload: CameraUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    if (this.camerasRepository.countActiveByRoomId(room.id) >= 4) {
      throw new AppException('CAMERA_LIMIT_REACHED', 'Maximum 4 active cameras allowed', 422);
    }
    const duplicate = this.camerasRepository.findByRoomAndEndpoint(
      room.id,
      payload.ipAddress,
      payload.port ?? null,
    );
    if (duplicate) {
      throw new AppException('CAMERA_DUPLICATE_ENDPOINT', 'Camera endpoint already exists', 409);
    }

    const now = nowIso();
    const camera = this.camerasRepository.save({
      id: newId(),
      roomId: room.id,
      name: payload.name,
      protocol: payload.protocol,
      ipAddress: payload.ipAddress,
      port: payload.port ?? null,
      username: payload.username?.trim() || null,
      passwordEncrypted: payload.password?.trim() || null,
      rtspUrl: payload.rtspUrl ?? null,
      vendor: payload.vendor?.trim() || null,
      model: payload.model?.trim() || null,
      status: CameraStatus.ACTIVE,
      capabilityPtz: false,
      capabilityPreset: false,
      capabilityStream: false,
      lastTestResult: null,
      lastTestAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.auditService.record('CREATE_CAMERA', actor!.id, 'CAMERA', camera.id);
    return this.toCameraResponse(camera);
  }

  updateCamera(id: string, payload: CameraUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const camera = this.mustFindCamera(id);
    const duplicate = this.camerasRepository.findByRoomAndEndpoint(
      camera.roomId,
      payload.ipAddress,
      payload.port ?? null,
    );
    if (duplicate && duplicate.id !== camera.id) {
      throw new AppException('CAMERA_DUPLICATE_ENDPOINT', 'Camera endpoint already exists', 409);
    }

    const updated = this.camerasRepository.save({
      ...camera,
      name: payload.name,
      protocol: payload.protocol,
      ipAddress: payload.ipAddress,
      port: payload.port ?? null,
      username: payload.username?.trim() || null,
      passwordEncrypted: payload.password?.trim() || camera.passwordEncrypted,
      rtspUrl: payload.rtspUrl ?? null,
      vendor: payload.vendor?.trim() || null,
      model: payload.model?.trim() || null,
      updatedAt: nowIso(),
    });

    this.auditService.record('UPDATE_CAMERA', actor!.id, 'CAMERA', updated.id);
    return this.toCameraResponse(updated);
  }

  deactivateCamera(id: string, _payload: DeactivateCameraDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const camera = this.mustFindCamera(id);
    if (camera.status === CameraStatus.INACTIVE) {
      throw new AppException('CAMERA_ALREADY_INACTIVE', 'Camera is already inactive', 409);
    }
    if (this.mappingsRepository.findActiveByCameraId(camera.id).length > 0) {
      throw new AppException(
        'CAMERA_ALREADY_IN_USE',
        'Camera is referenced by active mappings',
        422,
      );
    }

    const updated = this.camerasRepository.save({
      ...camera,
      status: CameraStatus.INACTIVE,
      updatedAt: nowIso(),
    });
    this.auditService.record('DEACTIVATE_CAMERA', actor!.id, 'CAMERA', updated.id);
    return this.toCameraResponse(updated);
  }

  testCamera(id: string, actor?: CurrentUser) {
    requireAdmin(actor);
    const camera = this.mustFindCamera(id);
    try {
      const result = this.cameraIntegrationService.testConnection(camera);
      const updated = this.camerasRepository.save({
        ...camera,
        lastTestResult: result.result,
        lastTestAt: nowIso(),
        capabilityPtz: result.capabilities.ptz,
        capabilityPreset: result.capabilities.preset,
        capabilityStream: result.capabilities.stream,
        updatedAt: nowIso(),
      });
      this.auditService.record('TEST_CAMERA', actor!.id, 'CAMERA', updated.id);
      return {
        result: updated.lastTestResult,
        testedAt: updated.lastTestAt,
        capabilities: {
          ptz: updated.capabilityPtz,
          preset: updated.capabilityPreset,
          stream: updated.capabilityStream,
        },
      };
    } catch (error) {
      this.logger.error('Camera connection test failed');
      throw error;
    }
  }

  listPresets(cameraId: string) {
    this.mustFindCamera(cameraId);
    return {
      items: this.cameraPresetsRepository.findByCameraId(cameraId).map((preset) => ({
        id: preset.id,
        cameraId: preset.cameraId,
        presetCode: preset.presetCode,
        presetName: preset.presetName,
      })),
    };
  }

  createPreset(cameraId: string, payload: PresetUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const camera = this.mustFindCamera(cameraId);
    if (!camera.capabilityPreset && camera.lastTestResult === 'SUCCESS') {
      throw new AppException('PRESET_NOT_SUPPORTED', 'Camera preset is not supported', 422);
    }
    if (this.cameraPresetsRepository.findByCameraAndCode(cameraId, payload.presetCode)) {
      throw new AppException('PRESET_CODE_EXISTS', 'Preset code already exists', 409);
    }
    const preset: CameraPresetEntity = {
      id: newId(),
      cameraId,
      presetCode: payload.presetCode,
      presetName: payload.presetName?.trim() || null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.cameraPresetsRepository.save(preset);
    this.auditService.record('CREATE_PRESET', actor!.id, 'CAMERA_PRESET', preset.id);
    return this.toPresetResponse(preset);
  }

  updatePreset(id: string, payload: PresetUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const preset = this.cameraPresetsRepository.findById(id);
    if (!preset) {
      throw new AppException('PRESET_NOT_FOUND', 'Preset not found', 404);
    }
    const duplicate = this.cameraPresetsRepository.findByCameraAndCode(preset.cameraId, payload.presetCode);
    if (duplicate && duplicate.id !== id) {
      throw new AppException('PRESET_CODE_EXISTS', 'Preset code already exists', 409);
    }
    const updated = this.cameraPresetsRepository.save({
      ...preset,
      presetCode: payload.presetCode,
      presetName: payload.presetName?.trim() || null,
      updatedAt: nowIso(),
    });
    this.auditService.record('UPDATE_PRESET', actor!.id, 'CAMERA_PRESET', updated.id);
    return this.toPresetResponse(updated);
  }

  private mustFindCamera(id: string) {
    const camera = this.camerasRepository.findById(id);
    if (!camera) {
      throw new AppException('CAMERA_NOT_FOUND', 'Camera not found', 404);
    }
    return camera;
  }

  private toCameraResponse(camera: CameraEntity) {
    return {
      id: camera.id,
      name: camera.name,
      protocol: camera.protocol,
      ipAddress: camera.ipAddress,
      port: camera.port,
      rtspUrl: camera.rtspUrl,
      vendor: camera.vendor,
      model: camera.model,
      status: camera.status,
      capabilities: {
        ptz: camera.capabilityPtz,
        preset: camera.capabilityPreset,
        stream: camera.capabilityStream,
      },
      lastTestResult: camera.lastTestResult,
      lastTestAt: camera.lastTestAt,
    };
  }

  private toPresetResponse(preset: CameraPresetEntity) {
    return {
      id: preset.id,
      cameraId: preset.cameraId,
      presetCode: preset.presetCode,
      presetName: preset.presetName,
    };
  }
}
