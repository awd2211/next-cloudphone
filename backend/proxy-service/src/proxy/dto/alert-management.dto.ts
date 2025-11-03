import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  IsEmail,
  IsUrl,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建告警通道请求
 */
export class CreateAlertChannelDto {
  @ApiProperty({ description: '通道名称', example: 'Emergency Email' })
  @IsString()
  channelName: string;

  @ApiProperty({
    description: '通道类型',
    enum: ['email', 'sms', 'webhook', 'dingtalk', 'wechat', 'slack'],
    example: 'email',
  })
  @IsEnum(['email', 'sms', 'webhook', 'dingtalk', 'wechat', 'slack'])
  channelType: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '是否默认通道', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '优先级', example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  // Email配置
  @ApiPropertyOptional({ description: 'Email地址列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emailAddresses?: string[];

  // SMS配置
  @ApiPropertyOptional({ description: '手机号列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phoneNumbers?: string[];

  // Webhook配置
  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook方法', enum: ['GET', 'POST', 'PUT'], default: 'POST' })
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT'])
  webhookMethod?: string;

  @ApiPropertyOptional({ description: 'Webhook Headers', type: Object })
  @IsOptional()
  webhookHeaders?: Record<string, string>;

  // DingTalk配置
  @ApiPropertyOptional({ description: 'DingTalk Webhook URL' })
  @IsOptional()
  @IsUrl()
  dingtalkWebhookUrl?: string;

  @ApiPropertyOptional({ description: 'DingTalk签名密钥' })
  @IsOptional()
  @IsString()
  dingtalkSecret?: string;

  // WeChat配置
  @ApiPropertyOptional({ description: 'WeChat Work Webhook URL' })
  @IsOptional()
  @IsUrl()
  wechatWebhookUrl?: string;

  // Slack配置
  @ApiPropertyOptional({ description: 'Slack Webhook URL' })
  @IsOptional()
  @IsUrl()
  slackWebhookUrl?: string;

  @ApiPropertyOptional({ description: 'Slack频道', example: '#alerts' })
  @IsOptional()
  @IsString()
  slackChannel?: string;

  // 告警级别过滤
  @ApiProperty({ description: '允许的告警级别', type: [String], example: ['warning', 'critical'] })
  @IsArray()
  @IsString({ each: true })
  alertLevels: string[];

  @ApiPropertyOptional({ description: '最大告警数/小时', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxAlertsPerHour?: number;
}

/**
 * 更新告警通道请求
 */
export class UpdateAlertChannelDto {
  @ApiPropertyOptional({ description: '通道名称' })
  @IsOptional()
  @IsString()
  channelName?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Email地址列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emailAddresses?: string[];

  @ApiPropertyOptional({ description: '告警级别', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertLevels?: string[];
}

/**
 * 告警条件配置
 */
export class AlertConditionDto {
  @ApiProperty({ description: '监控指标', example: 'success_rate' })
  @IsString()
  metric: string;

  @ApiProperty({ description: '操作符', enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'between'] })
  @IsEnum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'between'])
  operator: string;

  @ApiProperty({ description: '阈值', example: 80.0 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: '持续时间（秒）', example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

/**
 * 创建告警规则请求
 */
export class CreateAlertRuleDto {
  @ApiProperty({ description: '规则名称', example: 'Low Success Rate Alert' })
  @IsString()
  ruleName: string;

  @ApiPropertyOptional({ description: '规则描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '规则类型',
    enum: ['quality_degradation', 'cost_overrun', 'failover_frequent', 'session_expiring', 'provider_down'],
    example: 'quality_degradation',
  })
  @IsEnum(['quality_degradation', 'cost_overrun', 'failover_frequent', 'session_expiring', 'provider_down'])
  ruleType: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({
    description: '监控范围',
    enum: ['all', 'user', 'device', 'group', 'proxy', 'provider'],
    example: 'user',
  })
  @IsEnum(['all', 'user', 'device', 'group', 'proxy', 'provider'])
  monitorScope: string;

  @ApiPropertyOptional({ description: '监控目标ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  monitorTargets?: string[];

  @ApiProperty({
    description: '条件类型',
    enum: ['threshold', 'change_rate', 'anomaly', 'pattern'],
    example: 'threshold',
  })
  @IsEnum(['threshold', 'change_rate', 'anomaly', 'pattern'])
  conditionType: string;

  @ApiProperty({ description: '监控指标', example: 'success_rate' })
  @IsString()
  metricName: string;

  @ApiProperty({ description: '操作符', enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'between'] })
  @IsEnum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'between'])
  operator: string;

  @ApiPropertyOptional({ description: '阈值', example: 80.0 })
  @IsOptional()
  @IsNumber()
  thresholdValue?: number;

  @ApiPropertyOptional({ description: '评估窗口（秒）', example: 300, default: 300 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  evaluationWindow?: number;

  @ApiProperty({ description: '告警级别', enum: ['info', 'warning', 'critical'], example: 'warning' })
  @IsEnum(['info', 'warning', 'critical'])
  alertLevel: string;

  @ApiProperty({ description: '通知通道ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  notificationChannels: string[];

  @ApiPropertyOptional({ description: '启用自动处理', default: false })
  @IsOptional()
  @IsBoolean()
  autoActionEnabled?: boolean;

  @ApiPropertyOptional({
    description: '自动操作类型',
    enum: ['failover', 'stop_usage', 'switch_provider', 'adjust_budget'],
  })
  @IsOptional()
  @IsEnum(['failover', 'stop_usage', 'switch_provider', 'adjust_budget'])
  autoActionType?: string;

  @ApiPropertyOptional({ description: '冷却期（秒）', default: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cooldownPeriod?: number;
}

/**
 * 更新告警规则请求
 */
export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: '规则名称' })
  @IsOptional()
  @IsString()
  ruleName?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '阈值' })
  @IsOptional()
  @IsNumber()
  thresholdValue?: number;

  @ApiPropertyOptional({ description: '告警级别', enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'])
  alertLevel?: string;

  @ApiPropertyOptional({ description: '通知通道ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];

  @ApiPropertyOptional({ description: '启用自动处理' })
  @IsOptional()
  @IsBoolean()
  autoActionEnabled?: boolean;
}

/**
 * 确认告警请求
 */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ description: '确认备注' })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * 解决告警请求
 */
export class ResolveAlertDto {
  @ApiProperty({ description: '解决方案描述' })
  @IsString()
  resolutionNote: string;
}

/**
 * 告警统计响应
 */
export class AlertStatisticsDto {
  @ApiProperty({ description: '总告警数', example: 150 })
  totalAlerts: number;

  @ApiProperty({ description: '活跃告警数', example: 5 })
  activeAlerts: number;

  @ApiProperty({ description: '已确认告警数', example: 10 })
  acknowledgedAlerts: number;

  @ApiProperty({ description: '已解决告警数', example: 135 })
  resolvedAlerts: number;

  @ApiProperty({ description: '告警级别分布', type: Object })
  levelDistribution: {
    info: number;
    warning: number;
    critical: number;
  };

  @ApiProperty({ description: '平均解决时间（秒）', example: 1800 })
  avgResolutionTime: number;

  @ApiProperty({ description: '最近24小时告警趋势', type: [Object] })
  recentTrend: Array<{
    hour: string;
    count: number;
  }>;
}

/**
 * 测试告警通道请求
 */
export class TestAlertChannelDto {
  @ApiProperty({ description: '测试消息', example: 'This is a test alert' })
  @IsString()
  testMessage: string;

  @ApiPropertyOptional({ description: '告警级别', enum: ['info', 'warning', 'critical'], default: 'info' })
  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'])
  alertLevel?: string;
}
