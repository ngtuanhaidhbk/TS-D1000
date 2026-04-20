import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { CreateMappingDto, UpdateMappingDto } from '../dto/mapping.dto';
import { CameraStatus, type MicCameraMappingEntity } from '../entities/system-config.entities';
import { CameraPresetsRepository, CamerasRepository, MicCameraMappingsRepository, RoomsRepository, TsdUnitsRepository } from '../repositories/system-config.repositories';
import { SystemConfigAuditService } from './system-config-audit.service';
import { nowIso, paginateAndFilter, requireAdmin } from './system-config-utils';

@Injectable()
export class MappingService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly unitsRepository: TsdUnitsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly presetsRepository: CameraPresetsRepository,
    private readonly mappingsRepository: MicCameraMappingsRepository,
    private readonly auditService: SystemConfigAuditService,
  ) {}

  listMappings(query: Record<string, string | undefined>) {
    const room = this.roomsRepository.getActiveRoom();
    let items = this.mappingsRepository.findByRoomId(room.id);
    const search = query.search?.trim().toLowerCase();

    if (query.cameraId) {
      items = items.filter((item) => item.cameraId === query.cameraId);
    }
    if (query.isActive !== undefined) {
      items = items.filter((item) => String(item.isActive) === query.isActive);
    }
    if (query.deviceType) {
      items = items.filter((item) => this.unitsRepository.findById(item.unitId)?.deviceType === query.deviceType);
    }
    if (search) {
      items = items.filter((item) => {
        const unit = this.unitsRepository.findById(item.unitId);
        const camera = this.camerasRepository.findById(item.cameraId);
        const preset = this.presetsRepository.findById(item.presetId);
        return [unit?.externalUnitId, unit?.unitName, camera?.name, preset?.presetCode, preset?.presetName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
    }

    return paginateAndFilter(items.map((item) => this.toResponse(item)), {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }

  createMapping(payload: CreateMappingDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    const unit = this.unitsRepository.findById(payload.unitId);
    const camera = this.camerasRepository.findById(payload.cameraId);
    const preset = this.presetsRepository.findById(payload.presetId);
    if (!unit) throw new AppException('UNIT_NOT_FOUND', 'Unit not found', 404);
    if (!camera) throw new AppException('CAMERA_NOT_FOUND', 'Camera not found', 404);
    if (!preset) throw new AppException('PRESET_NOT_FOUND', 'Preset not found', 404);
    this.validateRelation(room.id, unit.roomId, camera.roomId, preset.cameraId, camera.id, camera.status);

    if (this.mappingsRepository.findActiveByUnitId(unit.id)) {
      throw new AppException('ACTIVE_MAPPING_EXISTS', 'Unit already has an active mapping', 409);
    }

    const mapping: MicCameraMappingEntity = {
      id: randomUUID(),
      roomId: room.id,
      unitId: unit.id,
      cameraId: camera.id,
      presetId: preset.id,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.mappingsRepository.save(mapping);
    this.auditService.record('CREATE_MAPPING', actor!.id, 'MIC_CAMERA_MAPPING', mapping.id);
    return this.toResponse(mapping);
  }

  updateMapping(id: string, payload: UpdateMappingDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const mapping = this.mappingsRepository.findById(id);
    if (!mapping) {
      throw new AppException('MAPPING_NOT_FOUND', 'Mapping not found', 404);
    }
    const unit = this.unitsRepository.findById(mapping.unitId);
    const camera = this.camerasRepository.findById(payload.cameraId);
    const preset = this.presetsRepository.findById(payload.presetId);
    if (!unit) throw new AppException('UNIT_NOT_FOUND', 'Unit not found', 404);
    if (!camera) throw new AppException('CAMERA_NOT_FOUND', 'Camera not found', 404);
    if (!preset) throw new AppException('PRESET_NOT_FOUND', 'Preset not found', 404);
    this.validateRelation(mapping.roomId, unit.roomId, camera.roomId, preset.cameraId, camera.id, camera.status);

    const existingActive = this.mappingsRepository.findActiveByUnitId(unit.id);
    if (payload.isActive && existingActive && existingActive.id !== mapping.id) {
      throw new AppException('ACTIVE_MAPPING_EXISTS', 'Unit already has an active mapping', 409);
    }

    const updated = this.mappingsRepository.save({
      ...mapping,
      cameraId: camera.id,
      presetId: preset.id,
      isActive: payload.isActive,
      updatedAt: nowIso(),
    });
    this.auditService.record('UPDATE_MAPPING', actor!.id, 'MIC_CAMERA_MAPPING', updated.id);
    return this.toResponse(updated);
  }

  private validateRelation(roomId: string, unitRoomId: string, cameraRoomId: string, presetCameraId: string, cameraId: string, cameraStatus: CameraStatus) {
    if (roomId !== unitRoomId || roomId !== cameraRoomId) {
      throw new AppException('CROSS_ROOM_MAPPING_INVALID', 'Mapping entities must belong to same room', 422);
    }
    if (presetCameraId !== cameraId) {
      throw new AppException('PRESET_CAMERA_MISMATCH', 'Selected preset does not belong to selected camera', 422);
    }
    if (cameraStatus !== CameraStatus.ACTIVE) {
      throw new AppException('CAMERA_INACTIVE', 'Selected camera is inactive', 422);
    }
  }

  private toResponse(mapping: MicCameraMappingEntity) {
    const unit = this.unitsRepository.findById(mapping.unitId)!;
    const camera = this.camerasRepository.findById(mapping.cameraId)!;
    const preset = this.presetsRepository.findById(mapping.presetId)!;
    return {
      id: mapping.id,
      unit: {
        id: unit.id,
        externalUnitId: unit.externalUnitId,
        unitName: unit.unitName,
        deviceType: unit.deviceType,
      },
      camera: {
        id: camera.id,
        name: camera.name,
        status: camera.status,
      },
      preset: {
        id: preset.id,
        presetCode: preset.presetCode,
        presetName: preset.presetName,
      },
      isActive: mapping.isActive,
    };
  }
}
