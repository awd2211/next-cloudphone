import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsObject,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

/**
 * 记录成本请求
 */
export class RecordCostDto {
  @ApiProperty({ description: '用户ID', example: 'user-12345' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: '设备ID', example: 'device-67890' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '会话ID', example: 'session-abc123' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: '代理ID', example: 'proxy-xyz789' })
  @IsString()
  proxyId: string;

  @ApiProperty({ description: '提供商', example: 'BrightData' })
  @IsString()
  provider: string;

  @ApiProperty({
    description: '成本类型',
    enum: ['time', 'bandwidth', 'request'],
    example: 'bandwidth',
  })
  @IsEnum(['time', 'bandwidth', 'request'])
  costType: 'time' | 'bandwidth' | 'request';

  @ApiPropertyOptional({
    description: '数据传输量（字节）',
    example: 1048576,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dataTransferred?: number;

  @ApiPropertyOptional({ description: '请求次数', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  requestCount?: number;

  @ApiPropertyOptional({ description: '使用时长（秒）', example: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @ApiProperty({ description: '单位成本', example: 0.01 })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty({ description: '总成本', example: 10.24 })
  @IsNumber()
  @Min(0)
  totalCost: number;

  @ApiPropertyOptional({
    description: '元数据',
    example: { region: 'us-east', purpose: 'scraping' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 配置预算请求
 */
export class ConfigureBudgetDto {
  @ApiProperty({ description: '用户ID', example: 'user-12345' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: '设备ID（可选，用于设备级预算）',
    example: 'device-67890',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: '预算类型',
    enum: ['daily', 'weekly', 'monthly'],
    example: 'monthly',
  })
  @IsEnum(['daily', 'weekly', 'monthly'])
  budgetType: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ description: '预算金额', example: 1000.0 })
  @IsNumber()
  @Min(0)
  budgetAmount: number;

  @ApiProperty({ description: '货币', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: '告警阈值（百分比）',
    type: [Number],
    example: [50, 80, 95, 100],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  alertThresholds: number[];

  @ApiPropertyOptional({
    description: '超出预算后是否自动停止',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoStop?: boolean;
}

/**
 * 成本统计查询
 */
export class CostStatisticsQueryDto {
  @ApiProperty({ description: '用户ID', example: 'user-12345' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: '设备ID', example: 'device-67890' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: '开始日期',
    example: '2025-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '结束日期',
    example: '2025-01-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: '分组方式',
    enum: ['day', 'provider', 'device'],
    example: 'day',
  })
  @IsOptional()
  @IsEnum(['day', 'provider', 'device'])
  groupBy?: string;
}

/**
 * 预算响应
 */
export class BudgetResponseDto {
  @ApiProperty({ description: '预算ID', example: 'budget-12345' })
  id: string;

  @ApiProperty({ description: '用户ID', example: 'user-12345' })
  userId: string;

  @ApiProperty({ description: '设备ID', example: 'device-67890' })
  deviceId?: string;

  @ApiProperty({
    description: '预算类型',
    enum: ['daily', 'weekly', 'monthly'],
    example: 'monthly',
  })
  budgetType: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ description: '预算金额', example: 1000.0 })
  budgetAmount: number;

  @ApiProperty({ description: '已使用金额', example: 523.45 })
  spentAmount: number;

  @ApiProperty({ description: '货币', example: 'USD' })
  currency: string;

  @ApiProperty({
    description: '告警阈值',
    type: [Number],
    example: [50, 80, 95, 100],
  })
  alertThresholds: number[];

  @ApiProperty({ description: '是否自动停止', example: false })
  autoStop: boolean;

  @ApiProperty({ description: '周期开始时间', example: '2025-01-01T00:00:00Z' })
  periodStart: Date;

  @ApiProperty({ description: '周期结束时间', example: '2025-01-31T23:59:59Z' })
  periodEnd: Date;

  @ApiProperty({ description: '使用百分比', example: 52.35 })
  usagePercentage: number;
}

/**
 * 成本统计响应
 */
export class CostStatisticsResponseDto {
  @ApiProperty({ description: '总成本', example: 523.45 })
  totalCost: number;

  @ApiProperty({ description: '总请求数', example: 10000 })
  totalRequests: number;

  @ApiProperty({ description: '总数据传输量（字节）', example: 10485760 })
  totalDataTransferred: number;

  @ApiProperty({ description: '平均每请求成本', example: 0.052 })
  avgCostPerRequest: number;

  @ApiProperty({
    description: '按成本类型分解',
    example: { bandwidth: 300.5, request: 150.25, time: 72.7 },
  })
  costByType: Record<string, number>;

  @ApiPropertyOptional({
    description: '时间线数据',
    type: [Object],
    example: [
      { date: '2025-01-01', cost: 15.3, requests: 300 },
      { date: '2025-01-02', cost: 18.7, requests: 350 },
    ],
  })
  timeline?: any[];

  @ApiPropertyOptional({
    description: '分解数据',
    type: [Object],
    example: [
      { provider: 'BrightData', cost: 300.5, requests: 5000 },
      { provider: 'IPRoyal', cost: 222.95, requests: 5000 },
    ],
  })
  breakdown?: any[];
}

/**
 * 成本告警响应
 */
export class CostAlertResponseDto {
  @ApiProperty({ description: '告警ID', example: 'alert-12345' })
  id: string;

  @ApiProperty({ description: '预算ID', example: 'budget-12345' })
  budgetId: string;

  @ApiProperty({ description: '用户ID', example: 'user-12345' })
  userId: string;

  @ApiProperty({ description: '设备ID', example: 'device-67890' })
  deviceId?: string;

  @ApiProperty({ description: '触发阈值（百分比）', example: 80 })
  threshold: number;

  @ApiProperty({ description: '当前花费', example: 823.45 })
  currentSpending: number;

  @ApiProperty({ description: '预算金额', example: 1000.0 })
  budgetAmount: number;

  @ApiProperty({ description: '使用百分比', example: 82.35 })
  percentage: number;

  @ApiProperty({ description: '是否已确认', example: false })
  acknowledged: boolean;

  @ApiProperty({ description: '创建时间', example: '2025-01-15T10:30:00Z' })
  createdAt: Date;
}

/**
 * 成本优化建议响应
 */
export class CostOptimizationResponseDto {
  @ApiProperty({ description: '总潜在节省', example: 150.25 })
  totalPotentialSavings: number;

  @ApiProperty({
    description: '优化建议列表',
    type: [Object],
    example: [
      {
        type: 'provider_switch',
        description: 'Provider BrightData costs 50% more than IPRoyal',
        potentialSavings: 150.25,
        action: 'Consider switching traffic from BrightData to IPRoyal',
      },
    ],
  })
  recommendations: Array<{
    type: string;
    description: string;
    potentialSavings: number;
    action: string;
  }>;
}
