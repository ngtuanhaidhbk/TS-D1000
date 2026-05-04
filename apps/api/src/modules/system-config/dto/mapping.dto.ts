import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsString, MinLength } from 'class-validator';

import { OperationMode } from '../entities/system-config.entities';

export class CreateMappingDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  unitId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  cameraId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  presetId!: string;
}

export class UpdateMappingDto extends CreateMappingDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateModeDto {
  @IsEnum(OperationMode)
  mode!: OperationMode;
}
