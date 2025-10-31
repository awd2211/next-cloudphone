import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  Min,
  Max,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../../entities/device-reservation.entity';

/**
 * 创建预约请求 DTO
 */
export class CreateReservationDto {
  @ApiProperty({
    description: '预约开始时间（ISO 8601格式）',
    example: '2025-10-31T10:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  reservedStartTime: Date;

  @ApiProperty({
    description: '预约时长（分钟）',
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
    description: '提前提醒时间（分钟）',
    example: 15,
    minimum: 0,
    maximum: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  remindBeforeMinutes?: number = 15;
}

/**
 * 更新预约请求 DTO
 */
export class UpdateReservationDto {
  @ApiPropertyOptional({
    description: '预约开始时间',
    example: '2025-10-31T11:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reservedStartTime?: Date;

  @ApiPropertyOptional({
    description: '预约时长（分钟）',
    example: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(1440)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: '提前提醒时间（分钟）',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  remindBeforeMinutes?: number;
}

/**
 * 取消预约请求 DTO
 */
export class CancelReservationDto {
  @ApiPropertyOptional({
    description: '取消原因',
    example: '计划变更',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 预约查询请求 DTO
 */
export class QueryReservationsDto {
  @ApiPropertyOptional({
    description: '用户ID',
    example: 'user-001',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '预约状态',
    enum: ReservationStatus,
    example: ReservationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    description: '开始时间（查询此时间之后的预约）',
    example: '2025-10-31T00:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTimeFrom?: Date;

  @ApiPropertyOptional({
    description: '结束时间（查询此时间之前的预约）',
    example: '2025-11-01T00:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTimeTo?: Date;

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
 * 预约响应 DTO
 */
export class ReservationResponse {
  @ApiProperty({
    description: '预约ID',
    example: 'reservation-abc123',
  })
  id: string;

  @ApiProperty({
    description: '用户ID',
    example: 'user-001',
  })
  userId: string;

  @ApiProperty({
    description: '预约状态',
    enum: ReservationStatus,
    example: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @ApiProperty({
    description: '预约开始时间',
    example: '2025-10-31T10:00:00Z',
  })
  reservedStartTime: string;

  @ApiProperty({
    description: '预约结束时间',
    example: '2025-10-31T11:00:00Z',
  })
  reservedEndTime: string;

  @ApiProperty({
    description: '预约时长（分钟）',
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
    description: '提前提醒时间（分钟）',
    example: 15,
  })
  remindBeforeMinutes: number;

  @ApiProperty({
    description: '是否已发送提醒',
    example: false,
  })
  reminderSent: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2025-10-30T15:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: '执行时间',
    example: '2025-10-31T10:00:00Z',
  })
  executedAt?: string;

  @ApiPropertyOptional({
    description: '取消时间',
    example: '2025-10-31T09:00:00Z',
  })
  cancelledAt?: string;

  @ApiPropertyOptional({
    description: '取消原因',
    example: '计划变更',
  })
  cancelReason?: string;

  @ApiPropertyOptional({
    description: '失败原因',
    example: 'No available devices',
  })
  failureReason?: string;
}

/**
 * 预约列表响应 DTO
 */
export class ReservationListResponse {
  @ApiProperty({
    description: '预约列表',
    type: [ReservationResponse],
  })
  reservations: ReservationResponse[];

  @ApiProperty({
    description: '总数',
    example: 50,
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
    example: 5,
  })
  totalPages: number;
}

/**
 * 预约冲突检测结果
 */
export class ReservationConflictCheck {
  @ApiProperty({
    description: '是否有冲突',
    example: false,
  })
  hasConflict: boolean;

  @ApiPropertyOptional({
    description: '冲突的预约列表',
    type: [ReservationResponse],
  })
  conflictingReservations?: ReservationResponse[];

  @ApiProperty({
    description: '可用性消息',
    example: 'Time slot is available',
  })
  message: string;
}

/**
 * 预约统计信息
 */
export class ReservationStatistics {
  @ApiProperty({
    description: '总预约数',
    example: 150,
  })
  totalReservations: number;

  @ApiProperty({
    description: '等待中的预约',
    example: 25,
  })
  pendingCount: number;

  @ApiProperty({
    description: '已完成的预约',
    example: 100,
  })
  completedCount: number;

  @ApiProperty({
    description: '已取消的预约',
    example: 15,
  })
  cancelledCount: number;

  @ApiProperty({
    description: '失败的预约',
    example: 10,
  })
  failedCount: number;

  @ApiProperty({
    description: '预约成功率',
    example: 0.87,
  })
  successRate: number;

  @ApiProperty({
    description: '平均提前预约时间（小时）',
    example: 12.5,
  })
  averageAdvanceBookingHours: number;
}
