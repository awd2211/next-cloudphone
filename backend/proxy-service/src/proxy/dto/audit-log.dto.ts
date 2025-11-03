import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建审计日志请求
 */
export class CreateAuditLogDto {
  @ApiProperty({ description: '操作类型', example: 'proxy.acquire' })
  @IsString()
  action: string;

  @ApiProperty({ description: '资源类型', example: 'proxy' })
  @IsString()
  resourceType: string;

  @ApiPropertyOptional({ description: '资源ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: '设备ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '操作详情', type: Object })
  @IsOptional()
  details?: any;

  @ApiPropertyOptional({ description: '请求数据', type: Object })
  @IsOptional()
  requestData?: any;

  @ApiPropertyOptional({ description: '响应数据', type: Object })
  @IsOptional()
  responseData?: any;

  @ApiPropertyOptional({ description: '客户端IP' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: '风险级别', enum: ['low', 'medium', 'high', 'critical'], default: 'low' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  riskLevel?: string;
}

/**
 * 查询审计日志请求
 */
export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '设备ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '资源类型' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: '资源ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: '风险级别', enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '是否成功' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  success?: boolean;

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

  @ApiPropertyOptional({ description: '每页数量', example: 50, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: '排序字段', enum: ['createdAt', 'action', 'riskLevel'], default: 'createdAt' })
  @IsOptional()
  @IsEnum(['createdAt', 'action', 'riskLevel'])
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 查询敏感审计日志请求
 */
export class QuerySensitiveAuditLogDto {
  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '数据类型', enum: ['credentials', 'payment', 'personal', 'config'] })
  @IsOptional()
  @IsEnum(['credentials', 'payment', 'personal', 'config'])
  dataType?: string;

  @ApiPropertyOptional({ description: '访问目的' })
  @IsOptional()
  @IsString()
  accessPurpose?: string;

  @ApiPropertyOptional({ description: '是否需要审批' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: '审批状态', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  approvalStatus?: string;

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

  @ApiPropertyOptional({ description: '每页数量', example: 50, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

/**
 * 审计日志统计响应
 */
export class AuditLogStatisticsDto {
  @ApiProperty({ description: '总日志数', example: 10000 })
  totalLogs: number;

  @ApiProperty({ description: '今日日志数', example: 150 })
  todayLogs: number;

  @ApiProperty({ description: '按操作类型统计', type: Object })
  byAction: Record<string, number>;

  @ApiProperty({ description: '按资源类型统计', type: Object })
  byResourceType: Record<string, number>;

  @ApiProperty({ description: '按风险级别统计', type: Object })
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  @ApiProperty({ description: '失败操作数', example: 25 })
  failedOperations: number;

  @ApiProperty({ description: '成功率', example: 98.5 })
  successRate: number;

  @ApiProperty({ description: '最近7天趋势', type: [Object] })
  recentTrend: Array<{
    date: string;
    count: number;
    failedCount: number;
  }>;

  @ApiProperty({ description: '高风险用户', type: [Object] })
  highRiskUsers: Array<{
    userId: string;
    riskScore: number;
    recentHighRiskActions: number;
  }>;
}

/**
 * 批量导出审计日志请求
 */
export class ExportAuditLogDto {
  @ApiProperty({ description: '导出格式', enum: ['csv', 'json', 'excel'], example: 'csv' })
  @IsEnum(['csv', 'json', 'excel'])
  exportFormat: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '包含字段', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];
}

/**
 * 审批敏感日志访问请求
 */
export class ApproveSensitiveAccessDto {
  @ApiProperty({ description: '审批决定', enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  decision: string;

  @ApiPropertyOptional({ description: '审批备注' })
  @IsOptional()
  @IsString()
  approvalNote?: string;
}

/**
 * 审计日志详情响应
 */
export class AuditLogDetailsDto {
  @ApiProperty({ description: '日志ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '操作类型' })
  action: string;

  @ApiProperty({ description: '资源类型' })
  resourceType: string;

  @ApiProperty({ description: '资源ID' })
  resourceId: string;

  @ApiProperty({ description: '操作详情', type: Object })
  details: any;

  @ApiProperty({ description: '请求数据', type: Object })
  requestData: any;

  @ApiProperty({ description: '响应数据', type: Object })
  responseData: any;

  @ApiProperty({ description: '客户端IP' })
  ipAddress: string;

  @ApiProperty({ description: 'User Agent' })
  userAgent: string;

  @ApiProperty({ description: '风险级别' })
  riskLevel: string;

  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

/**
 * 用户活动分析响应
 */
export class UserActivityAnalysisDto {
  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '总操作次数', example: 1500 })
  totalActions: number;

  @ApiProperty({ description: '最后活跃时间' })
  lastActiveAt: Date;

  @ApiProperty({ description: '最常用操作', type: [Object] })
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: '风险评分', example: 35.5 })
  riskScore: number;

  @ApiProperty({ description: '异常行为检测', type: [Object] })
  anomalies: Array<{
    type: string;
    description: string;
    detectedAt: Date;
    severity: string;
  }>;

  @ApiProperty({ description: '活动时间分布', type: Object })
  activityDistribution: {
    byHour: Record<number, number>;
    byDayOfWeek: Record<string, number>;
  };
}

/**
 * 系统审计摘要响应
 */
export class SystemAuditSummaryDto {
  @ApiProperty({ description: '活跃用户数', example: 150 })
  activeUsers: number;

  @ApiProperty({ description: '总操作次数', example: 50000 })
  totalOperations: number;

  @ApiProperty({ description: '高风险操作数', example: 25 })
  highRiskOperations: number;

  @ApiProperty({ description: '失败操作数', example: 100 })
  failedOperations: number;

  @ApiProperty({ description: '按资源类型统计', type: Object })
  byResourceType: Record<string, number>;

  @ApiProperty({ description: '按操作类型统计', type: Object })
  byAction: Record<string, number>;

  @ApiProperty({ description: '峰值时段', type: Object })
  peakHours: Array<{
    hour: number;
    operationCount: number;
  }>;

  @ApiProperty({ description: '合规性指标', type: Object })
  complianceMetrics: {
    auditCoverage: number; // 审计覆盖率
    sensitiveDataAccess: number; // 敏感数据访问次数
    approvalComplianceRate: number; // 审批合规率
  };
}
