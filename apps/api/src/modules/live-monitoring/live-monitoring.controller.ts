import { Controller, Get, Post, Param, Query, Body, HttpCode, BadRequestException } from '@nestjs/common';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import type { CurrentUser } from '../../common/types/current-user.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { LiveDashboardService } from './services/live-dashboard.service';
import { LiveSnapshotService } from './services/live-snapshot.service';
import { LiveMapService } from './services/live-map.service';
import { LiveSpeakersService } from './services/live-speakers.service';
import { LiveCamerasService } from './services/live-cameras.service';
import { LiveEventsService } from './services/live-events.service';
import { LiveAlertsService } from './services/live-alerts.service';
import { LiveRuntimeStatusService } from './services/live-runtime-status.service';
import { LiveRecoveryService } from './services/live-recovery.service';
import {
  EventFeedQueryDto,
  CameraTriggerQueryDto,
  AlertQueryDto,
  RuntimeRecoveryRequestDto,
} from './dto/live-monitoring.dto';
import { LiveMonitoringRepository } from './repositories/live-monitoring.repository';

@Controller('live')
export class LiveMonitoringController {
  constructor(
    private readonly repository: LiveMonitoringRepository,
    private readonly dashboardService: LiveDashboardService,
    private readonly snapshotService: LiveSnapshotService,
    private readonly mapService: LiveMapService,
    private readonly speakersService: LiveSpeakersService,
    private readonly camerasService: LiveCamerasService,
    private readonly eventsService: LiveEventsService,
    private readonly alertsService: LiveAlertsService,
    private readonly runtimeStatusService: LiveRuntimeStatusService,
    private readonly recoveryService: LiveRecoveryService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('dashboard')
  async getDashboard(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.dashboardService.getDashboard(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('snapshot')
  async getSnapshot(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.snapshotService.getSnapshot(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('map')
  async getMap(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.mapService.getMapState(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('speakers/active')
  async getActiveSpeakers(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.speakersService.getActiveSpeakers(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('requests/summary')
  async getPendingRequests(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.speakersService.getPendingRequests(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('units/:unitId')
  async getUnitDetail(@Param('unitId') unitId: string, @CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.speakersService.getUnitDetail(roomId, unitId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('cameras/status')
  async getCameraStatuses(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.camerasService.getCameraStatuses(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('cameras/target')
  async getCameraTargets(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.camerasService.getCameraTargets(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('cameras/triggers')
  async getCameraTriggers(
    @Query() query: CameraTriggerQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    if (query.result && !['SUCCESS', 'FAILED', 'SKIPPED'].includes(query.result)) {
      throw new BadRequestException('Invalid result enum');
    }

    const data = await this.camerasService.getCameraTriggers(query.cameraId, query.pageSize);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('events')
  async getEventFeed(
    @Query() query: EventFeedQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      if (from > to) {
        throw new BadRequestException('from must be before to');
      }
    }

    const roomId = this.repository.getActiveRoom().id;
    const data = await this.eventsService.getEventFeed(roomId, {
      eventType: query.eventType,
      unitId: query.unitId,
      result: query.result,
      from: query.from,
      to: query.to,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('alerts')
  async getAlerts(
    @Query() query: AlertQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.alertsService.getAlerts(
      roomId,
      query.status || 'ACTIVE',
      query.page || 1,
      query.pageSize || 20,
    );
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('alerts/:id/acknowledge')
  @HttpCode(200)
  async acknowledgeAlert(
    @Param('id') alertId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const data = await this.alertsService.acknowledgeAlert(alertId, user.id);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('runtime/status')
  async getRuntimeStatus(@CurrentUserDecorator() user: CurrentUser) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.runtimeStatusService.getStatus(roomId);
    return { success: true, data };
  }

  @Roles(UserRole.ADMIN)
  @Post('runtime/recovery')
  @HttpCode(200)
  async runRecovery(
    @Body() payload: RuntimeRecoveryRequestDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const roomId = this.repository.getActiveRoom().id;
    const data = await this.recoveryService.runRecovery(roomId, payload.action, user.id);
    return { success: true, data };
  }
}
