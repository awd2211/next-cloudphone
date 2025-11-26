import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProxyProtocol } from '../../common/interfaces';

/**
 * 列出代理的查询参数 DTO
 */
export class ListProxiesDto {
  @ApiProperty({
    description: '国家代码 (ISO 3166-1 alpha-2)',
    example: 'US',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description: '城市',
    example: 'New York',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: '州/省',
    example: 'NY',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: '协议类型',
    enum: ProxyProtocol,
    example: ProxyProtocol.HTTP,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProxyProtocol)
  protocol?: ProxyProtocol;

  @ApiProperty({
    description: '最低质量分数 (0-100)',
    example: 70,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minQuality?: number;

  @ApiProperty({
    description: '最大延迟 (ms)',
    example: 500,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxLatency?: number;

  @ApiProperty({
    description: '最大每GB成本 (USD)',
    example: 5.0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  maxCostPerGB?: number;

  @ApiProperty({
    description: '供应商名称',
    example: 'brightdata',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: '代理状态 (available, in_use, unavailable, testing)',
    example: 'available',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: '是否只返回可用代理',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableOnly?: boolean;

  @ApiProperty({
    description: '返回数量限制',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: '偏移量',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
