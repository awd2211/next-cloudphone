import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AuditAction, AuditLevel } from '../../entities/audit-log.entity';

export class SearchLogsDto {
  @ApiPropertyOptional({ description: '用户 ID', example: 'user-123' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '操作类型',
    enum: AuditAction,
    example: 'USER_LOGIN',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // 空字符串转为 undefined
    if (value === '') return undefined;
    // 将查询参数字符串（如 "USER_LOGIN"）转换为枚举值（如 "user_login"）
    if (typeof value === 'string' && value in AuditAction) {
      return AuditAction[value as keyof typeof AuditAction];
    }
    return value;
  })
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: '日志级别',
    enum: AuditLevel,
    example: 'INFO',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // 将查询参数字符串（如 "ERROR"）转换为枚举值（如 "error"）
    if (typeof value === 'string' && value in AuditLevel) {
      return AuditLevel[value as keyof typeof AuditLevel];
    }
    return value;
  })
  @IsEnum(AuditLevel)
  level?: AuditLevel;

  @ApiPropertyOptional({ description: '资源类型', example: 'device' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: '资源 ID', example: 'device-123' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'IP 地址', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: '开始日期 (ISO 8601)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (ISO 8601)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '是否成功', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({
    description: '状态（前端格式）',
    enum: ['success', 'failed', 'warning'],
    example: 'success',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'HTTP 方法',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    example: 'POST',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: '搜索关键词（描述、操作）', example: '登录' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: '返回数量限制（兼容参数）', example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '偏移量（兼容参数）', example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
