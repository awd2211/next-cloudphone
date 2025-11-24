/**
 * 黑名单 DTO 定义
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BlacklistType, BlacklistStatus } from '../../entities/blacklist.entity';

export class CreateBlacklistDto {
  @ApiProperty({
    description: '黑名单类型',
    enum: BlacklistType,
  })
  @IsEnum(BlacklistType)
  type: BlacklistType;

  @ApiProperty({ description: '封禁值（IP/设备ID/用户ID）', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  value: string;

  @ApiPropertyOptional({ description: '封禁原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '是否永久封禁', default: false })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional({ description: '过期时间（ISO 格式）' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  metadata?: {
    userAgent?: string;
    location?: string;
    lastConversationId?: string;
  };
}

export class UpdateBlacklistDto {
  @ApiPropertyOptional({ description: '封禁原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '是否永久封禁' })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional({ description: '过期时间' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '状态', enum: BlacklistStatus })
  @IsOptional()
  @IsEnum(BlacklistStatus)
  status?: BlacklistStatus;
}

export class RevokeBlacklistDto {
  @ApiPropertyOptional({ description: '撤销原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SearchBlacklistDto {
  @ApiPropertyOptional({ description: '搜索关键词（值）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '类型', enum: BlacklistType })
  @IsOptional()
  @IsEnum(BlacklistType)
  type?: BlacklistType;

  @ApiPropertyOptional({ description: '状态', enum: BlacklistStatus })
  @IsOptional()
  @IsEnum(BlacklistStatus)
  status?: BlacklistStatus;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class CheckBlacklistDto {
  @ApiProperty({ description: '检查类型', enum: BlacklistType })
  @IsEnum(BlacklistType)
  type: BlacklistType;

  @ApiProperty({ description: '检查值' })
  @IsString()
  value: string;
}

export class BatchCreateBlacklistDto {
  @ApiProperty({ description: '批量黑名单数据', type: [CreateBlacklistDto] })
  items: CreateBlacklistDto[];
}
