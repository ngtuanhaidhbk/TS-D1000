import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { MapResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveMapService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getMapState(roomId: string): Promise<MapResponse> {
    const layout = this.repository.getLayout(roomId);
    const layoutDevices = this.repository.getLayoutDevices(roomId);
    const units = this.repository.getActiveUnits(roomId);

    const unitsMap = new Map(units.map((u) => [u.id, u]));

    const devices = layoutDevices.map((ld) => ({
      id: ld.id,
      type: ld.refType === 'TSD_UNIT' ? ('UNIT' as const) : ('CAMERA' as const),
      refType: ld.refType,
      refId: ld.refId,
      label: ld.iconLabel || '',
      posX: Number(ld.posX),
      posY: Number(ld.posY),
      runtimeState:
        ld.refType === 'TSD_UNIT' ? (unitsMap.get(ld.refId)?.runtimeState || 'OFFLINE') : undefined,
    }));

    return {
      roomId,
      layout: layout
        ? {
          layoutId: layout.id,
          fileName: layout.fileName,
          fileType: layout.fileType,
          width: layout.width,
          height: layout.height,
        }
        : null,
      devices,
    };
  }
}
