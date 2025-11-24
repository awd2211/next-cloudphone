import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketLinkType, TicketLinkStatus } from '../../entities/ticket-link.entity';
import { TicketTemplateType } from '../../entities/ticket-template.entity';

// ========== Ticket Conversion DTOs ==========

export class CreateTicketFromConversationDto {
  @ApiProperty({ description: '会话ID' })
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({ description: '工单主题' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: '工单描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '优先级' })
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority: 'low' | 'normal' | 'high' | 'urgent';

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '使用的模板ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: '是否包含聊天记录' })
  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean;

  @ApiPropertyOptional({ description: '聊天记录条数' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  historyLimit?: number;

  @ApiPropertyOptional({ description: '分配给当前客服' })
  @IsOptional()
  @IsBoolean()
  assignToCurrentAgent?: boolean;

  @ApiPropertyOptional({ description: '同步评论' })
  @IsOptional()
  @IsBoolean()
  syncComments?: boolean;

  @ApiPropertyOptional({ description: '同步状态变更' })
  @IsOptional()
  @IsBoolean()
  syncStatusChanges?: boolean;

  @ApiPropertyOptional({ description: '自定义字段值' })
  @IsOptional()
  customFields?: Record<string, any>;
}

export class AddTicketCommentDto {
  @ApiProperty({ description: '评论内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '是否内部评论' })
  @IsOptional()
  @IsBoolean()
  internal?: boolean;

  @ApiPropertyOptional({ description: '是否同步到会话' })
  @IsOptional()
  @IsBoolean()
  syncToConversation?: boolean;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ description: '新状态' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: '状态变更原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '是否通知会话' })
  @IsOptional()
  @IsBoolean()
  notifyConversation?: boolean;
}

export class UpdateTicketPriorityDto {
  @ApiProperty({ description: '新优先级' })
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority: 'low' | 'normal' | 'high' | 'urgent';

  @ApiPropertyOptional({ description: '变更原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ========== Ticket Link DTOs ==========

export class CreateTicketLinkDto {
  @ApiProperty({ description: '会话ID' })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: '工单ID' })
  @IsUUID()
  ticketId: string;

  @ApiPropertyOptional({ enum: TicketLinkType, description: '关联类型' })
  @IsOptional()
  @IsEnum(TicketLinkType)
  linkType?: TicketLinkType;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '同步评论' })
  @IsOptional()
  @IsBoolean()
  syncComments?: boolean;

  @ApiPropertyOptional({ description: '同步状态变更' })
  @IsOptional()
  @IsBoolean()
  syncStatusChanges?: boolean;
}

export class QueryTicketLinksDto {
  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: '工单ID' })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({ enum: TicketLinkType, description: '关联类型' })
  @IsOptional()
  @IsEnum(TicketLinkType)
  linkType?: TicketLinkType;

  @ApiPropertyOptional({ enum: TicketLinkStatus, description: '关联状态' })
  @IsOptional()
  @IsEnum(TicketLinkStatus)
  status?: TicketLinkStatus;

  @ApiPropertyOptional({ description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

// ========== Ticket Template DTOs ==========

export class CreateTicketTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TicketTemplateType, description: '模板类型' })
  @IsEnum(TicketTemplateType)
  type: TicketTemplateType;

  @ApiPropertyOptional({ description: '主题模板' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiPropertyOptional({ description: '描述模板' })
  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @ApiPropertyOptional({ description: '默认优先级' })
  @IsOptional()
  @IsString()
  defaultPriority?: string;

  @ApiPropertyOptional({ description: '默认分类' })
  @IsOptional()
  @IsString()
  defaultCategory?: string;

  @ApiPropertyOptional({ description: '默认标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultTags?: string[];

  @ApiPropertyOptional({ description: '是否包含聊天记录' })
  @IsOptional()
  @IsBoolean()
  includeConversationHistory?: boolean;

  @ApiPropertyOptional({ description: '聊天记录条数限制' })
  @IsOptional()
  @IsNumber()
  historyLimit?: number;

  @ApiPropertyOptional({ description: '自定义字段' })
  @IsOptional()
  customFields?: {
    name: string;
    type: 'text' | 'select' | 'number' | 'date';
    required: boolean;
    options?: string[];
    defaultValue?: string;
  }[];

  @ApiPropertyOptional({ description: '同步设置' })
  @IsOptional()
  syncSettings?: {
    syncComments: boolean;
    syncStatusChanges: boolean;
    syncPriorityChanges: boolean;
    notifyOnUpdate: boolean;
  };

  @ApiPropertyOptional({ description: '自动分配设置' })
  @IsOptional()
  autoAssignSettings?: {
    assignToCurrentAgent: boolean;
    assignToGroup?: string;
    assignToUser?: string;
  };

  @ApiPropertyOptional({ description: '是否为默认模板' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateTicketTemplateDto extends CreateTicketTemplateDto {
  @ApiPropertyOptional({ description: '是否激活' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryTicketTemplatesDto {
  @ApiPropertyOptional({ enum: TicketTemplateType, description: '模板类型' })
  @IsOptional()
  @IsEnum(TicketTemplateType)
  type?: TicketTemplateType;

  @ApiPropertyOptional({ description: '是否激活' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

// ========== Response Types ==========

export interface TicketLinkResponse {
  id: string;
  conversationId: string;
  ticketId: string;
  ticketNumber?: string;
  linkType: TicketLinkType;
  status: TicketLinkStatus;
  ticketInfo?: {
    subject?: string;
    status?: string;
    priority?: string;
    category?: string;
    assigneeId?: string;
    assigneeName?: string;
    lastUpdatedAt?: Date;
  };
  syncSettings?: {
    syncComments?: boolean;
    syncStatusChanges?: boolean;
    syncPriorityChanges?: boolean;
    notifyOnUpdate?: boolean;
  };
  createdBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketTemplateResponse {
  id: string;
  name: string;
  description?: string;
  type: TicketTemplateType;
  subjectTemplate?: string;
  descriptionTemplate?: string;
  defaultPriority: string;
  defaultCategory?: string;
  defaultTags?: string[];
  includeConversationHistory: boolean;
  historyLimit: number;
  customFields?: {
    name: string;
    type: string;
    required: boolean;
    options?: string[];
    defaultValue?: string;
  }[];
  syncSettings?: {
    syncComments: boolean;
    syncStatusChanges: boolean;
    syncPriorityChanges: boolean;
    notifyOnUpdate: boolean;
  };
  autoAssignSettings?: {
    assignToCurrentAgent: boolean;
    assignToGroup?: string;
    assignToUser?: string;
  };
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface ConvertedTicketResponse {
  ticketId: string;
  ticketNumber?: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  linkId: string;
  conversationId: string;
  createdAt: Date;
}

export interface TicketSyncEvent {
  type: 'comment' | 'status_change' | 'priority_change' | 'assignment_change';
  ticketId: string;
  conversationId?: string;
  data: {
    oldValue?: string;
    newValue?: string;
    content?: string;
    performedBy?: string;
    timestamp?: Date;
  };
}

export interface TicketStatsResponse {
  totalLinks: number;
  activeLinks: number;
  resolvedLinks: number;
  linksByType: Record<TicketLinkType, number>;
  totalTemplates: number;
  activeTemplates: number;
  conversionsToday: number;
  conversionsThisWeek: number;
  avgResponseTime?: number;
}
