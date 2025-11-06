import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUrl,
  IsArray,
  IsEnum,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export enum ProviderType {
  SMS_ACTIVATE = 'sms-activate',
  FIVESIM = '5sim',
  SMSPOOL = 'smspool',
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
}

export class CreateProviderConfigDto {
  @ApiProperty({ description: '供应商标识', example: 'sms-activate' })
  @IsEnum(ProviderType)
  provider: ProviderType;

  @ApiProperty({ description: '显示名称', example: 'SMS-Activate' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'API端点URL', example: 'https://api.sms-activate.org/stubs/handler_api.php' })
  @IsUrl()
  apiEndpoint: string;

  @ApiProperty({ description: 'API密钥' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: '余额告警阈值', example: 10.00, default: 10.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balanceThreshold?: number;

  @ApiPropertyOptional({ description: '优先级（1=最高）', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ description: '每分钟请求限制', example: 60, default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({ description: '每秒请求限制', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rateLimitPerSecond?: number;

  @ApiPropertyOptional({ description: '并发请求限制', example: 50, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  concurrentRequestsLimit?: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '成本权重', example: 0.4, default: 0.4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  costWeight?: number;

  @ApiPropertyOptional({ description: '速度权重', example: 0.3, default: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  speedWeight?: number;

  @ApiPropertyOptional({ description: '成功率权重', example: 0.3, default: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  successRateWeight?: number;

  @ApiPropertyOptional({ description: '是否启用告警', default: true })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional({ description: '告警渠道', example: ['email', 'sms'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertChannels?: string[];

  @ApiPropertyOptional({ description: '告警接收人', example: ['admin@example.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertRecipients?: string[];

  @ApiPropertyOptional({ description: '是否启用Webhook', default: false })
  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook密钥' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateProviderConfigDto {
  @ApiPropertyOptional({ description: '显示名称' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'API端点URL' })
  @IsOptional()
  @IsUrl()
  apiEndpoint?: string;

  @ApiPropertyOptional({ description: 'API密钥' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: '余额告警阈值' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balanceThreshold?: number;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ description: '每分钟请求限制' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({ description: '每秒请求限制' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rateLimitPerSecond?: number;

  @ApiPropertyOptional({ description: '并发请求限制' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  concurrentRequestsLimit?: number;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '成本权重' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  costWeight?: number;

  @ApiPropertyOptional({ description: '速度权重' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  speedWeight?: number;

  @ApiPropertyOptional({ description: '成功率权重' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  successRateWeight?: number;

  @ApiPropertyOptional({ description: '是否启用告警' })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional({ description: '告警渠道' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertChannels?: string[];

  @ApiPropertyOptional({ description: '告警接收人' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertRecipients?: string[];

  @ApiPropertyOptional({ description: '是否启用Webhook' })
  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook密钥' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ProviderConfigResponseDto {
  @ApiProperty({ description: '供应商ID' })
  id: string;

  @ApiProperty({ description: '供应商标识' })
  provider: string;

  @ApiProperty({ description: '显示名称' })
  displayName: string;

  @ApiProperty({ description: 'API端点URL' })
  apiEndpoint: string;

  @ApiProperty({ description: 'API密钥已加密', example: true })
  apiKeyEncrypted: boolean;

  @ApiPropertyOptional({ description: '当前余额' })
  balance?: number;

  @ApiProperty({ description: '余额告警阈值' })
  balanceThreshold: number;

  @ApiPropertyOptional({ description: '最后余额检查时间' })
  lastBalanceCheck?: Date;

  @ApiProperty({ description: '优先级' })
  priority: number;

  @ApiProperty({ description: '每分钟请求限制' })
  rateLimitPerMinute: number;

  @ApiProperty({ description: '每秒请求限制' })
  rateLimitPerSecond: number;

  @ApiProperty({ description: '并发请求限制' })
  concurrentRequestsLimit: number;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '健康状态', enum: HealthStatus })
  healthStatus: HealthStatus;

  @ApiPropertyOptional({ description: '最后健康检查时间' })
  lastHealthCheck?: Date;

  @ApiProperty({ description: '总请求数' })
  totalRequests: number;

  @ApiProperty({ description: '成功请求数' })
  totalSuccess: number;

  @ApiProperty({ description: '失败请求数' })
  totalFailures: number;

  @ApiProperty({ description: '成功率', example: 95.5 })
  successRate: number;

  @ApiProperty({ description: '成本权重' })
  costWeight: number;

  @ApiProperty({ description: '速度权重' })
  speedWeight: number;

  @ApiProperty({ description: '成功率权重' })
  successRateWeight: number;

  @ApiPropertyOptional({ description: '平均短信接收时间（秒）' })
  avgSmsReceiveTime?: number;

  @ApiPropertyOptional({ description: 'P95短信接收时间（秒）' })
  p95SmsReceiveTime?: number;

  @ApiProperty({ description: '是否启用告警' })
  alertEnabled: boolean;

  @ApiPropertyOptional({ description: '告警渠道' })
  alertChannels?: string[];

  @ApiPropertyOptional({ description: '告警接收人' })
  alertRecipients?: string[];

  @ApiProperty({ description: '是否启用Webhook' })
  webhookEnabled: boolean;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  webhookUrl?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: Record<string, any>;
}
