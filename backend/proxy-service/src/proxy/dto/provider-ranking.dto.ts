import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * Provider 评分响应
 */
export class ProviderScoreResponseDto {
  @ApiProperty({ description: '提供商名称', example: 'BrightData' })
  provider: string;

  @ApiProperty({ description: '总分（0-100）', example: 87.5 })
  totalScore: number;

  @ApiProperty({ description: '成功率评分', example: 92.0 })
  successRateScore: number;

  @ApiProperty({ description: '延迟评分', example: 85.0 })
  latencyScore: number;

  @ApiProperty({ description: '成本评分', example: 78.0 })
  costScore: number;

  @ApiProperty({ description: '稳定性评分', example: 90.0 })
  stabilityScore: number;

  @ApiProperty({ description: '可用性评分', example: 95.0 })
  availabilityScore: number;

  @ApiProperty({ description: '总代理数', example: 1500 })
  totalProxies: number;

  @ApiProperty({ description: '活跃代理数', example: 1350 })
  activeProxies: number;

  @ApiProperty({ description: '平均成功率（%）', example: 92.5 })
  avgSuccessRate: number;

  @ApiProperty({ description: '平均延迟（毫秒）', example: 120 })
  avgLatency: number;

  @ApiProperty({ description: '平均成本（$/GB）', example: 0.65 })
  avgCostPerGB: number;

  @ApiProperty({ description: '最后计算时间', example: '2025-01-20T10:30:00Z' })
  lastCalculated: Date;
}

/**
 * Provider 排名响应
 */
export class ProviderRankingResponseDto {
  @ApiProperty({ description: '排名', example: 1 })
  ranking: number;

  @ApiProperty({ description: '提供商信息', type: ProviderScoreResponseDto })
  provider: ProviderScoreResponseDto;
}

/**
 * Provider 详情响应
 */
export class ProviderDetailsResponseDto {
  @ApiProperty({ description: '当前评分', type: ProviderScoreResponseDto })
  score: ProviderScoreResponseDto;

  @ApiProperty({
    description: '历史记录',
    type: [Object],
    example: [
      { score: 87.5, recordedAt: '2025-01-20T10:00:00Z' },
      { score: 86.2, recordedAt: '2025-01-20T09:00:00Z' },
    ],
  })
  history: Array<{
    score: number;
    totalProxies: number;
    activeProxies: number;
    avgSuccessRate: number;
    avgLatency: number;
    avgCostPerGB: number;
    recordedAt: Date;
  }>;

  @ApiProperty({
    description: '趋势',
    enum: ['improving', 'stable', 'declining'],
    example: 'improving',
  })
  trend: string;

  @ApiProperty({ description: '当前排名', example: 2 })
  ranking: number;
}

/**
 * Provider 对比请求
 */
export class CompareProvidersDto {
  @ApiProperty({
    description: '提供商列表',
    type: [String],
    example: ['BrightData', 'IPRoyal', 'Oxylabs'],
  })
  @IsArray()
  @IsString({ each: true })
  providers: string[];
}

/**
 * Provider 对比响应
 */
export class ProviderComparisonResponseDto {
  @ApiProperty({
    description: '对比结果',
    type: [Object],
    example: [
      {
        provider: 'BrightData',
        score: { totalScore: 87.5 },
        ranking: 1,
      },
      {
        provider: 'IPRoyal',
        score: { totalScore: 82.3 },
        ranking: 2,
      },
    ],
  })
  comparison: Array<{
    provider: string;
    score: ProviderScoreResponseDto;
    ranking: number;
  }>;

  @ApiProperty({
    description: '各项最优提供商',
    example: {
      overall: 'BrightData',
      bestSuccessRate: 'Oxylabs',
      bestLatency: 'IPRoyal',
      bestCost: 'IPRoyal',
    },
  })
  winner: {
    overall: string;
    bestSuccessRate: string;
    bestLatency: string;
    bestCost: string;
  };
}

/**
 * Provider 统计响应
 */
export class ProviderStatisticsResponseDto {
  @ApiProperty({ description: '总提供商数', example: 5 })
  totalProviders: number;

  @ApiProperty({ description: '平均总分', example: 82.5 })
  avgTotalScore: number;

  @ApiProperty({ description: '最高分', example: 92.5 })
  highestScore: number;

  @ApiProperty({ description: '最低分', example: 68.3 })
  lowestScore: number;

  @ApiProperty({
    description: '评分分布',
    example: {
      excellent: 2,
      good: 2,
      fair: 1,
      poor: 0,
    },
  })
  scoreDistribution: {
    excellent: number; // >= 90
    good: number; // 80-89
    fair: number; // 70-79
    poor: number; // < 70
  };

  @ApiProperty({
    description: '市场份额',
    example: {
      BrightData: 35.5,
      IPRoyal: 28.3,
      Oxylabs: 22.1,
      Others: 14.1,
    },
  })
  marketShare: Record<string, number>;
}
