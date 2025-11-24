import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  Min,
} from 'class-validator';

export enum ProxyProviderType {
  BRIGHTDATA = 'brightdata',
  OXYLABS = 'oxylabs',
  IPROYAL = 'iproyal',
  SMARTPROXY = 'smartproxy',
  IPIDEA = 'ipidea',  // 家宽代理
  KOOKEEY = 'kookeey',  // 家宽代理
}

export class CreateProxyProviderDto {
  @ApiProperty({ description: '供应商名称', example: 'Bright Data' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '供应商类型',
    enum: ProxyProviderType,
    example: ProxyProviderType.BRIGHTDATA,
  })
  @IsEnum(ProxyProviderType)
  type: ProxyProviderType;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '优先级（值越大优先级越高）', example: 100, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiProperty({ description: '供应商配置（包含API密钥等）' })
  @IsObject()
  config: {
    apiKey?: string;
    username?: string;
    password?: string;
    apiUrl?: string;
    zone?: string;
    [key: string]: any;
  };

  @ApiProperty({ description: '每GB成本（USD）', example: 10.00 })
  @IsNumber()
  @Min(0)
  costPerGB: number;
}

export class UpdateProxyProviderDto {
  @ApiPropertyOptional({ description: '供应商名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '优先级（值越大优先级越高）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: '供应商配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '每GB成本（USD）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerGB?: number;
}

export class ProxyProviderResponseDto {
  @ApiProperty({ description: '供应商ID' })
  id: string;

  @ApiProperty({ description: '供应商名称' })
  name: string;

  @ApiProperty({ description: '供应商类型', enum: ProxyProviderType })
  type: string;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '优先级' })
  priority: number;

  @ApiProperty({ description: '每GB成本（USD）' })
  costPerGB: number;

  @ApiProperty({ description: '总请求数' })
  totalRequests: number;

  @ApiProperty({ description: '成功请求数' })
  successRequests: number;

  @ApiProperty({ description: '失败请求数' })
  failedRequests: number;

  @ApiProperty({ description: '成功率（%）' })
  successRate: number;

  @ApiProperty({ description: '平均延迟（毫秒）' })
  avgLatencyMs: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '是否有配置（不返回实际配置内容）' })
  hasConfig?: boolean;
}

export class TestProviderConnectionDto {
  @ApiPropertyOptional({ description: '测试端点（留空使用默认）' })
  @IsOptional()
  @IsString()
  testEndpoint?: string;

  @ApiPropertyOptional({ description: '超时时间（毫秒）', default: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;
}
