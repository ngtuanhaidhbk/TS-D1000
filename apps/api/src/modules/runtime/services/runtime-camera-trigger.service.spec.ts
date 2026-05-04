import { CameraProtocol, CameraStatus, ConnectionTestResult } from '../../system-config/entities/system-config.entities';
import {
  CameraPresetsRepository,
  CamerasRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
} from '../../system-config/repositories/system-config.repositories';
import { CameraIntegrationService } from '../../system-config/services/camera-integration.service';
import { RuntimeCameraLogsRepository, RuntimeCameraStateRepository } from '../repositories/runtime-camera.repositories';
import { RuntimeRoomStateRepository } from '../repositories/runtime.repositories';
import { RuntimeCameraTriggerService } from './runtime-camera-trigger.service';

describe('RuntimeCameraTriggerService', () => {
  let rooms: RoomsRepository;
  let mappings: MicCameraMappingsRepository;
  let cameras: CamerasRepository;
  let presets: CameraPresetsRepository;
  let integration: CameraIntegrationService;
  let roomState: RuntimeRoomStateRepository;
  let cameraState: RuntimeCameraStateRepository;
  let cameraLogs: RuntimeCameraLogsRepository;
  let service: RuntimeCameraTriggerService;

  beforeEach(() => {
    rooms = new RoomsRepository();
    mappings = new MicCameraMappingsRepository();
    cameras = new CamerasRepository();
    presets = new CameraPresetsRepository();
    integration = new CameraIntegrationService();
    roomState = new RuntimeRoomStateRepository(rooms);
    cameraState = new RuntimeCameraStateRepository();
    cameraLogs = new RuntimeCameraLogsRepository();

    service = new RuntimeCameraTriggerService(
      rooms,
      mappings,
      cameras,
      presets,
      integration,
      roomState,
      cameraState,
      cameraLogs,
    );
  });

  it('skips when there is no active mapping', () => {
    const result = service.triggerBySpeaker('unit-1');
    expect(result).toEqual({ result: 'SKIPPED', reason: 'NO_ACTIVE_MAPPING' });
  });

  it('triggers and updates room camera target when mapping is valid', () => {
    cameras.save({
      id: 'camera-1',
      roomId: 'room-001',
      name: 'Camera 1',
      protocol: CameraProtocol.ONVIF,
      ipAddress: '192.168.1.20',
      port: 80,
      username: null,
      passwordEncrypted: null,
      rtspUrl: 'rtsp://cam/1',
      vendor: null,
      model: null,
      status: CameraStatus.ACTIVE,
      capabilityPtz: true,
      capabilityPreset: true,
      capabilityStream: true,
      capabilityManualControl: true,
      capabilityPositionQuery: false,
      lastTestResult: ConnectionTestResult.SUCCESS,
      lastTestAt: '2026-04-20T10:00:00.000Z',
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
    presets.save({
      id: 'preset-1',
      cameraId: 'camera-1',
      presetCode: 'P01',
      presetName: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
    mappings.save({
      id: 'mapping-1',
      roomId: 'room-001',
      unitId: 'unit-1',
      cameraId: 'camera-1',
      presetId: 'preset-1',
      isActive: true,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    const result = service.triggerBySpeaker('unit-1');
    expect(result).toEqual({ result: 'SUCCESS' });

    const state = roomState.getByRoomId('room-001');
    expect(state.currentCameraTarget).toEqual({ unitId: 'unit-1', cameraId: 'camera-1', presetId: 'preset-1' });
    expect(cameraLogs.listByCameraId('camera-1').length).toBe(1);
  });
});

