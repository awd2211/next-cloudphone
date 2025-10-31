import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { DeviceStatus } from '../../entities/device.entity';

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
