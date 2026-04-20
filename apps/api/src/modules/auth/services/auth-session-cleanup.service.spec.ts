import { AuthSessionCleanupService } from './auth-session-cleanup.service';

describe('AuthSessionCleanupService', () => {
  it('expires active sessions and returns the expired count', () => {
    const authSessionRepository = {
      expireActiveSessions: jest.fn().mockReturnValue([{ id: 's1' }, { id: 's2' }]),
    };

    const service = new AuthSessionCleanupService(authSessionRepository as never);

    const result = service.expireActiveSessions('2026-04-20T10:00:00.000Z');

    expect(result).toBe(2);
    expect(authSessionRepository.expireActiveSessions).toHaveBeenCalledWith(
      '2026-04-20T10:00:00.000Z',
    );
  });
});
