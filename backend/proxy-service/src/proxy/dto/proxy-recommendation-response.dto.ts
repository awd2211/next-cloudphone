import { ApiProperty } from '@nestjs/swagger';

/**
 * 代理基本信息
 */
export class ProxyInfoDto {
  @ApiProperty({ description: '主机地址', example: '192.168.1.100' })
  host: string;

  @ApiProperty({ description: '端口', example: 8080 })
  port: number;

  @ApiProperty({ description: '国家', example: 'US' })
  country: string;

  @ApiProperty({ description: '城市', example: 'New York' })
  city?: string;

  @ApiProperty({ description: 'ISP类型', example: 'residential' })
  ispType: string;

  @ApiProperty({ description: '质量分', example: 85 })
  quality: number;

  @ApiProperty({ description: '平均延迟（毫秒）', example: 120 })
  avgLatency: number;

  @ApiProperty({ description: '成本（$/GB）', example: 0.5 })
  costPerGB: number;

  @ApiProperty({ description: '协议', example: 'http' })
  protocol: string;
}

/**
 * 推荐项
 */
export class RecommendationItem {
  @ApiProperty({ description: '代理ID', example: 'proxy-12345' })
  proxyId: string;

  @ApiProperty({ description: '推荐分数', example: 92.5 })
  score: number;

  @ApiProperty({
    description: '推荐理由',
    type: [String],
    example: ['High success rate: 95%', 'Low latency: 80ms'],
  })
  reasons: string[];

  @ApiProperty({ description: '代理信息', type: ProxyInfoDto })
  proxy: ProxyInfoDto;
}

/**
 * 备选推荐项（精简版）
 */
export class AlternativeRecommendation {
  @ApiProperty({ description: '代理ID', example: 'proxy-67890' })
  proxyId: string;

  @ApiProperty({ description: '推荐分数', example: 85.0 })
  score: number;

  @ApiProperty({ description: '代理信息', type: ProxyInfoDto })
  proxy: ProxyInfoDto;
}

/**
 * 智能推荐响应
 */
export class ProxyRecommendationResponseDto {
  @ApiProperty({
    description: 'Top 3 推荐',
    type: [RecommendationItem],
  })
  recommendations: RecommendationItem[];

  @ApiProperty({
    description: '备选推荐（4-8名）',
    type: [AlternativeRecommendation],
  })
  alternatives: AlternativeRecommendation[];

  @ApiProperty({
    description: '黑名单代理ID',
    type: [String],
    example: ['proxy-111', 'proxy-222'],
  })
  blacklisted: string[];
}
