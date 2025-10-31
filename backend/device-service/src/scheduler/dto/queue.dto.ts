import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus, UserPriority } from '../../entities/allocation-queue.entity';

/**
 * 加入队列请求 DTO
 */
export class JoinQueueDto {
  @ApiProperty({
    description: '请求的使用时长（分钟）',
    example: 60,
    minimum: 15,
    maximum: 1440,
  })
  @IsNumber()
  @Min(15)
  @Max(1440)
  durationMinutes: number;

  @ApiPropertyOptional({
    description: '设备类型偏好',
    example: 'android',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({
    description: '最小CPU核心数',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  minCpu?: number;

  @ApiPropertyOptional({
    description: '最小内存（MB）',
    example: 8192,
  })
  @IsOptional()
  @IsNumber()
  minMemory?: number;

  @ApiPropertyOptional({
    description: '最大等待时间（分钟）',
    example: 30,
    minimum: 1,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  maxWaitMinutes?: number = 30;
}

/**
 * 取消队列请求 DTO
 */
export class CancelQueueDto {
  @ApiPropertyOptional({
    description: '取消原因',
    example: '用户主动取消',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 队列查询请求 DTO
 */
export class QueryQueueDto {
  @ApiPropertyOptional({
    description: '用户ID',
    example: 'user-001',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '队列状态',
    enum: QueueStatus,
    example: QueueStatus.WAITING,
  })
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;

  @ApiPropertyOptional({
    description: '设备类型',
    example: 'android',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}

/**
 * 队列条目响应 DTO
 */
export class QueueEntryResponse {
  @ApiProperty({
    description: '队列条目ID',
    example: 'queue-abc123',
  })
  id: string;

  @ApiProperty({
    description: '用户ID',
    example: 'user-001',
  })
  userId: string;

  @ApiProperty({
    description: '队列状态',
    enum: QueueStatus,
    example: QueueStatus.WAITING,
  })
  status: QueueStatus;

  @ApiProperty({
    description: '优先级',
    example: 1,
  })
  priority: number;

  @ApiProperty({
    description: '用户等级',
    example: 'vip',
  })
  userTier: string;

  @ApiProperty({
    description: '排队位置',
    example: 5,
  })
  queuePosition: number;

  @ApiProperty({
    description: '预估等待时间（分钟）',
    example: 15,
  })
  estimatedWaitMinutes: number;

  @ApiProperty({
    description: '最大等待时间（分钟）',
    example: 30,
  })
  maxWaitMinutes: number;

  @ApiProperty({
    description: '请求的使用时长（分钟）',
    example: 60,
  })
  durationMinutes: number;

  @ApiPropertyOptional({
    description: '设备类型偏好',
    example: 'android',
  })
  deviceType?: string;

  @ApiPropertyOptional({
    description: '已分配的设备ID',
    example: 'device-xyz789',
  })
  allocatedDeviceId?: string;

  @ApiPropertyOptional({
    description: '分配记录ID',
    example: 'alloc-def456',
  })
  allocationId?: string;

  @ApiProperty({
    description: '重试次数',
    example: 0,
  })
  retryCount: number;

  @ApiProperty({
    description: '创建时间',
    example: '2025-10-30T15:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: '处理时间',
    example: '2025-10-30T15:05:00Z',
  })
  processedAt?: string;

  @ApiPropertyOptional({
    description: '满足时间',
    example: '2025-10-30T15:05:00Z',
  })
  fulfilledAt?: string;

  @ApiPropertyOptional({
    description: '取消时间',
    example: '2025-10-30T15:03:00Z',
  })
  cancelledAt?: string;

  @ApiPropertyOptional({
    description: '取消原因',
    example: '用户主动取消',
  })
  cancelReason?: string;

  @ApiPropertyOptional({
    description: '过期时间',
    example: '2025-10-30T15:30:00Z',
  })
  expiredAt?: string;

  @ApiPropertyOptional({
    description: '过期原因',
    example: '等待超时',
  })
  expiryReason?: string;
}

/**
 * 队列列表响应 DTO
 */
export class QueueListResponse {
  @ApiProperty({
    description: '队列条目列表',
    type: [QueueEntryResponse],
  })
  entries: QueueEntryResponse[];

  @ApiProperty({
    description: '总数',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: '总页数',
    example: 3,
  })
  totalPages: number;
}

/**
 * 队列统计信息 DTO
 */
export class QueueStatistics {
  @ApiProperty({
    description: '等待中的数量',
    example: 15,
  })
  waitingCount: number;

  @ApiProperty({
    description: '处理中的数量',
    example: 3,
  })
  processingCount: number;

  @ApiProperty({
    description: '已满足的数量',
    example: 120,
  })
  fulfilledCount: number;

  @ApiProperty({
    description: '已过期的数量',
    example: 8,
  })
  expiredCount: number;

  @ApiProperty({
    description: '已取消的数量',
    example: 5,
  })
  cancelledCount: number;

  @ApiProperty({
    description: '总数',
    example: 151,
  })
  totalCount: number;

  @ApiProperty({
    description: '成功率（已满足 / (总数 - 已取消)）',
    example: 0.82,
  })
  successRate: number;

  @ApiProperty({
    description: '平均等待时间（分钟）',
    example: 8.5,
  })
  averageWaitMinutes: number;

  @ApiProperty({
    description: '按优先级分组的统计',
    example: {
      standard: { waiting: 10, fulfilled: 80 },
      vip: { waiting: 5, fulfilled: 40 },
    },
  })
  byPriority: Record<string, { waiting: number; fulfilled: number }>;
}

/**
 * 队列位置信息 DTO
 */
export class QueuePositionResponse {
  @ApiProperty({
    description: '队列条目ID',
    example: 'queue-abc123',
  })
  queueId: string;

  @ApiProperty({
    description: '当前排队位置',
    example: 5,
  })
  position: number;

  @ApiProperty({
    description: '前面等待的人数',
    example: 4,
  })
  aheadCount: number;

  @ApiProperty({
    description: '预估等待时间（分钟）',
    example: 12,
  })
  estimatedWaitMinutes: number;

  @ApiProperty({
    description: '已等待时间（分钟）',
    example: 3,
  })
  waitedMinutes: number;

  @ApiProperty({
    description: '剩余最大等待时间（分钟）',
    example: 27,
  })
  remainingMaxWaitMinutes: number;
}

/**
 * 批量处理队列请求 DTO
 */
export class ProcessQueueBatchDto {
  @ApiPropertyOptional({
    description: '最大处理数量',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxCount?: number = 10;

  @ApiPropertyOptional({
    description: '只处理特定设备类型',
    example: 'android',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({
    description: '是否在出错时继续',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;
}

/**
 * 批量处理结果 DTO
 */
export class ProcessQueueBatchResult {
  @ApiProperty({
    description: '处理总数',
    example: 10,
  })
  totalProcessed: number;

  @ApiProperty({
    description: '成功数',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: '失败数',
    example: 2,
  })
  failedCount: number;

  @ApiProperty({
    description: '成功的条目',
    type: Array,
  })
  successes: Array<{
    queueId: string;
    userId: string;
    deviceId: string;
    allocationId: string;
  }>;

  @ApiProperty({
    description: '失败的条目',
    type: Array,
  })
  failures: Array<{
    queueId: string;
    userId: string;
    reason: string;
  }>;

  @ApiProperty({
    description: '执行时间（毫秒）',
    example: 1250,
  })
  executionTimeMs: number;
}
