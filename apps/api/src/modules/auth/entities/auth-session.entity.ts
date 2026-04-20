import { AuthSessionStatus } from '../enums/auth-session-status.enum';

export class AuthSessionEntity {
  id!: string;
  userId!: string;
  tokenJti!: string;
  status!: AuthSessionStatus;
  issuedAt!: string;
  expiresAt!: string;
  revokedAt?: string;
  revokedReason?: string;
  lastSeenAt?: string;
  clientType?: string;
  createdAt!: string;
  updatedAt!: string;
}
