import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { BaseRepository } from '../../../common/base/base.repository';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  constructor() {
    super();

    const now = new Date().toISOString();
    const users: UserEntity[] = [
      {
        id: 'user-admin-001',
        username: 'admin',
        passwordHash: bcrypt.hashSync('Admin123!', 10),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-operator-001',
        username: 'operator1',
        passwordHash: bcrypt.hashSync('Operator123!', 10),
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      },
    ];

    users.forEach((user) => this.save(user));
  }

  findByUsername(username: string): UserEntity | null {
    const normalized = username.trim().toLowerCase();
    return this.list().find((user) => user.username.toLowerCase() === normalized) ?? null;
  }
}
