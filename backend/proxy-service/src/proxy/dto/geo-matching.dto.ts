import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';

/**
 * 配置设备地理位置请求
 */
export class ConfigureDeviceGeoDto {
  @ApiProperty({ description: '设备ID', example: 'device-12345' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: '用户ID', example: 'user-67890' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '目标国家代码', example: 'US' })
  @IsString()
  targetCountry: string;

  @ApiPropertyOptional({ description: '目标城市', example: 'New York' })
  @IsOptional()
  @IsString()
  targetCity?: string;

  @ApiPropertyOptional({ description: '目标地区', example: 'New York State' })
  @IsOptional()
  @IsString()
  targetRegion?: string;

  @ApiPropertyOptional({
    description: 'ISP类型',
    enum: ['residential', 'datacenter', 'mobile'],
    example: 'residential',
  })
  @IsOptional()
  @IsEnum(['residential', 'datacenter', 'mobile'])
  ispType?: string;

  @ApiPropertyOptional({
    description: '首选提供商列表',
    type: [String],
    example: ['BrightData', 'IPRoyal'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredProviders?: string[];

  @ApiPropertyOptional({
    description: '是否自动匹配',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoMatch?: boolean;

  @ApiPropertyOptional({
    description: '优先级（1-10）',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({
    description: '元数据',
    example: { purpose: 'social_media', platform: 'instagram' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 地理匹配查询请求
 */
export class GeoMatchQueryDto {
  @ApiPropertyOptional({ description: '设备ID', example: 'device-12345' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: '目标国家', example: 'US' })
  @IsString()
  targetCountry: string;

  @ApiPropertyOptional({ description: '目标城市', example: 'New York' })
  @IsOptional()
  @IsString()
  targetCity?: string;

  @ApiPropertyOptional({
    description: 'ISP类型',
    enum: ['residential', 'datacenter', 'mobile'],
    example: 'residential',
  })
  @IsOptional()
  @IsEnum(['residential', 'datacenter', 'mobile'])
  ispType?: string;

  @ApiPropertyOptional({
    description: '返回数量限制',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * 地理推荐请求
 */
export class GeoRecommendationDto {
  @ApiProperty({ description: '目标URL', example: 'https://www.instagram.com' })
  @IsString()
  targetUrl: string;

  @ApiProperty({ description: '用户ID', example: 'user-12345' })
  @IsString()
  userId: string;
}

/**
 * 批量配置地理位置请求
 */
export class BatchConfigureGeoDto {
  @ApiProperty({
    description: '设备配置列表',
    type: [ConfigureDeviceGeoDto],
  })
  @IsArray()
  configs: ConfigureDeviceGeoDto[];
}

/**
 * 设备地理配置响应
 */
export class DeviceGeoSettingResponseDto {
  @ApiProperty({ description: '配置ID', example: 'geo-12345' })
  id: string;

  @ApiProperty({ description: '设备ID', example: 'device-12345' })
  deviceId: string;

  @ApiProperty({ description: '用户ID', example: 'user-67890' })
  userId: string;

  @ApiProperty({ description: '目标国家', example: 'US' })
  targetCountry: string;

  @ApiProperty({ description: '目标城市', example: 'New York' })
  targetCity?: string;

  @ApiProperty({ description: '目标地区', example: 'New York State' })
  targetRegion?: string;

  @ApiProperty({
    description: 'ISP类型',
    example: 'residential',
    enum: ['residential', 'datacenter', 'mobile'],
  })
  ispType?: string;

  @ApiProperty({
    description: '首选提供商',
    type: [String],
    example: ['BrightData'],
  })
  preferredProviders: string[];

  @ApiProperty({ description: '是否自动匹配', example: true })
  autoMatch: boolean;

  @ApiProperty({ description: '优先级', example: 5 })
  priority: number;

  @ApiProperty({
    description: '创建时间',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-01-20T15:45:00Z',
  })
  updatedAt: Date;
}

/**
 * 地理匹配结果响应
 */
export class GeoMatchResultDto {
  @ApiProperty({ description: '代理信息', type: Object })
  proxy: any;

  @ApiProperty({ description: '匹配分数', example: 85 })
  matchScore: number;

  @ApiProperty({
    description: '匹配原因',
    type: [String],
    example: ['Country match: US', 'City match: New York', 'ISP type match: residential'],
  })
  matchReasons: string[];
}

/**
 * 地理推荐响应
 */
export class GeoRecommendationResponseDto {
  @ApiProperty({ description: '推荐国家', example: 'US' })
  recommendedCountry: string;

  @ApiProperty({ description: '推荐城市', example: 'Los Angeles' })
  recommendedCity?: string;

  @ApiProperty({
    description: '推荐原因',
    example: 'Instagram headquarters in California, US proxies recommended',
  })
  reason: string;

  @ApiProperty({
    description: '备选方案',
    type: [Object],
    example: [
      { country: 'GB', city: 'London', reason: 'European users' },
      { country: 'BR', city: 'São Paulo', reason: 'Latin American users' },
    ],
  })
  alternatives: Array<{
    country: string;
    city?: string;
    reason: string;
  }>;
}

/**
 * ISP提供商响应
 */
export class IspProviderResponseDto {
  @ApiProperty({ description: '提供商ID', example: 'isp-12345' })
  id: string;

  @ApiProperty({ description: '国家', example: 'US' })
  country: string;

  @ApiProperty({ description: 'ISP名称', example: 'Comcast' })
  ispName: string;

  @ApiProperty({
    description: 'ISP类型',
    example: 'residential',
    enum: ['residential', 'datacenter', 'mobile'],
  })
  ispType: string;

  @ApiProperty({ description: '代理数量', example: 150 })
  proxyCount: number;

  @ApiProperty({ description: '最后更新时间', example: '2025-01-20T10:30:00Z' })
  lastUpdated: Date;
}

/**
 * 地理统计响应
 */
export class GeoStatisticsResponseDto {
  @ApiProperty({ description: '总设备数', example: 100 })
  totalDevices: number;

  @ApiProperty({
    description: '按国家分布',
    example: { US: 45, GB: 20, DE: 15, FR: 10, JP: 10 },
  })
  devicesByCountry: Record<string, number>;

  @ApiProperty({
    description: '按ISP类型分布',
    example: { residential: 60, datacenter: 30, mobile: 10 },
  })
  devicesByIspType: Record<string, number>;

  @ApiProperty({
    description: 'Top 10城市',
    type: [Object],
    example: [
      { city: 'New York', count: 15 },
      { city: 'Los Angeles', count: 12 },
    ],
  })
  topCities: Array<{ city: string; count: number }>;
}
