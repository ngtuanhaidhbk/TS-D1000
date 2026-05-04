import { Module } from '@nestjs/common';

import { LiveMonitoringController } from './live-monitoring.controller';
import { LiveMonitoringRepository } from './repositories/live-monitoring.repository';
import { LiveDashboardService } from './services/live-dashboard.service';
import { LiveSnapshotService } from './services/live-snapshot.service';
import { LiveMapService } from './services/live-map.service';
import { LiveSpeakersService } from './services/live-speakers.service';
import { LiveCamerasService } from './services/live-cameras.service';
import { LiveEventsService } from './services/live-events.service';
import { LiveAlertsService } from './services/live-alerts.service';
import { LiveRuntimeStatusService } from './services/live-runtime-status.service';
import { LiveRecoveryService } from './services/live-recovery.service';
import { SystemConfigModule } from '../system-config/system-config.module';
import { RuntimeModule } from '../runtime/runtime.module';

@Module({
  imports: [SystemConfigModule, RuntimeModule],
  controllers: [LiveMonitoringController],
  providers: [
    LiveMonitoringRepository,
    LiveDashboardService,
    LiveSnapshotService,
    LiveMapService,
    LiveSpeakersService,
    LiveCamerasService,
    LiveEventsService,
    LiveAlertsService,
    LiveRuntimeStatusService,
    LiveRecoveryService,
  ],
  exports: [LiveMonitoringRepository],
})
export class LiveMonitoringModule {}
