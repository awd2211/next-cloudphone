import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray } from 'class-validator';
import { DeviceType } from '../../entities/device.entity';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsInt()
  @IsOptional()
  cpuCores?: number;

  @IsInt()
  @IsOptional()
  memoryMB?: number;

  @IsInt()
  @IsOptional()
  storageMB?: number;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsInt()
  @IsOptional()
  dpi?: number;

  @IsString()
  @IsOptional()
  androidVersion?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
