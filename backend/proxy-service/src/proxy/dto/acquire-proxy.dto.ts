import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

/**
 * 获取代理请求DTO
 */
export class AcquireProxyDto {
  @ApiPropertyOptional({
    description: '国家代码 (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: '城市名称',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: '州/省名称',
    example: 'California',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: '协议类型',
    enum: ['http', 'https', 'socks5'],
    example: 'http',
  })
  @IsOptional()
  @IsEnum(['http', 'https', 'socks5'])
  protocol?: 'http' | 'https' | 'socks5';

  @ApiPropertyOptional({
    description: '最低质量分数 (0-100)',
    minimum: 0,
    maximum: 100,
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minQuality?: number;

  @ApiPropertyOptional({
    description: '最大延迟（毫秒）',
    example: 2000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLatency?: number;

  @ApiPropertyOptional({
    description: '是否需要会话保持',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  sessionSticky?: boolean;

  @ApiPropertyOptional({
    description: '指定供应商',
    enum: ['iproyal', 'brightdata', 'oxylabs'],
    example: 'iproyal',
  })
  @IsOptional()
  @IsEnum(['iproyal', 'brightdata', 'oxylabs'])
  provider?: string;

  @ApiPropertyOptional({
    description: '最大每GB成本（USD）',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCostPerGB?: number;

  @ApiPropertyOptional({
    description: '设备ID（用于关联使用记录）',
    example: 'device-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: '用户ID（用于关联使用记录）',
    example: 'user-456',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
