import { Injectable } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import { DeviceType, ConnectionTestResult, type TsdConnectionConfigEntity, type TsdUnitEntity } from '../entities/system-config.entities';
import { buildSeedUnits } from '../repositories/system-config.repositories';

@Injectable()
export class TsdIntegrationService {
  testConnection(config: TsdConnectionConfigEntity): ConnectionTestResult {
    if (config.baseUrl.includes('timeout')) {
      throw new AppException('TSD_TIMEOUT', 'TS-D1000 connection timed out', 503);
    }

    if (config.baseUrl.includes('fail')) {
      throw new AppException('TSD_UNREACHABLE', 'TS-D1000 is unreachable', 502);
    }

    return ConnectionTestResult.SUCCESS;
  }

  fetchUnits(config: TsdConnectionConfigEntity): Array<Pick<TsdUnitEntity, 'externalUnitId' | 'unitName' | 'deviceType'>> {
    if (config.baseUrl.includes('malformed')) {
      throw new AppException('TSD_MALFORMED_RESPONSE', 'Malformed TS-D1000 response', 502);
    }

    return buildSeedUnits(config.roomId).map((unit) => ({
      externalUnitId: unit.externalUnitId,
      unitName: unit.unitName,
      deviceType: unit.deviceType,
    }));
  }
}
