import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateSnapshotDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}
