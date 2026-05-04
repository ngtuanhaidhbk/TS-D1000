import { Module } from '@nestjs/common';

import { SystemConfigController } from './system-config.controller';
import { CameraConfigService } from './services/camera-config.service';
import { CameraIntegrationService } from './services/camera-integration.service';
import { LayoutService } from './services/layout.service';
import { MappingService } from './services/mapping.service';
import { OperationModeService } from './services/operation-mode.service';
import { SystemConfigAuditService } from './services/system-config-audit.service';
import { SystemConfigOverviewService } from './services/system-config-overview.service';
import { SystemReadinessService } from './services/system-readiness.service';
import { TsdConfigService } from './services/tsd-config.service';
import { TsdIntegrationService } from './services/tsd-integration.service';
import {
  CameraPresetsRepository,
  CamerasRepository,
  LayoutAnnotationsRepository,
  LayoutDevicesRepository,
  LayoutsRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
  TsdConnectionConfigsRepository,
  TsdUnitsRepository,
} from './repositories/system-config.repositories';

@Module({
  controllers: [SystemConfigController],
  providers: [
    RoomsRepository,
    TsdConnectionConfigsRepository,
    TsdUnitsRepository,
    CamerasRepository,
    CameraPresetsRepository,
    LayoutsRepository,
    LayoutDevicesRepository,
    LayoutAnnotationsRepository,
    MicCameraMappingsRepository,
    SystemConfigAuditService,
    TsdIntegrationService,
    CameraIntegrationService,
    SystemConfigOverviewService,
    TsdConfigService,
    CameraConfigService,
    LayoutService,
    MappingService,
    OperationModeService,
    SystemReadinessService,
  ],
  exports: [
    RoomsRepository,
    TsdUnitsRepository,
    CamerasRepository,
    CameraPresetsRepository,
    MicCameraMappingsRepository,
    CameraIntegrationService,
    SystemConfigAuditService,
  ],
})
export class SystemConfigModule {}
