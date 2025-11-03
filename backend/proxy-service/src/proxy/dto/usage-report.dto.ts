import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建报告请求
 */
export class CreateReportDto {
  @ApiProperty({ description: '报告名称', example: 'Monthly Proxy Usage Report' })
  @IsString()
  reportName: string;

  @ApiProperty({
    description: '报告类型',
    enum: ['usage_summary', 'cost_analysis', 'quality_report', 'failover_analysis', 'provider_comparison'],
    example: 'usage_summary',
  })
  @IsEnum(['usage_summary', 'cost_analysis', 'quality_report', 'failover_analysis', 'provider_comparison'])
  reportType: string;

  @ApiProperty({
    description: '报告周期',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    example: 'monthly',
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
  reportPeriod: string;

  @ApiProperty({ description: '开始日期', example: '2025-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期', example: '2025-01-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '数据范围', enum: ['all', 'user', 'device', 'group'], default: 'user' })
  @IsOptional()
  @IsEnum(['all', 'user', 'device', 'group'])
  dataScope?: string;

  @ApiPropertyOptional({ description: '过滤条件', type: Object })
  @IsOptional()
  filters?: {
    providerIds?: string[];
    deviceIds?: string[];
    groupIds?: string[];
    minCost?: number;
    maxCost?: number;
  };

  @ApiPropertyOptional({ description: '包含的指标', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedMetrics?: string[];

  @ApiPropertyOptional({ description: '导出格式', enum: ['pdf', 'excel', 'csv', 'json'], default: 'pdf' })
  @IsOptional()
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  exportFormat?: string;

  @ApiPropertyOptional({ description: '是否包含图表', default: true })
  @IsOptional()
  includeCharts?: boolean;
}

/**
 * 生成报告请求
 */
export class GenerateReportDto {
  @ApiProperty({ description: '报告ID', example: 'uuid' })
  @IsString()
  reportId: string;

  @ApiProperty({ description: '导出格式', enum: ['pdf', 'excel', 'csv', 'json'], example: 'pdf' })
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  exportFormat: string;
}

/**
 * 创建定时报告请求
 */
export class CreateScheduledReportDto {
  @ApiProperty({ description: '报告名称', example: 'Weekly Usage Summary' })
  @IsString()
  reportName: string;

  @ApiProperty({
    description: '报告类型',
    enum: ['usage_summary', 'cost_analysis', 'quality_report', 'failover_analysis', 'provider_comparison'],
  })
  @IsEnum(['usage_summary', 'cost_analysis', 'quality_report', 'failover_analysis', 'provider_comparison'])
  reportType: string;

  @ApiProperty({
    description: '报告周期',
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    example: 'weekly',
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly'])
  reportPeriod: string;

  @ApiProperty({ description: 'Cron表达式', example: '0 0 9 * * 1' })
  @IsString()
  cronExpression: string;

  @ApiPropertyOptional({ description: '接收邮箱列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: '数据范围', enum: ['all', 'user', 'device', 'group'], default: 'user' })
  @IsOptional()
  @IsEnum(['all', 'user', 'device', 'group'])
  dataScope?: string;

  @ApiPropertyOptional({ description: '导出格式', enum: ['pdf', 'excel', 'csv', 'json'], default: 'pdf' })
  @IsOptional()
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  exportFormat?: string;

  @ApiPropertyOptional({ description: '是否自动发送', default: true })
  @IsOptional()
  autoSend?: boolean;
}

/**
 * 更新定时报告请求
 */
export class UpdateScheduledReportDto {
  @ApiPropertyOptional({ description: '报告名称' })
  @IsOptional()
  @IsString()
  reportName?: string;

  @ApiPropertyOptional({ description: 'Cron表达式' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ description: '接收邮箱列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '导出格式', enum: ['pdf', 'excel', 'csv', 'json'] })
  @IsOptional()
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  exportFormat?: string;
}

/**
 * 报告统计响应
 */
export class ReportStatisticsDto {
  @ApiProperty({ description: '总报告数', example: 150 })
  totalReports: number;

  @ApiProperty({ description: '待生成报告数', example: 5 })
  pendingReports: number;

  @ApiProperty({ description: '已生成报告数', example: 140 })
  completedReports: number;

  @ApiProperty({ description: '失败报告数', example: 5 })
  failedReports: number;

  @ApiProperty({ description: '按类型统计', type: Object })
  byType: {
    usage_summary: number;
    cost_analysis: number;
    quality_report: number;
    failover_analysis: number;
    provider_comparison: number;
  };

  @ApiProperty({ description: '按格式统计', type: Object })
  byFormat: {
    pdf: number;
    excel: number;
    csv: number;
    json: number;
  };

  @ApiProperty({ description: '最近30天趋势', type: [Object] })
  recentTrend: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * 报告模板配置
 */
export class ReportTemplateDto {
  @ApiProperty({ description: '模板名称', example: 'Standard Monthly Report' })
  @IsString()
  templateName: string;

  @ApiProperty({ description: '报告类型', enum: ['usage_summary', 'cost_analysis', 'quality_report'] })
  @IsEnum(['usage_summary', 'cost_analysis', 'quality_report', 'failover_analysis', 'provider_comparison'])
  reportType: string;

  @ApiPropertyOptional({ description: '页眉HTML' })
  @IsOptional()
  @IsString()
  headerHtml?: string;

  @ApiPropertyOptional({ description: '页脚HTML' })
  @IsOptional()
  @IsString()
  footerHtml?: string;

  @ApiPropertyOptional({ description: '自定义样式CSS' })
  @IsOptional()
  @IsString()
  customCss?: string;

  @ApiPropertyOptional({ description: '包含的章节', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sections?: string[];
}

/**
 * 批量导出请求
 */
export class BatchExportDto {
  @ApiProperty({ description: '报告ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  reportIds: string[];

  @ApiProperty({ description: '导出格式', enum: ['pdf', 'excel', 'csv', 'json'], example: 'excel' })
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  exportFormat: string;

  @ApiPropertyOptional({ description: '压缩为ZIP', default: true })
  @IsOptional()
  zipArchive?: boolean;
}

/**
 * 报告查询参数
 */
export class QueryReportDto {
  @ApiPropertyOptional({ description: '报告类型', enum: ['usage_summary', 'cost_analysis', 'quality_report'] })
  @IsOptional()
  @IsEnum(['usage_summary', 'cost_analysis', 'quality_report', 'failover_analysis', 'provider_comparison'])
  reportType?: string;

  @ApiPropertyOptional({ description: '报告周期', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
  reportPeriod?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['pending', 'generating', 'completed', 'failed'] })
  @IsOptional()
  @IsEnum(['pending', 'generating', 'completed', 'failed'])
  status?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

/**
 * 报告详情响应
 */
export class ReportDetailsDto {
  @ApiProperty({ description: '报告ID' })
  id: string;

  @ApiProperty({ description: '报告名称' })
  reportName: string;

  @ApiProperty({ description: '报告类型' })
  reportType: string;

  @ApiProperty({ description: '报告周期' })
  reportPeriod: string;

  @ApiProperty({ description: '状态' })
  status: string;

  @ApiProperty({ description: '数据摘要', type: Object })
  dataSummary: {
    totalUsage: number;
    totalCost: number;
    deviceCount: number;
    avgSuccessRate: number;
  };

  @ApiProperty({ description: '生成时间' })
  generatedAt: Date;

  @ApiProperty({ description: '文件大小（字节）' })
  fileSize: number;

  @ApiProperty({ description: '下载URL' })
  downloadUrl: string;
}
