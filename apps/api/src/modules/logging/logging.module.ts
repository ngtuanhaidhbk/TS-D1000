import { Module } from '@nestjs/common';

import { LiveMonitoringModule } from '../live-monitoring/live-monitoring.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { LoggingController } from './logging.controller';
import { LogArchiveService } from './services/log-archive.service';
import { LogQueryService } from './services/log-query.service';

@Module({
  imports: [SystemConfigModule, RuntimeModule, LiveMonitoringModule],
  controllers: [LoggingController],
  providers: [LogQueryService, LogArchiveService],
})
export class LoggingModule {}

