import {
  IsOptional,
  IsBoolean,
  IsDate,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuotaStatus } from '../../entities/quota.entity';

/**
 * 部分配额限制 DTO
 * 用于更新时的嵌套对象
 */
export class PartialQuotaLimitsDto {
  @ApiPropertyOptional({ description: '最大云手机数量', example: 10 })
  @IsOptional()
  @Type(() => Number)
  maxDevices?: number;

  @ApiPropertyOptional({ description: '最大并发设备数量', example: 5 })
  @IsOptional()
  @Type(() => Number)
  maxConcurrentDevices?: number;

  @ApiPropertyOptional({ description: '每台设备最大 CPU 核心数', example: 4 })
  @IsOptional()
  @Type(() => Number)
  maxCpuCoresPerDevice?: number;

  @ApiPropertyOptional({ description: '每台设备最大内存 (MB)', example: 4096 })
  @IsOptional()
  @Type(() => Number)
  maxMemoryMBPerDevice?: number;

  @ApiPropertyOptional({ description: '每台设备最大存储 (GB)', example: 64 })
  @IsOptional()
  @Type(() => Number)
  maxStorageGBPerDevice?: number;

  @ApiPropertyOptional({ description: '总 CPU 核心数配额', example: 40 })
  @IsOptional()
  @Type(() => Number)
  totalCpuCores?: number;

  @ApiPropertyOptional({ description: '总内存配额 (GB)', example: 64 })
  @IsOptional()
  @Type(() => Number)
  totalMemoryGB?: number;

  @ApiPropertyOptional({ description: '总存储配额 (GB)', example: 500 })
  @IsOptional()
  @Type(() => Number)
  totalStorageGB?: number;

  @ApiPropertyOptional({ description: '最大带宽 (Mbps)', example: 100 })
  @IsOptional()
  @Type(() => Number)
  maxBandwidthMbps?: number;

  @ApiPropertyOptional({ description: '月流量限制 (GB)', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  monthlyTrafficGB?: number;

  @ApiPropertyOptional({ description: '每日最大使用时长 (小时)', example: 24 })
  @IsOptional()
  @Type(() => Number)
  maxUsageHoursPerDay?: number;

  @ApiPropertyOptional({ description: '每月最大使用时长 (小时)', example: 720 })
  @IsOptional()
  @Type(() => Number)
  maxUsageHoursPerMonth?: number;
}

/**
 * 更新配额 DTO
 */
export class UpdateQuotaDto {
  @ApiPropertyOptional({
    description: '配额限制（部分更新）',
    type: PartialQuotaLimitsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PartialQuotaLimitsDto)
  limits?: PartialQuotaLimitsDto;

  @ApiPropertyOptional({
    description: '配额状态',
    enum: QuotaStatus,
    example: QuotaStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(QuotaStatus)
  status?: QuotaStatus;

  @ApiPropertyOptional({
    description: '生效时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validFrom?: Date;

  @ApiPropertyOptional({
    description: '失效时间',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @ApiPropertyOptional({
    description: '是否自动续期',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({
    description: '备注',
    example: 'Updated quota',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
