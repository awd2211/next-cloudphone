import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';

/**
 * 创建粘性会话请求
 */
export class CreateStickySessionDto {
  @ApiProperty({
    description: '设备ID',
    example: 'device-12345',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: '用户ID',
    example: 'user-67890',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: '代理ID',
    example: 'proxy-abc123',
  })
  @IsString()
  proxyId: string;

  @ApiProperty({
    description: '会话持续时间（秒），最长30天',
    example: 86400,
    minimum: 3600,
    maximum: 2592000,
  })
  @IsNumber()
  @Min(3600) // 最少1小时
  @Max(2592000) // 最多30天
  durationSeconds: number;

  @ApiPropertyOptional({
    description: '优先级（1-10）',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({
    description: '是否自动续期',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({
    description: '元数据（自定义字段）',
    example: { appName: 'Instagram', purpose: 'automation' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 续期会话请求
 */
export class RenewSessionDto {
  @ApiProperty({
    description: '延长时间（秒）',
    example: 86400,
    minimum: 3600,
    maximum: 604800,
  })
  @IsNumber()
  @Min(3600) // 最少延长1小时
  @Max(604800) // 最多延长7天
  extensionSeconds: number;
}

/**
 * 会话响应
 */
export class StickySessionResponseDto {
  @ApiProperty({ description: '会话ID', example: 'session-12345' })
  id: string;

  @ApiProperty({ description: '设备ID', example: 'device-12345' })
  deviceId: string;

  @ApiProperty({ description: '用户ID', example: 'user-67890' })
  userId: string;

  @ApiProperty({ description: '代理ID', example: 'proxy-abc123' })
  proxyId: string;

  @ApiProperty({ description: '代理主机', example: '192.168.1.100' })
  proxyHost: string;

  @ApiProperty({ description: '代理端口', example: 8080 })
  proxyPort: number;

  @ApiProperty({
    description: '会话状态',
    enum: ['active', 'expiring_soon', 'expired', 'terminated'],
    example: 'active',
  })
  status: string;

  @ApiProperty({ description: '优先级', example: 5 })
  priority: number;

  @ApiProperty({ description: '是否自动续期', example: true })
  autoRenew: boolean;

  @ApiProperty({
    description: '过期时间',
    example: '2025-02-15T10:30:00Z',
  })
  expiresAt: Date;

  @ApiProperty({ description: '续期次数', example: 3 })
  renewalCount: number;

  @ApiProperty({
    description: '创建时间',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '最后续期时间',
    example: '2025-01-20T10:30:00Z',
    required: false,
  })
  lastRenewedAt?: Date;

  @ApiProperty({
    description: '元数据',
    example: { appName: 'Instagram', purpose: 'automation' },
  })
  metadata: Record<string, any>;
}

/**
 * 会话统计响应
 */
export class SessionStatsResponseDto {
  @ApiProperty({ description: '总会话数', example: 100 })
  totalSessions: number;

  @ApiProperty({ description: '活跃会话数', example: 45 })
  activeSessions: number;

  @ApiProperty({ description: '即将过期会话数', example: 5 })
  expiringSoon: number;

  @ApiProperty({ description: '已过期会话数', example: 50 })
  expiredSessions: number;

  @ApiProperty({ description: '总续期次数', example: 230 })
  totalRenewals: number;

  @ApiProperty({ description: '平均会话时长（秒）', example: 172800 })
  avgSessionDuration: number;
}
