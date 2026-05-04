import { IsEnum, IsIn, IsOptional, IsString, IsNumber, Min, Max, IsISO8601 } from 'class-validator';

export enum CameraRuntimeResultEnum {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum AlertStatusEnum {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export enum RuntimeRecoveryActionEnum {
  RECONNECT = 'RECONNECT',
  RECOVER_STATE = 'RECOVER_STATE',
}

export class PaginationQueryDto {
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;
}

export class EventFeedQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED', 'SKIPPED'])
  result?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class CameraTriggerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  cameraId?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED', 'SKIPPED'])
  result?: string;
}

export class AlertQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'])
  status?: string = 'ACTIVE';

  @IsOptional()
  @IsIn(['INFO', 'WARNING', 'ERROR', 'CRITICAL'])
  severity?: string;
}

export class RuntimeRecoveryRequestDto {
  @IsEnum(RuntimeRecoveryActionEnum)
  action: 'RECONNECT' | 'RECOVER_STATE';
}

export class AlertAcknowledgeRequestDto {
  // No request body needed, just path params
}
