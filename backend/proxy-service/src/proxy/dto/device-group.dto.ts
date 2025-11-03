import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

/**
 * 创建设备组请求
 */
export class CreateDeviceGroupDto {
  @ApiProperty({ description: '组名称', example: 'Production Devices' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '组描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '最大设备数', example: 100, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxDevices?: number;

  @ApiPropertyOptional({ description: '使用专属代理池', default: true })
  @IsOptional()
  @IsBoolean()
  dedicatedProxies?: boolean;

  @ApiPropertyOptional({ description: '启用自动扩展', default: false })
  @IsOptional()
  @IsBoolean()
  autoScaling?: boolean;

  @ApiPropertyOptional({ description: '首选提供商列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredProviders?: string[];

  @ApiPropertyOptional({ description: '首选国家列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCountries?: string[];

  @ApiPropertyOptional({ description: '每日成本限制', example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyCostLimit?: number;

  @ApiPropertyOptional({ description: '最小质量评分', example: 80.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minQualityScore?: number;

  @ApiPropertyOptional({ description: '元数据', type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 更新设备组请求
 */
export class UpdateDeviceGroupDto {
  @ApiPropertyOptional({ description: '组名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '组描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '最大设备数' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxDevices?: number;

  @ApiPropertyOptional({ description: '使用专属代理池' })
  @IsOptional()
  @IsBoolean()
  dedicatedProxies?: boolean;

  @ApiPropertyOptional({ description: '启用自动扩展' })
  @IsOptional()
  @IsBoolean()
  autoScaling?: boolean;

  @ApiPropertyOptional({ description: '组状态', enum: ['active', 'paused', 'suspended'] })
  @IsOptional()
  @IsEnum(['active', 'paused', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ description: '首选提供商列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredProviders?: string[];

  @ApiPropertyOptional({ description: '每日成本限制' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyCostLimit?: number;

  @ApiPropertyOptional({ description: '最小质量评分' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minQualityScore?: number;
}

/**
 * 添加设备到组请求
 */
export class AddDeviceToGroupDto {
  @ApiProperty({ description: '设备ID', example: 'device-123' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ description: '优先级', example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

/**
 * 批量添加设备请求
 */
export class BatchAddDevicesDto {
  @ApiProperty({ description: '设备ID列表', type: [String], example: ['device-1', 'device-2'] })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];
}

/**
 * 分配代理到组请求
 */
export class AssignProxiesToGroupDto {
  @ApiProperty({ description: '代理ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  proxyIds: string[];

  @ApiPropertyOptional({ description: '优先级', example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

/**
 * 设备组详情响应
 */
export class DeviceGroupDetailsResponseDto {
  @ApiProperty({ description: '设备组信息', type: Object })
  group: any;

  @ApiProperty({ description: '设备列表', type: [Object] })
  devices: any[];

  @ApiProperty({ description: '代理列表', type: [Object] })
  proxies: any[];

  @ApiProperty({ description: '组统计', type: Object, nullable: true })
  stats: any | null;
}

/**
 * 自动扩展结果响应
 */
export class AutoScaleResultDto {
  @ApiProperty({ description: '添加的代理数量', example: 5 })
  added: number;

  @ApiProperty({ description: '扩展原因', example: 'Added 5 proxies to meet demand (10 devices)' })
  reason: string;
}

/**
 * 批量操作结果响应
 */
export class BatchOperationResultDto {
  @ApiProperty({ description: '成功数量', example: 8 })
  success: number;

  @ApiProperty({ description: '失败数量', example: 2 })
  failed: number;

  @ApiProperty({ description: '错误列表', type: [Object] })
  errors: Array<{
    deviceId: string;
    error: string;
  }>;
}
