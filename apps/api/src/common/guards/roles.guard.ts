import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppException } from '../exceptions/app.exception';
import type { CurrentUser } from '../types/current-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
    if (!request.user) {
      throw new AppException('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!requiredRoles.includes(request.user.role)) {
      throw new AppException(
        'FORBIDDEN',
        'You do not have permission to access this resource',
        403,
      );
    }

    return true;
  }
}
