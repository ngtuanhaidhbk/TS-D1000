import type { UserRole } from '../enums/user-role.enum';

export type CurrentUser = {
  id: string;
  username: string;
  role: UserRole;
};
