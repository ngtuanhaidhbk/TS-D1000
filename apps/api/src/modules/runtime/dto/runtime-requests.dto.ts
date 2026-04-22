import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { SpeakingRequestStatus } from '../entities/runtime.entities';

export class ListRuntimeRequestsQueryDto {
  @IsOptional()
  @IsEnum(SpeakingRequestStatus)
  status?: SpeakingRequestStatus;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

