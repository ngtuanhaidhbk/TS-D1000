import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { AdminExampleController } from './controllers/admin-example.controller';
import { AuthController } from './controllers/auth.controller';
import { AuthSessionRepository } from './repositories/auth-session.repository';
import { AuthAuditService } from './services/auth-audit.service';
import { AuthSessionCleanupService } from './services/auth-session-cleanup.service';
import { AuthService } from './services/auth.service';
import { BaseRepositoryService } from './services/base.repository.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'change-me-for-development'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h'),
        },
      }),
    }),
  ],
  controllers: [AuthController, AdminExampleController],
  providers: [
    AuthSessionRepository,
    AuthAuditService,
    AuthSessionCleanupService,
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    BaseRepositoryService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
