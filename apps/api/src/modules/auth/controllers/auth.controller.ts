import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { CurrentUserDecorator } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { CurrentUser } from '../../../common/types/current-user.type';
import { LoginRequestDto } from '../dto/login.request.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Req() request: { user: CurrentUser & { sessionId: string } }) {
    return this.authService.me(request.user);
  }

  @Post('logout')
  logout(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Req() request: { user: CurrentUser & { sessionId: string } },
  ) {
    return this.authService.logout(currentUser, request.user.sessionId);
  }
}
