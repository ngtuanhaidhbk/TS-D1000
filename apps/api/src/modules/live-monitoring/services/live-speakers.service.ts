import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { ActiveSpeakerResponse, PendingRequestsResponse, UnitDetailResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveSpeakersService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getActiveSpeakers(roomId: string): Promise<ActiveSpeakerResponse[]> {
    const speakers = this.repository.getSpeakingUnits(roomId);
    const unitsWithMappings = this.repository.getUnitsWithMappings(roomId);

    return speakers.map((speaker) => {
      const mapping = unitsWithMappings.find((u) => u.unit.id === speaker.id)?.mapping ?? null;
      return {
        unitId: speaker.id,
        unitName: speaker.unitName,
        deviceType: speaker.deviceType,
        lastEventAt: speaker.lastEventAt,
        mappedCamera: mapping
          ? {
              cameraId: mapping.mapping.cameraId,
              cameraName: mapping.camera.name,
              presetId: mapping.mapping.presetId,
              presetName: mapping.preset.presetName,
            }
          : null,
      };
    });
  }

  async getPendingRequests(roomId: string): Promise<PendingRequestsResponse> {
    const runtimeState = this.repository.getRuntimeRoomState(roomId);
    const requests = this.repository.getPendingRequests(roomId);
    const queueUsed = runtimeState.operationMode === 'MANUAL';
    const unitsById = new Map(this.repository.getActiveUnits(roomId).map((u) => [u.id, u]));

    return {
      queueUsed,
      pendingRequestCount: requests.length,
      requests: requests.map((req) => ({
        requestId: req.id,
        unitId: req.unitId,
        unitName: unitsById.get(req.unitId)?.unitName ?? null,
        deviceType: unitsById.get(req.unitId)?.deviceType ?? 'DELEGATE',
        requestedAt: req.requestedAt,
      })),
    };
  }

  async getUnitDetail(roomId: string, unitId: string): Promise<UnitDetailResponse> {
    const unitsWithMappings = this.repository.getUnitsWithMappings(roomId);
    const record = unitsWithMappings.find((u) => u.unit.id === unitId) ?? null;
    if (!record) {
      throw new Error(`Unit not found: ${unitId}`);
    }
    const mapping = record.mapping;
    const hasWarning = !mapping && record.unit.runtimeState === 'SPEAKING';

    return {
      unitId: record.unit.id,
      unitName: record.unit.unitName,
      deviceType: record.unit.deviceType,
      runtimeState: record.unit.runtimeState,
      lastEventAt: record.unit.lastEventAt,
      mappedCamera: mapping
        ? {
            cameraId: mapping.mapping.cameraId,
            cameraName: mapping.camera.name,
            presetId: mapping.mapping.presetId,
            presetName: mapping.preset.presetName,
          }
        : null,
      hasWarning,
      warningMessage: hasWarning ? `Unit ${record.unit.unitName ?? unitId} has no active camera mapping` : undefined,
    };
  }
}
