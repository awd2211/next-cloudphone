import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntentMatchType, IntentResponseType } from '../../entities/bot-intent.entity';

// ========== Bot DTOs ==========

export class CreateBotDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  welcomeMessage: string;

  @IsString()
  fallbackMessage: string;

  @IsOptional()
  @IsString()
  transferMessage?: string;

  @IsOptional()
  @IsString()
  offlineMessage?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxBotRounds?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  idleTimeout?: number;

  @IsOptional()
  @IsObject()
  workingHours?: Record<string, { start: string; end: string }>;

  @IsOptional()
  @IsObject()
  settings?: {
    enableTypingIndicator?: boolean;
    typingDelayMs?: number;
    enableQuickReplies?: boolean;
    enableFeedback?: boolean;
    aiEnabled?: boolean;
    aiModel?: string;
  };
}

export class UpdateBotDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  fallbackMessage?: string;

  @IsOptional()
  @IsString()
  transferMessage?: string;

  @IsOptional()
  @IsString()
  offlineMessage?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxBotRounds?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  idleTimeout?: number;

  @IsOptional()
  @IsObject()
  workingHours?: Record<string, { start: string; end: string }>;

  @IsOptional()
  @IsObject()
  settings?: {
    enableTypingIndicator?: boolean;
    typingDelayMs?: number;
    enableQuickReplies?: boolean;
    enableFeedback?: boolean;
    aiEnabled?: boolean;
    aiModel?: string;
  };
}

// ========== Intent DTOs ==========

export class CreateIntentDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(IntentMatchType)
  matchType: IntentMatchType;

  @IsArray()
  @IsString({ each: true })
  matchRules: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number;

  @IsEnum(IntentResponseType)
  responseType: IntentResponseType;

  @IsObject()
  responseContent: any;

  @IsOptional()
  @IsArray()
  alternativeResponses?: any[];

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  contextConditions?: {
    previousIntent?: string;
    sessionTags?: string[];
    userTags?: string[];
  };

  @IsOptional()
  @IsObject()
  postActions?: {
    setSessionTags?: string[];
    setUserTags?: string[];
    triggerEvent?: string;
  };
}

export class UpdateIntentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(IntentMatchType)
  matchType?: IntentMatchType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchRules?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number;

  @IsOptional()
  @IsEnum(IntentResponseType)
  responseType?: IntentResponseType;

  @IsOptional()
  @IsObject()
  responseContent?: any;

  @IsOptional()
  @IsArray()
  alternativeResponses?: any[];

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  contextConditions?: {
    previousIntent?: string;
    sessionTags?: string[];
    userTags?: string[];
  };

  @IsOptional()
  @IsObject()
  postActions?: {
    setSessionTags?: string[];
    setUserTags?: string[];
    triggerEvent?: string;
  };
}

// ========== Bot Conversation DTOs ==========

export class BotMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class TransferToAgentDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  preferredAgentId?: string;

  @IsOptional()
  @IsString()
  skillGroup?: string;
}

export class BotFeedbackDto {
  @IsUUID()
  botConversationId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

// ========== Query DTOs ==========

export class QueryBotsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}

export class QueryBotConversationsDto {
  @IsOptional()
  @IsUUID()
  botId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  resolvedByBot?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}

// ========== Response Types ==========

export interface BotResponse {
  type: 'text' | 'quick_replies' | 'card' | 'transfer' | 'knowledge';
  content: string;
  quickReplies?: string[];
  card?: {
    title: string;
    description?: string;
    image?: string;
    buttons?: { text: string; action: string }[];
  };
  transferTo?: string;
  knowledgeArticles?: any[];
  matchedIntent?: {
    id: string;
    name: string;
    confidence: number;
  };
}

export interface BotStats {
  totalConversations: number;
  botResolvedCount: number;
  transferredCount: number;
  avgBotRounds: number;
  avgSatisfactionScore: number;
  topIntents: { intentId: string; intentName: string; hitCount: number }[];
  resolutionRate: number;
}
