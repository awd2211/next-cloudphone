import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Max,
  Matches,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, DeviceProviderType } from '../../entities/device.entity';
import { Transform } from 'class-transformer';

export class CreateDeviceDto {
  @ApiProperty({
    description: '设备名称',
    example: 'My Cloud Phone 1',
    maxLength: 100,
  })
  @IsString({ message: '设备名称必须是字符串' })
  @IsNotEmpty({ message: '设备名称不能为空' })
  @MaxLength(100, { message: '设备名称最多100个字符' })
  @Transform(({ value }) => value?.toString().trim())
  name: string;

  @ApiPropertyOptional({
    description: '设备描述',
    example: '用于测试的云手机设备',
    maxLength: 500,
  })
  @IsString({ message: '设备描述必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '设备描述最多500个字符' })
  @Transform(({ value }) => value?.toString().trim())
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
  @IsInt({ message: 'CPU核心数必须是整数' })
  @Min(1, { message: 'CPU核心数至少为1' })
  @Max(16, { message: 'CPU核心数最多为16' })
  @IsOptional()
  cpuCores?: number;

  @ApiPropertyOptional({
    description: '内存大小（MB）',
    example: 4096,
    minimum: 512,
    maximum: 32768,
  })
  @IsInt({ message: '内存大小必须是整数' })
  @Min(512, { message: '内存大小至少512MB' })
  @Max(32768, { message: '内存大小最多32GB (32768MB)' })
  @IsOptional()
  memoryMB?: number;

  @ApiPropertyOptional({
    description: '存储大小（MB）',
    example: 32768,
    minimum: 1024,
    maximum: 1048576,
  })
  @IsInt({ message: '存储大小必须是整数' })
  @Min(1024, { message: '存储大小至少1GB (1024MB)' })
  @Max(1048576, { message: '存储大小最多1TB (1048576MB)' })
  @IsOptional()
  storageMB?: number;

  @ApiPropertyOptional({
    description: '屏幕分辨率',
    example: '1920x1080',
  })
  @IsString({ message: '分辨率必须是字符串' })
  @Matches(/^\d{3,5}x\d{3,5}$/, { message: '分辨率格式必须为: 宽x高 (如: 1920x1080)' })
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({
    description: '屏幕 DPI',
    example: 480,
    minimum: 120,
    maximum: 640,
  })
  @IsInt({ message: 'DPI必须是整数' })
  @Min(120, { message: 'DPI至少为120' })
  @Max(640, { message: 'DPI最多为640' })
  @IsOptional()
  dpi?: number;

  @ApiPropertyOptional({
    description: 'Android 版本',
    example: '13.0',
  })
  @IsString({ message: 'Android版本必须是字符串' })
  @Matches(/^\d{1,2}(\.\d{1,2})?$/, { message: 'Android版本格式必须为: X 或 X.Y (如: 13 或 13.0)' })
  @IsOptional()
  androidVersion?: string;

  @ApiPropertyOptional({
    description: '设备标签',
    type: [String],
    example: ['gaming', 'high-performance'],
    maxItems: 10,
  })
  @IsArray({ message: '标签必须是数组' })
  @ArrayMaxSize(10, { message: '标签数量最多10个' })
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
