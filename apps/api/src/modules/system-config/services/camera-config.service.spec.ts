import { UserRole } from '../../../common/enums/user-role.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { CameraProtocol, CameraStatus } from '../entities/system-config.entities';
import {
  CameraPresetsRepository,
  CamerasRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
} from '../repositories/system-config.repositories';
import { CameraConfigService } from './camera-config.service';
import { CameraIntegrationService } from './camera-integration.service';

describe('CameraConfigService', () => {
  const actor = {
    id: 'admin-001',
    username: 'admin',
    role: UserRole.ADMIN,
  };

  let roomsRepository: RoomsRepository;
  let camerasRepository: CamerasRepository;
  let cameraPresetsRepository: CameraPresetsRepository;
  let mappingsRepository: MicCameraMappingsRepository;
  let cameraIntegrationService: CameraIntegrationService;
  let auditService: { record: jest.Mock };
  let service: CameraConfigService;

  beforeEach(() => {
    roomsRepository = new RoomsRepository();
    camerasRepository = new CamerasRepository();
    cameraPresetsRepository = new CameraPresetsRepository();
    mappingsRepository = new MicCameraMappingsRepository();
    cameraIntegrationService = new CameraIntegrationService();
    auditService = {
      record: jest.fn(),
    };

    service = new CameraConfigService(
      roomsRepository,
      camerasRepository,
      cameraPresetsRepository,
      mappingsRepository,
      cameraIntegrationService,
      auditService as never,
    );
  });

  it('rejects creating the fifth active camera in the room', () => {
    const room = roomsRepository.getActiveRoom();
    for (let index = 0; index < 4; index += 1) {
      camerasRepository.save({
        id: `camera-${index + 1}`,
        roomId: room.id,
        name: `Camera ${index + 1}`,
        protocol: CameraProtocol.ONVIF,
        ipAddress: `192.168.1.${index + 10}`,
        port: 80,
        username: null,
        passwordEncrypted: null,
        rtspUrl: null,
        vendor: null,
        model: null,
        status: CameraStatus.ACTIVE,
        capabilityPtz: false,
        capabilityPreset: false,
        capabilityStream: false,
        lastTestResult: null,
        lastTestAt: null,
        createdAt: '2026-04-20T10:00:00.000Z',
        updatedAt: '2026-04-20T10:00:00.000Z',
      });
    }

    try {
      service.createCamera(
        {
          name: 'Camera 5',
          protocol: CameraProtocol.ONVIF,
          ipAddress: '192.168.1.50',
          port: 80,
        },
        actor,
      );
      fail('Expected createCamera to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({
        code: 'CAMERA_LIMIT_REACHED',
        statusCode: 422,
      });
    }
  });

  it('blocks deactivation when the camera is referenced by an active mapping', () => {
    const room = roomsRepository.getActiveRoom();
    camerasRepository.save({
      id: 'camera-1',
      roomId: room.id,
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
      lastTestResult: null,
      lastTestAt: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
    mappingsRepository.save({
      id: 'mapping-1',
      roomId: room.id,
      unitId: 'unit-1',
      cameraId: 'camera-1',
      presetId: 'preset-1',
      isActive: true,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    try {
      service.deactivateCamera('camera-1', {}, actor);
      fail('Expected deactivateCamera to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({
        code: 'CAMERA_ALREADY_IN_USE',
        statusCode: 422,
      });
    }
  });
});
