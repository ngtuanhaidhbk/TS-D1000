import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export class UserEntity {
  id!: string;
  username!: string;
  passwordHash!: string;
  role!: UserRole;
  status!: UserStatus;
  createdAt!: string;
  updatedAt!: string;
}
