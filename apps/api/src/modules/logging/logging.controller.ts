import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import type { CurrentUser } from '../../common/types/current-user.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ArchiveLogsDto } from './dto/archive-logs.dto';
import { AuditLogListQueryDto, GenericLogsQueryDto, RuntimeLogListQueryDto } from './dto/log-query.dto';
import { LogArchiveService } from './services/log-archive.service';
import { LogQueryService } from './services/log-query.service';

@Controller('logs')
export class LoggingController {
  constructor(
    private readonly queryService: LogQueryService,
    private readonly archiveService: LogArchiveService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get('audit')
  listAudit(@Query() query: AuditLogListQueryDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.queryService.getAuditLogs(query, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('runtime')
  listRuntime(@Query() query: RuntimeLogListQueryDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.queryService.getRuntimeLogs(query, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get()
  list(@Query() query: GenericLogsQueryDto, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.queryService.getLogs(query, actor);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get(':id')
  detail(@Param('id') id: string, @CurrentUserDecorator() actor?: CurrentUser) {
    return this.queryService.getLogDetail(id, actor);
  }

  @Roles(UserRole.ADMIN)
  @Post('archive')
  archive(
    @Body() payload: ArchiveLogsDto,
    @CurrentUserDecorator() actor?: CurrentUser,
  ) {
    // RolesGuard already restricts to ADMIN; keep actor param for future expansion.
    void actor;
    return this.archiveService.archive(payload.before, payload.logTypes);
  }
}

