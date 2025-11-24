import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
} from 'class-validator';
import { CollaboratorRole, InternalMessageType } from '../../entities';

// ========== Collaboration DTOs ==========

export class InviteCollaboratorDto {
  @IsUUID()
  conversationId: string;

  @IsUUID()
  agentId: string;

  @IsOptional()
  @IsEnum(CollaboratorRole)
  role?: CollaboratorRole;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RespondInvitationDto {
  @IsUUID()
  collaborationId: string;

  @IsString()
  action: 'accept' | 'decline';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class LeaveCollaborationDto {
  @IsUUID()
  collaborationId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateCollaboratorRoleDto {
  @IsUUID()
  collaborationId: string;

  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;
}

// ========== Internal Message DTOs ==========

export class SendInternalMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(InternalMessageType)
  type?: InternalMessageType;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recipientIds?: string[];

  @IsOptional()
  metadata?: {
    knowledgeArticleId?: string;
    cannedResponseId?: string;
    suggestedReply?: string;
    priority?: 'low' | 'normal' | 'high';
  };
}

export class MarkMessagesReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}

// ========== Query DTOs ==========

export class QueryCollaborationsDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class QueryInternalMessagesDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsEnum(InternalMessageType)
  type?: InternalMessageType;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

// ========== Response Types ==========

export interface CollaborationInfo {
  id: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  role: string;
  status: string;
  invitedBy?: string;
  invitedByName?: string;
  inviteReason?: string;
  joinedAt?: string;
  messageCount: number;
}

export interface ConversationCollaborators {
  conversationId: string;
  primaryAgent: CollaborationInfo | null;
  collaborators: CollaborationInfo[];
  pendingInvitations: CollaborationInfo[];
}
