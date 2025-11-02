import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 健康检查响应DTO
 */
export class HealthResponseDto {
  @ApiProperty({
    description: '服务状态',
    example: 'ok',
    enum: ['ok', 'degraded', 'down'],
  })
  status: 'ok' | 'degraded' | 'down';

  @ApiProperty({
    description: '服务名称',
    example: 'proxy-service',
  })
  service: string;

  @ApiProperty({
    description: '版本',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: '正常运行时间（秒）',
    example: 86400,
  })
  uptime: number;

  @ApiProperty({
    description: '时间戳',
    example: '2025-11-02T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: '详细健康信息',
  })
  details?: {
    database?: ComponentHealth;
    redis?: ComponentHealth;
    providers?: ProviderHealth[];
    pool?: PoolHealth;
  };
}

/**
 * 组件健康状态
 */
export class ComponentHealth {
  @ApiProperty({
    description: '是否健康',
    example: true,
  })
  healthy: boolean;

  @ApiPropertyOptional({
    description: '响应时间（毫秒）',
    example: 5,
  })
  responseTime?: number;

  @ApiPropertyOptional({
    description: '错误信息',
    example: 'Connection failed',
  })
  error?: string;

  @ApiProperty({
    description: '最后检查时间',
    example: '2025-11-02T10:30:00.000Z',
  })
  lastCheck: Date;
}

/**
 * 供应商健康状态
 */
export class ProviderHealth {
  @ApiProperty({
    description: '供应商名称',
    example: 'brightdata',
  })
  provider: string;

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
    description: '成功率 (0-1)',
    example: 0.98,
  })
  successRate: number;

  @ApiPropertyOptional({
    description: '最后一次成功获取代理的时间',
    example: '2025-11-02T10:25:00.000Z',
  })
  lastSuccessfulFetch?: Date;

  @ApiPropertyOptional({
    description: '错误信息',
    example: 'API rate limit exceeded',
  })
  error?: string;
}

/**
 * 代理池健康状态
 */
export class PoolHealth {
  @ApiProperty({
    description: '池大小是否正常',
    example: true,
  })
  sizeOk: boolean;

  @ApiProperty({
    description: '当前池大小',
    example: 2000,
  })
  currentSize: number;

  @ApiProperty({
    description: '目标池大小',
    example: 2000,
  })
  targetSize: number;

  @ApiProperty({
    description: '健康代理占比',
    example: 0.95,
  })
  healthyRatio: number;

  @ApiProperty({
    description: '最后刷新时间',
    example: '2025-11-02T10:20:00.000Z',
  })
  lastRefresh: Date;
}
