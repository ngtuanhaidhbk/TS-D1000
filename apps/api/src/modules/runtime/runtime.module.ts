import { Module } from '@nestjs/common';

import { SystemConfigModule } from '../system-config/system-config.module';
import { RuntimeController } from './runtime.controller';
import { RuntimeCameraLogsRepository, RuntimeCameraStateRepository } from './repositories/runtime-camera.repositories';
import { RuntimeRoomStateRepository, SpeakingRequestsRepository } from './repositories/runtime.repositories';
import { RuntimeCameraMonitoringService } from './services/runtime-camera-monitoring.service';
import { ManualRequestsService } from './services/manual-requests.service';
import { RuntimeCameraControlService } from './services/runtime-camera-control.service';
import { RuntimeCameraTriggerService } from './services/runtime-camera-trigger.service';
import { RuntimeModeService } from './services/runtime-mode.service';
import { RuntimeSnapshotService } from './services/runtime-snapshot.service';

@Module({
  imports: [SystemConfigModule],
  controllers: [RuntimeController],
  providers: [
    RuntimeRoomStateRepository,
    SpeakingRequestsRepository,
    RuntimeCameraStateRepository,
    RuntimeCameraLogsRepository,
    RuntimeSnapshotService,
    RuntimeModeService,
    ManualRequestsService,
    RuntimeCameraControlService,
    RuntimeCameraMonitoringService,
    RuntimeCameraTriggerService,
  ],
  exports: [
    RuntimeRoomStateRepository,
    SpeakingRequestsRepository,
    RuntimeCameraStateRepository,
    RuntimeCameraLogsRepository,
    RuntimeSnapshotService,
  ],
})
export class RuntimeModule {}
