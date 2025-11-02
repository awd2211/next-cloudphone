import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 虚拟号码响应 DTO
 */
export class NumberResponseDto {
  @ApiProperty({ description: '号码ID' })
  id: string;

  @ApiProperty({ description: '平台名称', example: 'sms-activate' })
  provider: string;

  @ApiProperty({ description: '电话号码', example: '+79123456789' })
  phoneNumber: string;

  @ApiProperty({ description: '国家代码', example: 'RU' })
  countryCode: string;

  @ApiPropertyOptional({ description: '国家名称', example: 'Russia' })
  countryName?: string;

  @ApiProperty({ description: '服务代码', example: 'tg' })
  serviceCode: string;

  @ApiProperty({ description: '服务名称', example: 'telegram' })
  serviceName: string;

  @ApiProperty({ description: '状态', example: 'active' })
  status: string;

  @ApiProperty({ description: '成本（USD）', example: 0.08 })
  cost: number;

  @ApiProperty({ description: '设备ID' })
  deviceId: string;

  @ApiPropertyOptional({ description: '用户ID' })
  userId?: string;

  @ApiProperty({ description: '激活时间' })
  activatedAt: Date;

  @ApiProperty({ description: '过期时间' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: '短信接收时间' })
  smsReceivedAt?: Date;

  @ApiPropertyOptional({ description: '完成时间' })
  completedAt?: Date;

  @ApiProperty({ description: '是否来自号码池' })
  fromPool: boolean;

  @ApiProperty({ description: '选择算法', example: 'smart-routing' })
  selectedByAlgorithm: string;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: Record<string, any>;
}

/**
 * 短信消息响应 DTO
 */
export class SmsMessageResponseDto {
  @ApiProperty({ description: '消息ID' })
  id: string;

  @ApiProperty({ description: '虚拟号码ID' })
  virtualNumberId: string;

  @ApiPropertyOptional({ description: '验证码', example: '123456' })
  verificationCode?: string;

  @ApiPropertyOptional({ description: '短信内容' })
  messageText?: string;

  @ApiPropertyOptional({ description: '发送者' })
  sender?: string;

  @ApiProperty({ description: '接收时间' })
  receivedAt: Date;

  @ApiProperty({ description: '是否已发送到设备' })
  deliveredToDevice: boolean;
}

/**
 * 批量请求响应 DTO
 */
export class BatchResponseDto {
  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '成功数' })
  successful: number;

  @ApiProperty({ description: '失败数' })
  failed: number;

  @ApiProperty({
    description: '详细结果',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        numberId: { type: 'string', nullable: true },
        phoneNumber: { type: 'string', nullable: true },
        provider: { type: 'string', nullable: true },
        error: { type: 'string', nullable: true },
      },
    },
  })
  numbers: Array<{
    deviceId: string;
    numberId: string | null;
    phoneNumber: string | null;
    provider: string | null;
    error: string | null;
  }>;
}

/**
 * 统计信息响应 DTO
 */
export class StatsResponseDto {
  @ApiProperty({ description: '是否正在轮询' })
  isPolling: boolean;

  @ApiProperty({ description: '活跃号码数' })
  activeNumbers: number;

  @ApiProperty({ description: '今日接收数' })
  receivedToday: number;

  @ApiProperty({ description: '今日过期数' })
  expiredToday: number;
}

/**
 * 平台统计响应 DTO
 */
export class ProviderStatsResponseDto {
  @ApiProperty({ description: '平台名称' })
  providerName: string;

  @ApiProperty({ description: '总请求数' })
  totalRequests: number;

  @ApiProperty({ description: '成功数' })
  successCount: number;

  @ApiProperty({ description: '失败数' })
  failureCount: number;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  averageResponseTime: number;

  @ApiProperty({ description: '平均成本（USD）' })
  averageCost: number;

  @ApiProperty({ description: '成功率（%）' })
  successRate: number;

  @ApiProperty({ description: '是否健康' })
  isHealthy: boolean;

  @ApiPropertyOptional({ description: '连续失败次数' })
  consecutiveFailures?: number;
}
