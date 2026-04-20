import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentUser } from '../types/current-user.type';

export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
    return request.user;
  },
);
