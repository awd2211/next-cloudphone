import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AuditAction } from '../../entities/audit-log.entity';

export class GetUserLogsDto {
  @ApiPropertyOptional({
    description: '操作类型',
    enum: AuditAction,
    example: 'USER_LOGIN',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // 将查询参数字符串（如 "USER_LOGIN"）转换为枚举值（如 "user_login"）
    if (typeof value === 'string' && value in AuditAction) {
      return AuditAction[value as keyof typeof AuditAction];
    }
    return value;
  })
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: '资源类型', example: 'device' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: '开始日期 (ISO 8601)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (ISO 8601)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '返回数量限制', example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '偏移量', example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
