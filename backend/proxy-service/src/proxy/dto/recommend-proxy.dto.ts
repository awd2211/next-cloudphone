import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 代理需求配置
 */
export class ProxyRequirements {
  @ApiPropertyOptional({
    description: '最小质量分',
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minQuality?: number;

  @ApiPropertyOptional({
    description: '最大延迟（毫秒）',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLatency?: number;

  @ApiPropertyOptional({
    description: '最大成本（$/GB）',
    example: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCostPerGB?: number;

  @ApiPropertyOptional({
    description: 'ISP类型',
    enum: ['residential', 'datacenter', 'mobile'],
    example: 'residential',
  })
  @IsOptional()
  @IsEnum(['residential', 'datacenter', 'mobile'])
  ispType?: string;
}

/**
 * 历史记录（用于改进推荐）
 */
export class ProxyHistory {
  @ApiPropertyOptional({
    description: '最近失败的代理ID列表（黑名单）',
    type: [String],
    example: ['proxy-123', 'proxy-456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentFailures?: string[];

  @ApiPropertyOptional({
    description: '最近成功的代理ID列表',
    type: [String],
    example: ['proxy-789', 'proxy-012'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentSuccesses?: string[];
}

/**
 * 智能推荐代理请求
 */
export class RecommendProxyDto {
  @ApiProperty({
    description: '设备ID',
    example: 'device-12345',
  })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({
    description: '目标URL（可选，用于针对性推荐）',
    example: 'https://www.instagram.com',
  })
  @IsOptional()
  @IsString()
  targetUrl?: string;

  @ApiPropertyOptional({
    description: '目标国家代码',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  targetCountry?: string;

  @ApiPropertyOptional({
    description: '目标城市',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  targetCity?: string;

  @ApiPropertyOptional({
    description: '代理需求配置',
    type: ProxyRequirements,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProxyRequirements)
  requirements?: ProxyRequirements;

  @ApiPropertyOptional({
    description: '历史记录',
    type: ProxyHistory,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProxyHistory)
  history?: ProxyHistory;

  @ApiPropertyOptional({
    description: '会话持续时间（秒）',
    example: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  sessionDuration?: number;

  @ApiPropertyOptional({
    description: '用户ID',
    example: 'user-12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
