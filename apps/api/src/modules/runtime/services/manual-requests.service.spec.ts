import { UserRole } from '../../../common/enums/user-role.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { DeviceType, OperationMode, UnitRuntimeState } from '../../system-config/entities/system-config.entities';
import { RoomsRepository, TsdUnitsRepository } from '../../system-config/repositories/system-config.repositories';
import { SpeakingRequestStatus } from '../entities/runtime.entities';
import { SpeakingRequestsRepository } from '../repositories/runtime.repositories';
import { ManualRequestsService } from './manual-requests.service';

describe('ManualRequestsService', () => {
  const admin = { id: 'admin-001', username: 'admin', role: UserRole.ADMIN };
  const operator = { id: 'op-001', username: 'operator', role: UserRole.OPERATOR };

  let roomsRepository: RoomsRepository;
  let unitsRepository: TsdUnitsRepository;
  let requestsRepository: SpeakingRequestsRepository;
  let auditService: { record: jest.Mock };
  let service: ManualRequestsService;

  beforeEach(() => {
    roomsRepository = new RoomsRepository();
    unitsRepository = new TsdUnitsRepository();
    requestsRepository = new SpeakingRequestsRepository();
    auditService = { record: jest.fn() };

    service = new ManualRequestsService(
      roomsRepository,
      unitsRepository,
      requestsRepository,
      auditService as never,
    );

    const room = roomsRepository.getActiveRoom();
    unitsRepository.save({
      id: 'unit-1',
      roomId: room.id,
      externalUnitId: 'D01',
      unitName: 'Delegate 01',
      deviceType: DeviceType.DELEGATE,
      runtimeState: UnitRuntimeState.REQUEST,
      isConnected: true,
      lastEventAt: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    requestsRepository.save({
      id: 'req-1',
      roomId: room.id,
      unitId: 'unit-1',
      status: SpeakingRequestStatus.PENDING,
      requestedAt: '2026-04-22T09:00:00.000Z',
      approvedAt: null,
      rejectedAt: null,
      resolvedBy: null,
      createdAt: '2026-04-22T09:00:00.000Z',
      updatedAt: '2026-04-22T09:00:00.000Z',
    });
  });

  it('returns empty list when room is in AUTOMATIC mode', () => {
    const room = roomsRepository.getActiveRoom();
    roomsRepository.save({ ...room, operationMode: OperationMode.AUTOMATIC });

    const result = service.list({ status: SpeakingRequestStatus.PENDING, page: 1, pageSize: 20 });
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('approves a pending request in MANUAL mode (operator allowed) and does not set unit SPEAKING', () => {
    const result = service.approve('req-1', operator);
    expect(result).toEqual({ requestId: 'req-1', status: SpeakingRequestStatus.APPROVED });

    const request = requestsRepository.findById('req-1');
    expect(request?.status).toBe(SpeakingRequestStatus.APPROVED);
    expect(request?.resolvedBy).toBe(operator.id);

    const unit = unitsRepository.findById('unit-1');
    expect(unit?.runtimeState).toBe(UnitRuntimeState.REQUEST);
  });

  it('rejects a pending request and sets unit back to IDLE', () => {
    const result = service.reject('req-1', admin);
    expect(result).toEqual({ requestId: 'req-1', status: SpeakingRequestStatus.REJECTED });

    const unit = unitsRepository.findById('unit-1');
    expect(unit?.runtimeState).toBe(UnitRuntimeState.IDLE);
  });

  it('blocks approve when mode is not MANUAL', () => {
    const room = roomsRepository.getActiveRoom();
    roomsRepository.save({ ...room, operationMode: OperationMode.AUTOMATIC });
    try {
      service.approve('req-1', admin);
      fail('Expected approve to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({ code: 'MANUAL_MODE_REQUIRED', statusCode: 422 });
    }
  });

  it('blocks approve when request is not pending', () => {
    const req = requestsRepository.findById('req-1')!;
    requestsRepository.save({ ...req, status: SpeakingRequestStatus.APPROVED });
    try {
      service.approve('req-1', admin);
      fail('Expected approve to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({ code: 'REQUEST_NOT_PENDING', statusCode: 422 });
    }
  });
});

