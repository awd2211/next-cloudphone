import { ApiProperty } from '@nestjs/swagger';
import { PoolStats } from '../../common/interfaces';

/**
 * 池统计响应DTO
 */
export class PoolStatsResponseDto {
  @ApiProperty({
    description: '代理池总大小',
    example: 2000,
  })
  total: number;

  @ApiProperty({
    description: '正在使用的代理数',
    example: 500,
  })
  inUse: number;

  @ApiProperty({
    description: '可用代理数',
    example: 1500,
  })
  available: number;

  @ApiProperty({
    description: '不健康代理数',
    example: 50,
  })
  unhealthy: number;

  @ApiProperty({
    description: '按供应商分组统计',
    example: {
      iproyal: 800,
      brightdata: 700,
      oxylabs: 500,
    },
  })
  providerBreakdown: Record<string, number>;

  @ApiProperty({
    description: '按国家分组统计',
    example: {
      US: 1200,
      GB: 400,
      DE: 400,
    },
  })
  countryBreakdown: Record<string, number>;

  @ApiProperty({
    description: '平均质量分数',
    example: 85,
  })
  averageQuality: number;

  @ApiProperty({
    description: '平均延迟（毫秒）',
    example: 150,
  })
  averageLatency: number;

  @ApiProperty({
    description: '最后刷新时间',
    example: '2025-11-02T10:30:00.000Z',
  })
  lastRefresh: Date;

  static fromPoolStats(stats: PoolStats): PoolStatsResponseDto {
    const dto = new PoolStatsResponseDto();
    dto.total = stats.total;
    dto.inUse = stats.inUse;
    dto.available = stats.available;
    dto.unhealthy = stats.unhealthy;
    dto.providerBreakdown = stats.providerBreakdown;
    dto.countryBreakdown = stats.countryBreakdown;
    dto.averageQuality = stats.averageQuality;
    dto.averageLatency = stats.averageLatency;
    dto.lastRefresh = stats.lastRefresh;
    return dto;
  }
}

/**
 * 供应商统计响应DTO
 */
export class ProviderStatsDto {
  @ApiProperty({
    description: '供应商名称',
    example: 'brightdata',
  })
  name: string;

  @ApiProperty({
    description: '是否在线',
    example: true,
  })
  online: boolean;

  @ApiProperty({
    description: '可用代理数',
    example: 700,
  })
  availableProxies: number;

  @ApiProperty({
    description: '正在使用的代理数',
    example: 200,
  })
  inUseProxies: number;

  @ApiProperty({
    description: '今日请求数',
    example: 15000,
  })
  todayRequests: number;

  @ApiProperty({
    description: '今日成本（USD）',
    example: 125.50,
  })
  todayCost: number;

  @ApiProperty({
    description: '成功率 (0-1)',
    example: 0.98,
  })
  successRate: number;

  @ApiProperty({
    description: '平均响应时间（毫秒）',
    example: 120,
  })
  avgResponseTime: number;
}
