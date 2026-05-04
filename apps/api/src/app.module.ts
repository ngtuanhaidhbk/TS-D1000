import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { UsersModule } from './modules/users/users.module';
import { LiveMonitoringModule } from './modules/live-monitoring/live-monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    UsersModule,
    AuthModule,
    HealthModule,
    SystemConfigModule,
    RuntimeModule,
    LiveMonitoringModule,
  ],
})
export class AppModule {}
