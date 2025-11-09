import { IsOptional, IsEnum, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { NotificationCategory, NotificationStatus } from '../../entities/notification.entity';

/**
 * 查询通知 DTO
 *
 * 用于过滤和分页查询通知列表
 */
export class QueryNotificationDto {
  /**
   * 通知类型过滤
   */
  @ApiPropertyOptional({
    description: '通知类型',
    enum: NotificationCategory,
    example: NotificationCategory.SYSTEM,
  })
  @IsOptional()
  @IsEnum(NotificationCategory, { message: '通知类型无效' })
  type?: NotificationCategory;

  /**
   * 通知状态过滤
   */
  @ApiPropertyOptional({
    description: '通知状态',
    enum: NotificationStatus,
    example: NotificationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(NotificationStatus, { message: '通知状态无效' })
  status?: NotificationStatus;

  /**
   * 用户 ID 过滤
   */
  @ApiPropertyOptional({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString({ message: '用户 ID 必须是字符串' })
  userId?: string;

  /**
   * 只显示未读通知
   */
  @ApiPropertyOptional({
    description: '只显示未读通知',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'unreadOnly 必须是布尔值' })
  unreadOnly?: boolean;

  /**
   * 页码 (从 1 开始)
   */
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number = 1;

  /**
   * 每页数量
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为 1' })
  @Max(100, { message: '每页数量最大为 100' })
  limit?: number = 20;
}
