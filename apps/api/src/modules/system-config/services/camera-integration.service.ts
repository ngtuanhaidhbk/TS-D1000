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
    this.assertSupported(camera);
    this.simulateIntegration(camera);

    const hasStream = Boolean(camera.rtspUrl);
    const manualControl = true;
    const positionQuery = false;
    return {
      result: hasStream ? ConnectionTestResult.SUCCESS : ConnectionTestResult.PARTIAL,
      capabilities: {
        ptz: true,
        preset: true,
        stream: hasStream,
        manualControl,
        positionQuery,
      },
    };
  }

  recallPreset(camera: CameraEntity, presetCode: string) {
    this.assertSupported(camera);
    if (!camera.capabilityPreset) {
      throw new AppException('PRESET_NOT_SUPPORTED', 'Camera preset is not supported', 422);
    }
    this.simulateIntegration(camera);
    return { result: 'SUCCESS' as const, presetCode };
  }

  move(camera: CameraEntity, action: string, speed: number | null) {
    this.assertSupported(camera);
    if (!camera.capabilityPtz) {
      throw new AppException('PTZ_NOT_SUPPORTED', 'Camera PTZ is not supported', 422);
    }
    this.simulateIntegration(camera);
    return { result: 'SUCCESS' as const, action, speed };
  }

  stop(camera: CameraEntity) {
    this.assertSupported(camera);
    if (!camera.capabilityPtz) {
      throw new AppException('PTZ_NOT_SUPPORTED', 'Camera PTZ is not supported', 422);
    }
    this.simulateIntegration(camera);
    return { result: 'SUCCESS' as const };
  }

  private assertSupported(camera: CameraEntity) {
    if (
      camera.protocol !== CameraProtocol.ONVIF &&
      camera.protocol !== CameraProtocol.VISCA &&
      camera.protocol !== CameraProtocol.AXIS_VAPIX &&
      camera.protocol !== CameraProtocol.VENDOR_API
    ) {
      throw new AppException('CAMERA_ADAPTER_UNSUPPORTED', 'Unsupported camera adapter', 422);
    }
  }

  private simulateIntegration(camera: CameraEntity) {
    if (camera.ipAddress.includes('timeout')) {
      throw new AppException('CAMERA_TIMEOUT', 'Camera connection timed out', 503);
    }
    if (camera.ipAddress.includes('fail')) {
      throw new AppException('CAMERA_CONNECTION_FAILED', 'Camera connection failed', 502);
    }
  }
}
