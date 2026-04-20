import { Reflector } from '@nestjs/core';

import { UserRole } from '../enums/user-role.enum';
import { AppException } from '../exceptions/app.exception';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  let rolesGuard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    rolesGuard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no role metadata is defined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = rolesGuard.canActivate(createContext());

    expect(result).toBe(true);
  });

  it('allows access when user role is included in required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    const result = rolesGuard.canActivate(
      createContext({
        id: 'u-admin-001',
        username: 'admin',
        role: UserRole.ADMIN,
      }),
    );

    expect(result).toBe(true);
  });

  it('throws FORBIDDEN when user role is not allowed', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    try {
      rolesGuard.canActivate(
        createContext({
          id: 'u-operator-001',
          username: 'operator1',
          role: UserRole.OPERATOR,
        }),
      );
      throw new Error('Expected RolesGuard to throw FORBIDDEN');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect(error).toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'You do not have permission to access this resource',
      });
    }
  });

  it('throws UNAUTHORIZED when auth context is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    try {
      rolesGuard.canActivate(createContext());
      throw new Error('Expected RolesGuard to throw UNAUTHORIZED');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect(error).toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Unauthorized',
      });
    }
  });
});

function createContext(user?: { id: string; username: string; role: UserRole }) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}
