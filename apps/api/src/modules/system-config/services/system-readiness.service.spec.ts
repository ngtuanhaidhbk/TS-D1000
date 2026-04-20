import { UserRole } from '../../../common/enums/user-role.enum';
import {
  CamerasRepository,
  LayoutsRepository,
  MicCameraMappingsRepository,
  RoomsRepository,
  TsdConnectionConfigsRepository,
  TsdUnitsRepository,
} from '../repositories/system-config.repositories';
import { SystemReadinessService } from './system-readiness.service';

describe('SystemReadinessService', () => {
  const actor = {
    id: 'admin-001',
    username: 'admin',
    role: UserRole.ADMIN,
  };

  it('returns FAILED when required configuration is missing', () => {
    const service = new SystemReadinessService(
      new RoomsRepository(),
      new TsdConnectionConfigsRepository(),
      new TsdUnitsRepository(),
      new CamerasRepository(),
      new LayoutsRepository(),
      new MicCameraMappingsRepository(),
      { record: jest.fn() } as never,
    );

    const result = service.check(actor);

    expect(result.overallStatus).toBe('FAILED');
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'TSD',
          status: 'FAILED',
        }),
        expect.objectContaining({
          category: 'CAMERA',
          status: 'FAILED',
        }),
      ]),
    );
  });
});
