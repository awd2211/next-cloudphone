import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, DeviceProviderType } from '../../entities/device.entity';

export class CreateDeviceDto {
  @ApiProperty({
    description: '设备名称',
    example: 'My Cloud Phone 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: '设备描述',
    example: '用于测试的云手机设备',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '设备类型',
    enum: DeviceType,
    example: DeviceType.PHONE,
  })
  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

  @ApiPropertyOptional({
    description: '设备提供商类型 (默认 redroid)',
    enum: DeviceProviderType,
    example: DeviceProviderType.REDROID,
  })
  @IsEnum(DeviceProviderType)
  @IsOptional()
  providerType?: DeviceProviderType;

  @ApiPropertyOptional({
    description: '用户 ID',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: '租户 ID',
    example: 'tenant-123',
  })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'CPU 核心数',
    example: 4,
    minimum: 1,
    maximum: 16,
  })
  @IsInt()
  @IsOptional()
  cpuCores?: number;

  @ApiPropertyOptional({
    description: '内存大小（MB）',
    example: 4096,
    minimum: 512,
  })
  @IsInt()
  @IsOptional()
  memoryMB?: number;

  @ApiPropertyOptional({
    description: '存储大小（MB）',
    example: 32768,
    minimum: 1024,
  })
  @IsInt()
  @IsOptional()
  storageMB?: number;

  @ApiPropertyOptional({
    description: '屏幕分辨率',
    example: '1920x1080',
  })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({
    description: '屏幕 DPI',
    example: 480,
  })
  @IsInt()
  @IsOptional()
  dpi?: number;

  @ApiPropertyOptional({
    description: 'Android 版本',
    example: '13.0',
  })
  @IsString()
  @IsOptional()
  androidVersion?: string;

  @ApiPropertyOptional({
    description: '设备标签',
    type: [String],
    example: ['gaming', 'high-performance'],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: '元数据',
    example: {},
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Provider 特定配置（华为/阿里云等云厂商的特定参数）',
    example: {
      imageId: 'huawei-android-11',
      serverId: 'server-cn-north-4',
      regionId: 'cn-hangzhou',
      zoneId: 'cn-hangzhou-b',
    },
  })
  @IsOptional()
  providerSpecificConfig?: Record<string, any>;
}
