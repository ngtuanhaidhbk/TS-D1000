import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class TsdConfigUpsertDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @IsUrl({
    require_host: true,
    require_protocol: true,
  })
  baseUrl!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  username?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  password?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  sseEndpoint?: string;
}
