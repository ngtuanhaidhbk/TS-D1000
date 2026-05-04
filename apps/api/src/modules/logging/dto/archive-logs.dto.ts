import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsISO8601, IsOptional } from 'class-validator';

import { LogType } from '../entities/logging.entities';

export class ArchiveLogsDto {
  @IsISO8601()
  before!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => String(v).toUpperCase()) : value))
  @IsEnum(LogType, { each: true })
  logTypes?: LogType[];
}

