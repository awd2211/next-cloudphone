import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 管理员使用记录查询参数
 */
export class AdminUsageQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '用户ID筛选' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '设备ID筛选' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '状态筛选', enum: ['active', 'completed'] })
  @IsOptional()
  @IsEnum(['active', 'completed'])
  status?: 'active' | 'completed';

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)', example: '2025-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '搜索关键词 (用户ID或设备ID)' })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * 使用记录响应DTO（包含关联的用户和设备信息）
 */
export class UsageRecordWithRelationsDto {
  @ApiProperty({ description: '记录ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '设备ID' })
  deviceId: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '使用类型' })
  usageType: string;

  @ApiProperty({ description: '开始时间' })
  startTime: Date;

  @ApiProperty({ description: '结束时间', required: false })
  endTime?: Date;

  @ApiProperty({ description: '使用时长（秒）' })
  duration: number;

  @ApiProperty({ description: 'CPU使用率' })
  cpuUsage?: number;

  @ApiProperty({ description: '内存使用量（MB）' })
  memoryUsage?: number;

  @ApiProperty({ description: '网络使用量（KB）' })
  networkUsage?: number;

  @ApiProperty({ description: '费用' })
  cost: number | string;

  @ApiProperty({ description: '是否已计费' })
  isBilled: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '设备信息', required: false })
  device?: {
    id: string;
    name?: string;
    deviceType?: string;
    providerType?: string;
  };

  @ApiProperty({ description: '用户信息', required: false })
  user?: {
    id: string;
    username?: string;
    email?: string;
  };
}

/**
 * 使用记录列表响应
 */
export class AdminUsageRecordsResponseDto {
  @ApiProperty({ description: '使用记录列表', type: [UsageRecordWithRelationsDto] })
  data: UsageRecordWithRelationsDto[];

  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;
}

/**
 * 使用统计响应DTO
 */
export class AdminUsageStatsDto {
  @ApiProperty({ description: '总使用时长（秒）' })
  totalDuration: number;

  @ApiProperty({ description: '总费用' })
  totalCost: number;

  @ApiProperty({ description: '活跃用户数' })
  activeUsers: number;

  @ApiProperty({ description: '活跃设备数' })
  activeDevices: number;

  @ApiProperty({ description: '平均使用时长（秒）' })
  avgDuration: number;

  @ApiProperty({ description: '总记录数' })
  totalRecords: number;

  @ApiProperty({ description: '统计时间范围', required: false })
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

/**
 * 导出使用记录参数
 */
export class ExportUsageDto extends AdminUsageQueryDto {
  @ApiProperty({ description: '导出格式', enum: ExportFormat, default: ExportFormat.CSV })
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.CSV;
}
