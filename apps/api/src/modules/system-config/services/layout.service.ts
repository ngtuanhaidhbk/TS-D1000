import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { LayoutAnnotationUpsertDto, SaveLayoutDevicesDto } from '../dto/layout.dto';
import { LayoutFileType, type LayoutAnnotationEntity, type LayoutDeviceEntity, type LayoutEntity } from '../entities/system-config.entities';
import { CamerasRepository, LayoutAnnotationsRepository, LayoutDevicesRepository, LayoutsRepository, RoomsRepository, TsdUnitsRepository } from '../repositories/system-config.repositories';
import { SystemConfigAuditService } from './system-config-audit.service';
import { nowIso, requireAdmin } from './system-config-utils';

@Injectable()
export class LayoutService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly layoutsRepository: LayoutsRepository,
    private readonly layoutDevicesRepository: LayoutDevicesRepository,
    private readonly layoutAnnotationsRepository: LayoutAnnotationsRepository,
    private readonly unitsRepository: TsdUnitsRepository,
    private readonly camerasRepository: CamerasRepository,
    private readonly auditService: SystemConfigAuditService,
  ) {}

  getLayout() {
    const room = this.roomsRepository.getActiveRoom();
    const layout = this.layoutsRepository.findByRoomId(room.id);
    if (!layout) {
      throw new AppException('LAYOUT_NOT_CONFIGURED', 'Layout is not configured', 422);
    }
    return this.toLayoutResponse(layout);
  }

  uploadLayout(file: Express.Multer.File | undefined, actor?: CurrentUser) {
    requireAdmin(actor);
    if (!file) {
      throw new AppException('VALIDATION_ERROR', 'Please select a file', 400);
    }

    const extension = file.originalname.split('.').pop()?.toUpperCase() ?? '';
    if (!Object.values(LayoutFileType).includes(extension as LayoutFileType)) {
      throw new AppException('INVALID_FILE_TYPE', 'Only PDF, JPG, JPEG are allowed', 400);
    }

    const room = this.roomsRepository.getActiveRoom();
    const existing = this.layoutsRepository.findByRoomId(room.id);
    const entity: LayoutEntity = {
      id: existing?.id ?? randomUUID(),
      roomId: room.id,
      fileName: file.originalname,
      filePath: `/storage/layouts/${file.originalname}`,
      fileType: extension as LayoutFileType,
      width: 1920,
      height: 1080,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    this.layoutsRepository.save(entity);
    this.auditService.record('UPLOAD_LAYOUT', actor!.id, 'LAYOUT', entity.id);
    return this.toLayoutResponse(entity);
  }

  listDevices() {
    const room = this.roomsRepository.getActiveRoom();
    return {
      items: this.layoutDevicesRepository.findByRoomId(room.id).map((item) => ({
        id: item.id,
        refType: item.refType,
        refId: item.refId,
        posX: item.posX,
        posY: item.posY,
        iconLabel: item.iconLabel,
      })),
    };
  }

  saveDevices(payload: SaveLayoutDevicesDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    const layout = this.layoutsRepository.findByRoomId(room.id);
    if (!layout) {
      throw new AppException('LAYOUT_NOT_CONFIGURED', 'Layout is not configured', 422);
    }

    const seen = new Set<string>();
    payload.devices.forEach((device) => {
      const key = `${device.refType}:${device.refId}`;
      if (seen.has(key)) {
        throw new AppException('DUPLICATE_LAYOUT_DEVICE', 'Duplicate layout device in payload', 400);
      }
      seen.add(key);

      if (device.refType === 'TSD_UNIT' && !this.unitsRepository.findById(device.refId)) {
        throw new AppException('REF_NOT_FOUND', 'Referenced unit does not exist', 404);
      }
      if (device.refType === 'CAMERA' && !this.camerasRepository.findById(device.refId)) {
        throw new AppException('REF_NOT_FOUND', 'Referenced camera does not exist', 404);
      }
    });

    payload.devices.forEach((device) => {
      const existing = this.layoutDevicesRepository.findByRoomAndRef(room.id, device.refType, device.refId);
      const entity: LayoutDeviceEntity = {
        id: existing?.id ?? randomUUID(),
        roomId: room.id,
        refType: device.refType,
        refId: device.refId,
        posX: device.posX,
        posY: device.posY,
        iconLabel: device.iconLabel ?? null,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      this.layoutDevicesRepository.save(entity);
    });

    this.auditService.record('SAVE_LAYOUT_DEVICES', actor!.id, 'LAYOUT', layout.id);
    return this.listDevices();
  }

  listAnnotations() {
    const room = this.roomsRepository.getActiveRoom();
    return {
      items: this.layoutAnnotationsRepository.findByRoomId(room.id).map((item) => ({
        id: item.id,
        text: item.text,
        posX: item.posX,
        posY: item.posY,
      })),
    };
  }

  createAnnotation(payload: LayoutAnnotationUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const room = this.roomsRepository.getActiveRoom();
    const layout = this.layoutsRepository.findByRoomId(room.id);
    if (!layout) {
      throw new AppException('LAYOUT_NOT_CONFIGURED', 'Layout is not configured', 422);
    }
    const annotation: LayoutAnnotationEntity = {
      id: randomUUID(),
      roomId: room.id,
      text: payload.text,
      posX: payload.posX,
      posY: payload.posY,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.layoutAnnotationsRepository.save(annotation);
    this.auditService.record('CREATE_LAYOUT_ANNOTATION', actor!.id, 'LAYOUT_ANNOTATION', annotation.id);
    return {
      id: annotation.id,
      text: annotation.text,
      posX: annotation.posX,
      posY: annotation.posY,
    };
  }

  updateAnnotation(id: string, payload: LayoutAnnotationUpsertDto, actor?: CurrentUser) {
    requireAdmin(actor);
    const annotation = this.layoutAnnotationsRepository.findById(id);
    if (!annotation) {
      throw new AppException('ANNOTATION_NOT_FOUND', 'Annotation not found', 404);
    }
    const updated = this.layoutAnnotationsRepository.save({
      ...annotation,
      text: payload.text,
      posX: payload.posX,
      posY: payload.posY,
      updatedAt: nowIso(),
    });
    this.auditService.record('UPDATE_LAYOUT_ANNOTATION', actor!.id, 'LAYOUT_ANNOTATION', updated.id);
    return {
      id: updated.id,
      text: updated.text,
      posX: updated.posX,
      posY: updated.posY,
    };
  }

  private toLayoutResponse(layout: LayoutEntity) {
    return {
      id: layout.id,
      fileName: layout.fileName,
      filePath: layout.filePath,
      fileType: layout.fileType,
      width: layout.width,
      height: layout.height,
    };
  }
}
