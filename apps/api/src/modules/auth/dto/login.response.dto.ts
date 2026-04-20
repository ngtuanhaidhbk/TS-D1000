import type { UserRole } from '../../../common/enums/user-role.enum';
import type { UserStatus } from '../../../common/enums/user-status.enum';

export class LoginResponseDto {
  token!: string;
  expiresAt!: string;
  user!: {
    id: string;
    username: string;
    role: UserRole;
    status: UserStatus;
  };
}
