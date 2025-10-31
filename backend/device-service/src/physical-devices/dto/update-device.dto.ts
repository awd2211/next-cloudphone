import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { DevicePoolStatus } from '../../providers/physical/physical.types';

/**
 * 更新设备 DTO
 */
export class UpdateDeviceDto {
  @ApiPropertyOptional({
    description: '设备名称',
    example: 'TestDevice-01-Updated',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '设备分组',
    example: 'rack-B',
  })
  @IsOptional()
  @IsString()
  deviceGroup?: string;

  @ApiPropertyOptional({
    description: '设备标签',
    example: ['production', 'stable'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: '设备状态',
    enum: DevicePoolStatus,
    example: DevicePoolStatus.MAINTENANCE,
  })
  @IsOptional()
  @IsEnum(DevicePoolStatus)
  status?: DevicePoolStatus;
}
