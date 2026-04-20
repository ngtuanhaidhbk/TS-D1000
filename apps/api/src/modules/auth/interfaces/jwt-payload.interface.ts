import type { UserRole } from '../../../common/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  sid: string;
  jti: string;
  role: UserRole;
  exp?: number;
}
