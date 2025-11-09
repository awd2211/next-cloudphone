import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, IsDateString, IsArray, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationChannel } from '../../entities/notification.entity';

/**
 * 创建通知 DTO
 *
 * 用于创建和发送通知，支持多渠道推送
 */
export class CreateNotificationDto {
  /**
   * 接收通知的用户 ID
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: '用户 ID 必须是有效的 UUIDv4' })
  @IsNotEmpty({ message: '用户 ID 不能为空' })
  userId: string;

  /**
   * 通知类型/类别
   * @example "system"
   */
  @ApiPropertyOptional({
    description: '通知类型',
    enum: NotificationCategory,
    example: NotificationCategory.SYSTEM,
    default: NotificationCategory.SYSTEM,
  })
  @IsOptional()
  @IsEnum(NotificationCategory, { message: '通知类型无效' })
  type?: NotificationCategory;

  /**
   * 通知标题
   * @example "系统通知"
   */
  @ApiProperty({
    description: '通知标题',
    example: '系统通知',
    minLength: 1,
    maxLength: 200,
  })
  @IsString({ message: '标题必须是字符串' })
  @IsNotEmpty({ message: '标题不能为空' })
  @MinLength(1, { message: '标题至少 1 个字符' })
  @MaxLength(200, { message: '标题最多 200 个字符' })
  title: string;

  /**
   * 通知内容
   * @example "您有一条新消息"
   */
  @ApiProperty({
    description: '通知内容',
    example: '您有一条新消息',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString({ message: '消息内容必须是字符串' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  @MinLength(1, { message: '消息内容至少 1 个字符' })
  @MaxLength(1000, { message: '消息内容最多 1000 个字符' })
  message: string;

  /**
   * 附加数据 (JSON 格式)
   * @example { "deviceId": "abc123", "action": "created" }
   */
  @ApiPropertyOptional({
    description: '附加数据',
    example: { deviceId: 'abc123', action: 'created' },
  })
  @IsOptional()
  data?: Record<string, unknown>;

  /**
   * 通知过期时间 (ISO 8601 格式)
   * @example "2024-12-31T23:59:59Z"
   */
  @ApiPropertyOptional({
    description: '过期时间 (ISO 8601 格式)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '过期时间必须是有效的 ISO 8601 日期格式' })
  expiresAt?: Date;

  /**
   * 发送渠道列表
   * @example ["websocket", "email"]
   */
  @ApiPropertyOptional({
    description: '发送渠道',
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
  })
  @IsOptional()
  @IsArray({ message: '渠道必须是数组' })
  @IsEnum(NotificationChannel, { each: true, message: '渠道类型无效' })
  channels?: NotificationChannel[];
}
