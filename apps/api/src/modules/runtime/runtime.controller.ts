import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import type { CurrentUser } from '../../common/types/current-user.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateRuntimeModeDto } from './dto/runtime-mode.dto';
import { MoveCameraDto, RecallPresetDto } from './dto/runtime-camera-control.dto';
import { ListRuntimeRequestsQueryDto } from './dto/runtime-requests.dto';
import { RuntimeCameraMonitoringService } from './services/runtime-camera-monitoring.service';
import { ManualRequestsService } from './services/manual-requests.service';
import { RuntimeCameraControlService } from './services/runtime-camera-control.service';
import { RuntimeModeService } from './services/runtime-mode.service';
import { RuntimeSnapshotService } from './services/runtime-snapshot.service';

@Controller('runtime')
export class RuntimeController {
  constructor(
    private readonly runtimeModeService: RuntimeModeService,
    private readonly snapshotService: RuntimeSnapshotService,
    private readonly manualRequestsService: ManualRequestsService,
    private readonly cameraControlService: RuntimeCameraControlService,
    private readonly cameraMonitoringService: RuntimeCameraMonitoringService,
  ) {}

  @Get('mode')
  getMode() {
    return this.runtimeModeService.getMode();
  }

  @Roles(UserRole.ADMIN)
  @Put('mode')
  updateMode(@Body() payload: UpdateRuntimeModeDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.runtimeModeService.updateMode(payload.mode, actor);
  }

  @Roles(UserRole.ADMIN)
  @Get('mode/switch-impact')
  getModeSwitchImpact(@CurrentUserDecorator() actor?: CurrentUser) {
    return this.runtimeModeService.getSwitchImpact(actor);
  }

  @Get('snapshot')
  getSnapshot() {
    return this.snapshotService.getSnapshot();
  }

  @Get('requests')
  listRequests(@Query() query: ListRuntimeRequestsQueryDto) {
    return this.manualRequestsService.list(query);
  }

  @Post('requests/:id/approve')
  approve(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.manualRequestsService.approve(id, actor);
  }

  @Post('requests/:id/reject')
  reject(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.manualRequestsService.reject(id, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('cameras/:id/recall-preset')
  recallPreset(
    @Param('id') id: string,
    @Body() payload: RecallPresetDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraControlService.recallPreset(id, payload.presetId, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('cameras/:id/move')
  move(
    @Param('id') id: string,
    @Body() payload: MoveCameraDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraControlService.move(id, payload.action, payload.speed ?? null, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('cameras/:id/stop')
  stop(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.cameraControlService.stop(id, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('cameras/:id/status')
  getCameraStatus(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.cameraMonitoringService.getStatus(id, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('cameras/:id/logs')
  listCameraLogs(
    @Param('id') id: string,
    @Query() query: Record<string, string | undefined>,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraMonitoringService.listLogs(
      id,
      {
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      },
      actor,
    );
  }
}
