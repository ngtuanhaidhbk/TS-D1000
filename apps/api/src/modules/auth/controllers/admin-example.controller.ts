import { Controller, Get, UseGuards } from '@nestjs/common';

import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminExampleController {
  @Roles(UserRole.ADMIN)
  @Get('example-protected-resource')
  getExampleProtectedResource() {
    return {
      resource: 'example',
    };
  }
}
