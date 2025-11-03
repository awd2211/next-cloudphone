import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

/**
 * 故障切换配置
 */
export class FailoverConfigDto {
  @ApiPropertyOptional({
    description: '用户ID（为空表示全局配置）',
    example: 'user-12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '设备ID（为空表示用户级配置）',
    example: 'device-67890',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: '是否启用故障切换',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '故障切换策略',
    enum: ['immediate', 'retry_first', 'quality_based', 'round_robin'],
    example: 'quality_based',
    default: 'quality_based',
  })
  @IsOptional()
  @IsEnum(['immediate', 'retry_first', 'quality_based', 'round_robin'])
  strategy?: string;

  @ApiPropertyOptional({
    description: '最大重试次数',
    example: 3,
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: '重试延迟（毫秒）',
    example: 1000,
    minimum: 100,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  retryDelayMs?: number;

  @ApiPropertyOptional({
    description: '故障阈值（连续失败次数）',
    example: 3,
    minimum: 1,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  failureThreshold?: number;

  @ApiPropertyOptional({
    description: '恢复阈值（连续成功次数）',
    example: 2,
    minimum: 1,
    maximum: 10,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  successThreshold?: number;

  @ApiPropertyOptional({
    description: '健康检查间隔（毫秒）',
    example: 30000,
    minimum: 5000,
    maximum: 300000,
    default: 30000,
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(300000)
  checkIntervalMs?: number;

  @ApiPropertyOptional({
    description: '是否自动恢复',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRecover?: boolean;

  @ApiPropertyOptional({
    description: '故障切换时是否发送通知',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnFailover?: boolean;
}
