/**
 * SLA 预警系统 DTO
 */
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlaMetricType, SlaSeverity, SlaActionType } from '../../entities/sla-rule.entity';
import { SlaAlertStatus } from '../../entities/sla-alert.entity';

export class CreateSlaRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '规则描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SlaMetricType, description: '监控指标类型' })
  @IsEnum(SlaMetricType)
  metricType: SlaMetricType;

  @ApiProperty({ enum: SlaSeverity, description: '告警级别' })
  @IsEnum(SlaSeverity)
  severity: SlaSeverity;

  @ApiProperty({ description: '阈值' })
  @IsNumber()
  threshold: number;

  @ApiPropertyOptional({ description: '阈值单位', default: 'seconds' })
  @IsOptional()
  @IsString()
  thresholdUnit?: string;

  @ApiPropertyOptional({ type: [String], enum: SlaActionType, description: '告警动作' })
  @IsOptional()
  @IsArray()
  @IsEnum(SlaActionType, { each: true })
  actions?: SlaActionType[];

  @ApiPropertyOptional({ description: '动作配置' })
  @IsOptional()
  actionConfig?: {
    notifyRoles?: string[];
    emailRecipients?: string[];
    escalateTo?: string;
  };

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: '优先级过滤' })
  @IsOptional()
  @IsArray()
  priorityFilter?: string[];

  @ApiPropertyOptional({ type: [String], description: '分组过滤' })
  @IsOptional()
  @IsArray()
  groupFilter?: string[];
}

export class UpdateSlaRuleDto {
  @ApiPropertyOptional({ description: '规则名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '规则描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SlaSeverity, description: '告警级别' })
  @IsOptional()
  @IsEnum(SlaSeverity)
  severity?: SlaSeverity;

  @ApiPropertyOptional({ description: '阈值' })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({ description: '阈值单位' })
  @IsOptional()
  @IsString()
  thresholdUnit?: string;

  @ApiPropertyOptional({ type: [String], enum: SlaActionType, description: '告警动作' })
  @IsOptional()
  @IsArray()
  actions?: SlaActionType[];

  @ApiPropertyOptional({ description: '动作配置' })
  @IsOptional()
  actionConfig?: {
    notifyRoles?: string[];
    emailRecipients?: string[];
    escalateTo?: string;
  };

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QuerySlaAlertsDto {
  @ApiPropertyOptional({ enum: SlaAlertStatus, description: '告警状态' })
  @IsOptional()
  @IsEnum(SlaAlertStatus)
  status?: SlaAlertStatus;

  @ApiPropertyOptional({ enum: SlaSeverity, description: '告警级别' })
  @IsOptional()
  @IsEnum(SlaSeverity)
  severity?: SlaSeverity;

  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: '限制数量' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
