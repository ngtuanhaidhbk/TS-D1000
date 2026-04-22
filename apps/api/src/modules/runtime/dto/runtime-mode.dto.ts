import { IsEnum } from 'class-validator';

import { OperationMode } from '../../system-config/entities/system-config.entities';

export class UpdateRuntimeModeDto {
  @IsEnum(OperationMode)
  mode!: OperationMode;
}

