import { UserRole } from '../../../common/enums/user-role.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  CameraProtocol,
  CameraStatus,
  DeviceType,
  UnitRuntimeState,
} from '../entities/system-config.entities';
import {
  CameraPresetsRepository,
  CamerasRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
  TsdUnitsRepository,
} from '../repositories/system-config.repositories';
import { MappingService } from './mapping.service';

describe('MappingService', () => {
  const actor = {
    id: 'admin-001',
    username: 'admin',
    role: UserRole.ADMIN,
  };

  let roomsRepository: RoomsRepository;
  let unitsRepository: TsdUnitsRepository;
  let camerasRepository: CamerasRepository;
  let presetsRepository: CameraPresetsRepository;
  let mappingsRepository: MicCameraMappingsRepository;
  let auditService: { record: jest.Mock };
  let service: MappingService;

  beforeEach(() => {
    roomsRepository = new RoomsRepository();
    unitsRepository = new TsdUnitsRepository();
    camerasRepository = new CamerasRepository();
    presetsRepository = new CameraPresetsRepository();
    mappingsRepository = new MicCameraMappingsRepository();
    auditService = {
      record: jest.fn(),
    };

    service = new MappingService(
      roomsRepository,
      unitsRepository,
      camerasRepository,
      presetsRepository,
      mappingsRepository,
      auditService as never,
    );

    const room = roomsRepository.getActiveRoom();
    unitsRepository.save({
      id: 'unit-1',
      roomId: room.id,
      externalUnitId: 'D01',
      unitName: 'Delegate 01',
      deviceType: DeviceType.DELEGATE,
      runtimeState: UnitRuntimeState.IDLE,
      isConnected: true,
      lastEventAt: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
    camerasRepository.save({
      id: 'camera-1',
      roomId: room.id,
      name: 'Camera 1',
      protocol: CameraProtocol.ONVIF,
      ipAddress: '192.168.1.21',
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
      lastTestResult: null,
      lastTestAt: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
    camerasRepository.save({
      id: 'camera-2',
      roomId: room.id,
      name: 'Camera 2',
      protocol: CameraProtocol.ONVIF,
      ipAddress: '192.168.1.22',
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
      lastTestResult: null,
      lastTestAt: null,
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
    presetsRepository.save({
      id: 'preset-2',
      cameraId: 'camera-2',
      presetCode: 'P02',
      presetName: 'Delegate 02',
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });
  });

  it('rejects a preset that does not belong to the selected camera', () => {
    try {
      service.createMapping(
        {
          unitId: 'unit-1',
          cameraId: 'camera-1',
          presetId: 'preset-2',
        },
        actor,
      );
      fail('Expected createMapping to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({
        code: 'PRESET_CAMERA_MISMATCH',
        statusCode: 422,
      });
    }
  });

  it('rejects a second active mapping for the same unit', () => {
    mappingsRepository.save({
      id: 'mapping-1',
      roomId: roomsRepository.getActiveRoom().id,
      unitId: 'unit-1',
      cameraId: 'camera-1',
      presetId: 'preset-1',
      isActive: true,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    try {
      service.createMapping(
        {
          unitId: 'unit-1',
          cameraId: 'camera-1',
          presetId: 'preset-1',
        },
        actor,
      );
      fail('Expected createMapping to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({
        code: 'ACTIVE_MAPPING_EXISTS',
        statusCode: 409,
      });
    }
  });
});
