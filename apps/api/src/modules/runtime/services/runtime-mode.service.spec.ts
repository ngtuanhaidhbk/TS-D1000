import { UserRole } from '../../../common/enums/user-role.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { OperationMode } from '../../system-config/entities/system-config.entities';
import { RoomsRepository, TsdUnitsRepository } from '../../system-config/repositories/system-config.repositories';
import { SystemConfigAuditService } from '../../system-config/services/system-config-audit.service';
import { RuntimeRoomStateRepository, SpeakingRequestsRepository } from '../repositories/runtime.repositories';
import { RuntimeModeService } from './runtime-mode.service';
import { RuntimeSnapshotService } from './runtime-snapshot.service';

describe('RuntimeModeService', () => {
  const admin = { id: 'admin-001', username: 'admin', role: UserRole.ADMIN };
  const operator = { id: 'op-001', username: 'operator', role: UserRole.OPERATOR };

  let roomsRepository: RoomsRepository;
  let unitsRepository: TsdUnitsRepository;
  let roomStateRepository: RuntimeRoomStateRepository;
  let requestsRepository: SpeakingRequestsRepository;
  let snapshotService: RuntimeSnapshotService;
  let auditService: { record: jest.Mock };
  let service: RuntimeModeService;

  beforeEach(() => {
    roomsRepository = new RoomsRepository();
    unitsRepository = new TsdUnitsRepository();
    roomStateRepository = new RuntimeRoomStateRepository(roomsRepository);
    requestsRepository = new SpeakingRequestsRepository();
    snapshotService = new RuntimeSnapshotService(
      roomsRepository,
      unitsRepository,
      roomStateRepository,
      requestsRepository,
    );
    auditService = { record: jest.fn() };
    service = new RuntimeModeService(roomsRepository, auditService as unknown as SystemConfigAuditService, snapshotService);
  });

  it('allows admin to update mode', () => {
    const result = service.updateMode(OperationMode.AUTOMATIC, admin);
    expect(result.mode).toBe(OperationMode.AUTOMATIC);
  });

  it('rejects operator mode changes', () => {
    try {
      service.updateMode(OperationMode.AUTOMATIC, operator);
      fail('Expected updateMode to throw');
    } catch (error) {
      expect(error).toMatchObject<AppException>({ code: 'FORBIDDEN', statusCode: 403 });
    }
  });
});

