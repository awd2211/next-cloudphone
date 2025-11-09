import { IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 配额限制 DTO
 * 定义用户可以使用的资源上限
 */
export class QuotaLimitsDto {
  // ==================== 设备限制 ====================

  @ApiProperty({
    description: '最大云手机数量',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDevices: number;

  @ApiProperty({
    description: '最大并发设备数量',
    example: 5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxConcurrentDevices: number;

  // ==================== 资源限制 ====================

  @ApiProperty({
    description: '每台设备最大 CPU 核心数',
    example: 4,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxCpuCoresPerDevice: number;

  @ApiProperty({
    description: '每台设备最大内存 (MB)',
    example: 4096,
    minimum: 512,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxMemoryMBPerDevice: number;

  @ApiProperty({
    description: '每台设备最大存储 (GB)',
    example: 64,
    minimum: 8,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxStorageGBPerDevice: number;

  @ApiProperty({
    description: '总 CPU 核心数配额',
    example: 40,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalCpuCores: number;

  @ApiProperty({
    description: '总内存配额 (GB)',
    example: 64,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalMemoryGB: number;

  @ApiProperty({
    description: '总存储配额 (GB)',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalStorageGB: number;

  // ==================== 带宽限制 ====================

  @ApiProperty({
    description: '最大带宽 (Mbps)',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxBandwidthMbps: number;

  @ApiProperty({
    description: '月流量限制 (GB)',
    example: 1000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyTrafficGB: number;

  // ==================== 时长限制 ====================

  @ApiProperty({
    description: '每日最大使用时长 (小时)',
    example: 24,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxUsageHoursPerDay: number;

  @ApiProperty({
    description: '每月最大使用时长 (小时)',
    example: 720,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxUsageHoursPerMonth: number;
}
