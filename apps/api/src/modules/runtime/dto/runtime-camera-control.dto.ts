import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecallPresetDto {
  @IsString()
  presetId!: string;
}

export const PTZ_ACTIONS = [
  'PAN_LEFT',
  'PAN_RIGHT',
  'TILT_UP',
  'TILT_DOWN',
  'ZOOM_IN',
  'ZOOM_OUT',
] as const;

export type PtzAction = (typeof PTZ_ACTIONS)[number];

export class MoveCameraDto {
  @IsString()
  @IsIn(PTZ_ACTIONS)
  action!: PtzAction;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  speed?: number;
}

