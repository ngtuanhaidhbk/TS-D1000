import { DeviceType, OperationMode, UnitRuntimeState } from '../../system-config/entities/system-config.entities';
import { RoomsRepository, TsdUnitsRepository } from '../../system-config/repositories/system-config.repositories';
import { SseStatus, SpeakingRequestStatus } from '../entities/runtime.entities';
import { RuntimeRoomStateRepository, SpeakingRequestsRepository } from '../repositories/runtime.repositories';
import { RuntimeSnapshotService } from './runtime-snapshot.service';

describe('RuntimeSnapshotService', () => {
  let roomsRepository: RoomsRepository;
  let unitsRepository: TsdUnitsRepository;
  let roomStateRepository: RuntimeRoomStateRepository;
  let requestsRepository: SpeakingRequestsRepository;
  let service: RuntimeSnapshotService;

  beforeEach(() => {
    roomsRepository = new RoomsRepository();
    unitsRepository = new TsdUnitsRepository();
    roomStateRepository = new RuntimeRoomStateRepository(roomsRepository);
    requestsRepository = new SpeakingRequestsRepository();
    service = new RuntimeSnapshotService(roomsRepository, unitsRepository, roomStateRepository, requestsRepository);
  });

  it('returns required snapshot keys and reflects operation mode', () => {
    const room = roomsRepository.getActiveRoom();
    roomsRepository.save({ ...room, operationMode: OperationMode.AUTOMATIC });
    const runtimeState = roomStateRepository.getByRoomId(room.id);
    roomStateRepository.save({ ...runtimeState, sseStatus: SseStatus.CONNECTED });

    unitsRepository.save({
      id: 'unit-1',
      roomId: room.id,
      externalUnitId: 'D01',
      unitName: 'Delegate 01',
      deviceType: DeviceType.DELEGATE,
      runtimeState: UnitRuntimeState.SPEAKING,
      isConnected: true,
      lastEventAt: '2026-04-22T09:00:00.000Z',
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z',
    });

    requestsRepository.save({
      id: 'req-1',
      roomId: room.id,
      unitId: 'unit-1',
      status: SpeakingRequestStatus.PENDING,
      requestedAt: '2026-04-22T08:59:00.000Z',
      approvedAt: null,
      rejectedAt: null,
      resolvedBy: null,
      createdAt: '2026-04-22T08:59:00.000Z',
      updatedAt: '2026-04-22T08:59:00.000Z',
    });

    const snap = service.getSnapshot();
    expect(snap.operationMode).toBe(OperationMode.AUTOMATIC);
    expect(snap.sseStatus).toBe(SseStatus.CONNECTED);
    expect(snap.activeSpeakers).toEqual(['unit-1']);
    expect(snap.pendingRequests).toEqual(['req-1']);
    expect(snap.units['unit-1']).toEqual({
      state: UnitRuntimeState.SPEAKING,
      lastEventAt: '2026-04-22T09:00:00.000Z',
    });
  });
});

