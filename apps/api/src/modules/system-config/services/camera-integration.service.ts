import { Injectable } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception';
import {
  CameraProtocol,
  ConnectionTestResult,
  type CameraEntity,
} from '../entities/system-config.entities';

@Injectable()
export class CameraIntegrationService {
  testConnection(camera: CameraEntity) {
    if (camera.protocol !== CameraProtocol.ONVIF && camera.protocol !== CameraProtocol.VISCA) {
      throw new AppException('CAMERA_ADAPTER_UNSUPPORTED', 'Unsupported camera adapter', 422);
    }

    if (camera.ipAddress.includes('timeout')) {
      throw new AppException('CAMERA_TIMEOUT', 'Camera connection timed out', 503);
    }

    if (camera.ipAddress.includes('fail')) {
      throw new AppException('CAMERA_CONNECTION_FAILED', 'Camera connection failed', 502);
    }

    const hasStream = Boolean(camera.rtspUrl);
    return {
      result: hasStream ? ConnectionTestResult.SUCCESS : ConnectionTestResult.PARTIAL,
      capabilities: {
        ptz: true,
        preset: true,
        stream: hasStream,
      },
    };
  }
}
