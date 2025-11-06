import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResultType {
  USER = 'user',
  DEVICE = 'device',
  APP = 'app',
  TEMPLATE = 'template',
  TICKET = 'ticket',
  NOTIFICATION = 'notification',
  ORDER = 'order',
}

export class SearchResultItem {
  @ApiProperty({ description: '结果类型', enum: ResultType, example: ResultType.DEVICE })
  type: ResultType;

  @ApiProperty({ description: '结果ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: '标题', example: 'Device-001' })
  title: string;

  @ApiPropertyOptional({ description: '描述', example: 'Samsung Galaxy S21' })
  description?: string;

  @ApiPropertyOptional({ description: '额外信息' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: '高亮HTML（仅在highlight=true时）', example: '<em>Device</em>-001' })
  highlighted?: string;

  @ApiProperty({ description: '相关性得分', example: 0.85 })
  score: number;

  @ApiProperty({ description: '创建时间', example: '2025-01-15T10:30:00Z' })
  createdAt: string;
}

export class SearchResultDto {
  @ApiProperty({ description: '总结果数', example: 42 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 3 })
  totalPages: number;

  @ApiProperty({ description: '搜索关键词', example: 'device-001' })
  keyword: string;

  @ApiProperty({ description: '搜索范围', example: 'all' })
  scope: string;

  @ApiProperty({
    description: '搜索结果列表',
    type: [SearchResultItem],
  })
  items: SearchResultItem[];

  @ApiPropertyOptional({
    description: '按类型分组的统计',
    example: { users: 5, devices: 12, apps: 8 },
  })
  stats?: Record<string, number>;

  @ApiProperty({ description: '搜索耗时（毫秒）', example: 125 })
  searchTime: number;
}

export class AutocompleteSuggestion {
  @ApiProperty({ description: '建议文本', example: 'device-001' })
  text: string;

  @ApiProperty({ description: '建议类型', enum: ResultType, example: ResultType.DEVICE })
  type: ResultType;

  @ApiPropertyOptional({ description: '额外信息', example: 'Samsung Galaxy S21' })
  description?: string;

  @ApiProperty({ description: '相关性得分', example: 0.92 })
  score: number;
}

export class AutocompleteResultDto {
  @ApiProperty({ description: '搜索前缀', example: 'dev' })
  prefix: string;

  @ApiProperty({
    description: '建议列表',
    type: [AutocompleteSuggestion],
  })
  suggestions: AutocompleteSuggestion[];

  @ApiProperty({ description: '建议数量', example: 5 })
  total: number;
}

export class SearchHistoryItem {
  @ApiProperty({ description: '搜索关键词', example: 'device-001' })
  keyword: string;

  @ApiProperty({ description: '搜索范围', example: 'devices' })
  scope: string;

  @ApiProperty({ description: '搜索时间', example: '2025-01-15T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: '结果数量', example: 12 })
  resultCount: number;
}

export class SearchHistoryDto {
  @ApiProperty({
    description: '搜索历史列表',
    type: [SearchHistoryItem],
  })
  history: SearchHistoryItem[];

  @ApiProperty({ description: '历史记录总数', example: 25 })
  total: number;
}

export class TrendingSearchItem {
  @ApiProperty({ description: '搜索关键词', example: 'redroid' })
  keyword: string;

  @ApiProperty({ description: '搜索次数', example: 156 })
  count: number;

  @ApiProperty({ description: '增长趋势百分比', example: 25.5 })
  trend: number;

  @ApiPropertyOptional({ description: '相关类型', example: 'devices' })
  category?: string;
}

export class TrendingSearchDto {
  @ApiProperty({
    description: '热门搜索列表',
    type: [TrendingSearchItem],
  })
  trending: TrendingSearchItem[];

  @ApiProperty({ description: '统计时间范围', example: '24h' })
  timeRange: string;

  @ApiProperty({ description: '更新时间', example: '2025-01-15T10:30:00Z' })
  updatedAt: string;
}
