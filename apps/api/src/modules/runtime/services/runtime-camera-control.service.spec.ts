import { UserRole } from '../../../common/enums/user-role.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { CameraProtocol, CameraStatus, ConnectionTestResult } from '../../system-config/entities/system-config.entities';
import {
  CameraPresetsRepository,
  CamerasRepository,
} from '../../system-config/repositories/system-config.repositories';
import { CameraIntegrationService } from '../../system-config/services/camera-integration.service';
import { RuntimeCameraLogsRepository, RuntimeCameraStateRepository } from '../repositories/runtime-camera.repositories';
import { RuntimeCameraControlService } from './runtime-camera-control.service';

describe('RuntimeCameraControlService', () => {
  const admin = { id: 'admin-001', username: 'admin', role: UserRole.ADMIN };
  const operator = { id: 'op-001', username: 'operator', role: UserRole.OPERATOR };

  let camerasRepository: CamerasRepository;
  let presetsRepository: CameraPresetsRepository;
  let integration: CameraIntegrationService;
  let audit: { record: jest.Mock };
  let stateRepo: RuntimeCameraStateRepository;
  let logsRepo: RuntimeCameraLogsRepository;
  let service: RuntimeCameraControlService;

  beforeEach(() => {
    camerasRepository = new CamerasRepository();
    presetsRepository = new CameraPresetsRepository();
    integration = new CameraIntegrationService();
    audit = { record: jest.fn() };
    stateRepo = new RuntimeCameraStateRepository();
    logsRepo = new RuntimeCameraLogsRepository();
    service = new RuntimeCameraControlService(
      camerasRepository,
      presetsRepository,
      integration,
      audit as never,
      stateRepo,
      logsRepo,
    );
  });

  it('allows admin and operator to recall presets when capability is supported', () => {
    camerasRepository.save({
      id: 'camera-1',
      roomId: 'room-001',
      name: 'Camera 1',
      protocol: CameraProtocol.ONVIF,
      ipAddress: '192.168.1.20',
      port: 80,
      username: null,
      passwordEncrypted: null,
      rtspUrl: null,
      vendor: null,
      model: null,
      status: CameraStatus.ACTIVE,
      capabilityPtz: true,
      capabilityPreset: true,
      capabilityStream: false,
      capabilityManualControl: true,
      capabilityPositionQuery: false,
      lastTestResult: ConnectionTestResult.SUCCESS,
      lastTestAt: '2026-04-20T10:00:00.000Z',
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
    presetsRepository.save({
      id: 'preset-1',
      cameraId: 'camera-1',
      presetCode: 'P01',
      presetName: 'Delegate 01',
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    expect(service.recallPreset('camera-1', 'preset-1', admin)).toMatchObject({ result: 'SUCCESS' });
    expect(service.recallPreset('camera-1', 'preset-1', operator)).toMatchObject({ result: 'SUCCESS' });
    expect(audit.record).toHaveBeenCalled();
  });

  it('rejects manual PTZ move when PTZ is not supported', () => {
    camerasRepository.save({
      id: 'camera-1',
      roomId: 'room-001',
      name: 'Camera 1',
      protocol: CameraProtocol.ONVIF,
      ipAddress: '192.168.1.20',
      port: 80,
      username: null,
      passwordEncrypted: null,
      rtspUrl: null,
      vendor: null,
      model: null,
      status: CameraStatus.ACTIVE,
      capabilityPtz: false,
      capabilityPreset: true,
      capabilityStream: false,
      capabilityManualControl: true,
      capabilityPositionQuery: false,
      lastTestResult: ConnectionTestResult.SUCCESS,
      lastTestAt: '2026-04-20T10:00:00.000Z',
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    try {
      service.move('camera-1', 'PAN_LEFT', null, operator);
      fail('Expected move to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({
        code: 'PTZ_NOT_SUPPORTED',
        statusCode: 422,
      });
    }
  });
});
