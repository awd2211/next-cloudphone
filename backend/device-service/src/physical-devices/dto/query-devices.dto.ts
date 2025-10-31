import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DevicePoolStatus } from '../../providers/physical/physical.types';

/**
 * 查询设备列表 DTO
 */
export class QueryDevicesDto {
  @ApiPropertyOptional({
    description: '设备状态过滤',
    enum: DevicePoolStatus,
    example: DevicePoolStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(DevicePoolStatus)
  status?: DevicePoolStatus;

  @ApiPropertyOptional({
    description: '设备分组过滤',
    example: 'rack-A',
  })
  @IsOptional()
  @IsString()
  deviceGroup?: string;

  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
