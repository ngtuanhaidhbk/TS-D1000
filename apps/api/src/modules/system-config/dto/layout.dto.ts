import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

import { LayoutRefType } from '../entities/system-config.entities';

export class LayoutDeviceInputDto {
  @IsEnum(LayoutRefType)
  refType!: LayoutRefType;

  @IsString()
  @MinLength(1)
  refId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  posX!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  posY!: number;

  @IsOptional()
  @IsString()
  iconLabel?: string;
}

export class SaveLayoutDevicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutDeviceInputDto)
  devices!: LayoutDeviceInputDto[];
}

export class LayoutAnnotationUpsertDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  posX!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  posY!: number;
}
