import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import type { CurrentUser } from '../../common/types/current-user.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CameraUpsertDto, DeactivateCameraDto, PresetUpsertDto } from './dto/camera.dto';
import { LayoutAnnotationUpsertDto, SaveLayoutDevicesDto } from './dto/layout.dto';
import { CreateMappingDto, UpdateMappingDto, UpdateModeDto } from './dto/mapping.dto';
import { TsdConfigUpsertDto } from './dto/tsd-config.dto';
import { CameraConfigService } from './services/camera-config.service';
import { LayoutService } from './services/layout.service';
import { MappingService } from './services/mapping.service';
import { OperationModeService } from './services/operation-mode.service';
import { SystemConfigOverviewService } from './services/system-config-overview.service';
import { SystemReadinessService } from './services/system-readiness.service';
import { TsdConfigService } from './services/tsd-config.service';

@Controller('config')
export class SystemConfigController {
  constructor(
    private readonly overviewService: SystemConfigOverviewService,
    private readonly tsdConfigService: TsdConfigService,
    private readonly cameraConfigService: CameraConfigService,
    private readonly layoutService: LayoutService,
    private readonly mappingService: MappingService,
    private readonly operationModeService: OperationModeService,
    private readonly readinessService: SystemReadinessService,
  ) {}

  @Get('overview')
  getOverview(@CurrentUserDecorator() actor?: CurrentUser) {
    return this.overviewService.getOverview(actor);
  }

  @Get('tsd')
  getTsdConfig() {
    return this.tsdConfigService.getActiveConfig();
  }

  @Roles(UserRole.ADMIN)
  @Post('tsd')
  createTsdConfig(@Body() payload: TsdConfigUpsertDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.tsdConfigService.createConfig(payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Put('tsd/:id')
  updateTsdConfig(
    @Param('id') id: string,
    @Body() payload: TsdConfigUpsertDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.tsdConfigService.updateConfig(id, payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Post('tsd/:id/test')
  testTsdConfig(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.tsdConfigService.testConfig(id, actor);
  }

  @Roles(UserRole.ADMIN)
  @Post('tsd/:id/sync-units')
  syncUnits(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.tsdConfigService.syncUnits(id, actor);
  }

  @Get('tsd/:id/units')
  listUnits(@Param('id') id: string, @Query() query: Record<string, string | undefined>) {
    return this.tsdConfigService.listUnits(id, query);
  }

  @Get('cameras')
  listCameras(@Query() query: Record<string, string | undefined>) {
    return this.cameraConfigService.listCameras(query);
  }

  @Get('cameras/:id')
  getCamera(@Param('id') id: string) {
    return this.cameraConfigService.getCamera(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('cameras')
  createCamera(@Body() payload: CameraUpsertDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.cameraConfigService.createCamera(payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Put('cameras/:id')
  updateCamera(
    @Param('id') id: string,
    @Body() payload: CameraUpsertDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraConfigService.updateCamera(id, payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Patch('cameras/:id/deactivate')
  deactivateCamera(
    @Param('id') id: string,
    @Body() payload: DeactivateCameraDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraConfigService.deactivateCamera(id, payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Post('cameras/:id/test')
  testCamera(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.cameraConfigService.testCamera(id, actor);
  }

  @Get('cameras/:id/presets')
  listPresets(@Param('id') id: string) {
    return this.cameraConfigService.listPresets(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('cameras/:id/presets')
  createPreset(
    @Param('id') id: string,
    @Body() payload: PresetUpsertDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraConfigService.createPreset(id, payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Put('presets/:id')
  updatePreset(
    @Param('id') id: string,
    @Body() payload: PresetUpsertDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.cameraConfigService.updatePreset(id, payload, actor);
  }

  @Get('layout')
  getLayout() {
    return this.layoutService.getLayout();
  }

  @Roles(UserRole.ADMIN)
  @Post('layout')
  @UseInterceptors(FileInterceptor('file'))
  uploadLayout(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.layoutService.uploadLayout(file, actor);
  }

  @Get('layout/devices')
  listLayoutDevices() {
    return this.layoutService.listDevices();
  }

  @Roles(UserRole.ADMIN)
  @Put('layout/devices')
  saveLayoutDevices(
    @Body() payload: SaveLayoutDevicesDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.layoutService.saveDevices(payload, actor);
  }

  @Get('layout/annotations')
  listAnnotations() {
    return this.layoutService.listAnnotations();
  }

  @Roles(UserRole.ADMIN)
  @Post('layout/annotations')
  createAnnotation(
    @Body() payload: LayoutAnnotationUpsertDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.layoutService.createAnnotation(payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Put('layout/annotations/:id')
  updateAnnotation(
    @Param('id') id: string,
    @Body() payload: LayoutAnnotationUpsertDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.layoutService.updateAnnotation(id, payload, actor);
  }

  @Get('mappings')
  listMappings(@Query() query: Record<string, string | undefined>) {
    return this.mappingService.listMappings(query);
  }

  @Roles(UserRole.ADMIN)
  @Post('mappings')
  createMapping(@Body() payload: CreateMappingDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.mappingService.createMapping(payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Put('mappings/:id')
  updateMapping(
    @Param('id') id: string,
    @Body() payload: UpdateMappingDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    return this.mappingService.updateMapping(id, payload, actor);
  }

  @Get('mode')
  getMode() {
    return this.operationModeService.getMode();
  }

  @Roles(UserRole.ADMIN)
  @Put('mode')
  updateMode(@Body() payload: UpdateModeDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.operationModeService.updateMode(payload, actor);
  }

  @Roles(UserRole.ADMIN)
  @Post('readiness/check')
  checkReadiness(@CurrentUserDecorator() actor?: CurrentUser) {
    return this.readinessService.check(actor);
  }
}
