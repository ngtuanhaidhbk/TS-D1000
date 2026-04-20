import { randomUUID } from 'crypto';

import { AppException } from '../../../common/exceptions/app.exception';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { UserRole } from '../../../common/enums/user-role.enum';

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return randomUUID();
}

export function requireAdmin(actor?: CurrentUser) {
  if (!actor || actor.role !== UserRole.ADMIN) {
    throw new AppException('FORBIDDEN', 'Forbidden', 403);
  }
}

export function paginateAndFilter<T>(
  items: T[],
  options: {
    page?: number;
    pageSize?: number;
  },
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 20);
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}
