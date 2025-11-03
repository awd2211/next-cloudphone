import { ApiProperty } from '@nestjs/swagger';

/**
 * 质量评分指标
 */
export class QualityMetrics {
  @ApiProperty({ description: '成功率（%）', example: 95.5 })
  successRate: number;

  @ApiProperty({ description: '平均延迟（毫秒）', example: 120 })
  avgLatency: number;

  @ApiProperty({ description: '可用性（%）', example: 98.0 })
  availability: number;

  @ApiProperty({ description: '稳定性分数', example: 85 })
  consistency: number;

  @ApiProperty({
    description: '匿名度',
    example: 'high',
    enum: ['high', 'anonymous', 'transparent'],
  })
  anonymity: string;
}

/**
 * 统计信息
 */
export class QualityStatistics {
  @ApiProperty({ description: '总请求数', example: 1000 })
  totalRequests: number;

  @ApiProperty({ description: '成功请求数', example: 955 })
  successfulRequests: number;

  @ApiProperty({ description: '失败请求数', example: 45 })
  failedRequests: number;

  @ApiProperty({ description: '平均响应时间（毫秒）', example: 120 })
  avgResponseTime: number;

  @ApiProperty({ description: '正常运行时间', example: '98.5%' })
  uptime: string;

  @ApiProperty({ description: '最后检查时间', example: '2025-01-15T10:30:00Z' })
  lastChecked: Date;
}

/**
 * 质量评分响应
 */
export class QualityScoreResponseDto {
  @ApiProperty({ description: '代理ID', example: 'proxy-12345' })
  proxyId: string;

  @ApiProperty({ description: '质量分（0-100）', example: 92.5 })
  qualityScore: number;

  @ApiProperty({
    description: '评级',
    example: 'S',
    enum: ['S', 'A', 'B', 'C', 'D'],
  })
  rating: string;

  @ApiProperty({ description: '质量指标', type: QualityMetrics })
  metrics: QualityMetrics;

  @ApiProperty({ description: '统计信息', type: QualityStatistics })
  statistics: QualityStatistics;

  @ApiProperty({
    description: '趋势',
    example: 'improving',
    enum: ['improving', 'stable', 'declining'],
  })
  trend: string;

  @ApiProperty({
    description: '健康状态',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  healthStatus: string;
}
