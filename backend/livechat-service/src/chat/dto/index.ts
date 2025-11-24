import { IsString, IsOptional, IsEnum, IsUUID, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConversationChannel,
  ConversationPriority,
  ConversationStatus,
} from '../../entities/conversation.entity';
import { MessageType, MessageSender, MessageAttachment } from '../../entities/message.entity';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: '用户名称' })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ description: '用户邮箱' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ description: '用户头像' })
  @IsOptional()
  @IsString()
  userAvatar?: string;

  @ApiPropertyOptional({ description: '会话主题' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationChannel, description: '渠道' })
  @IsOptional()
  @IsEnum(ConversationChannel)
  channel?: ConversationChannel;

  @ApiPropertyOptional({ enum: ConversationPriority, description: '优先级' })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ description: '关联设备ID' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({ enum: ConversationStatus, description: '会话状态' })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ enum: ConversationPriority, description: '优先级' })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ description: '会话主题' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: '会话摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SendMessageDto {
  @ApiProperty({ description: '消息内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, description: '消息类型' })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ enum: MessageSender, description: '发送者类型' })
  @IsOptional()
  @IsEnum(MessageSender)
  sender?: MessageSender;

  @ApiPropertyOptional({ description: '发送者名称' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ description: '发送者头像' })
  @IsOptional()
  @IsString()
  senderAvatar?: string;

  @ApiPropertyOptional({ description: '附件' })
  @IsOptional()
  @IsArray()
  attachments?: MessageAttachment[];

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: '回复消息ID' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class AssignAgentDto {
  @ApiProperty({ description: '客服ID' })
  @IsUUID()
  agentId: string;
}

export class TransferConversationDto {
  @ApiProperty({ description: '目标客服ID' })
  @IsUUID()
  toAgentId: string;

  @ApiPropertyOptional({ description: '转接原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 编辑消息 DTO
 */
export class EditMessageDto {
  @ApiProperty({ description: '新的消息内容' })
  @IsString()
  content: string;
}

/**
 * 撤回消息 DTO
 */
export class RevokeMessageDto {
  @ApiPropertyOptional({ description: '撤回原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}
