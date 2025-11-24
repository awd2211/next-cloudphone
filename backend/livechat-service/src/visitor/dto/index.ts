import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  IsUUID,
  IsEmail,
  Min,
  Max,
} from 'class-validator';
import { VisitorSource, VisitorEventType } from '../../entities';

// ========== Visitor Profile DTOs ==========

export class CreateVisitorProfileDto {
  @IsString()
  visitorId: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(VisitorSource)
  source?: VisitorSource;

  @IsOptional()
  @IsString()
  sourceDetail?: string;

  @IsOptional()
  @IsString()
  initialUrl?: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  geoInfo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, any>;
}

export class UpdateVisitorProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manualTags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  intentLevel?: number;

  @IsOptional()
  @IsString()
  valueLevel?: 'low' | 'medium' | 'high' | 'vip';

  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class RemoveTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

// ========== Visitor Event DTOs ==========

export class TrackEventDto {
  @IsString()
  visitorId: string;

  @IsString()
  sessionId: string;

  @IsEnum(VisitorEventType)
  eventType: VisitorEventType;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  pageTitle?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

// ========== Query DTOs ==========

export class QueryVisitorProfilesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(VisitorSource)
  source?: VisitorSource;

  @IsOptional()
  @IsString()
  valueLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

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

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

export class QueryVisitorEventsDto {
  @IsOptional()
  @IsUUID()
  visitorProfileId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsEnum(VisitorEventType)
  eventType?: VisitorEventType;

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

// ========== Statistics DTOs ==========

export interface VisitorStats {
  totalVisitors: number;
  newVisitorsToday: number;
  returningVisitors: number;
  avgConversationsPerVisitor: number;
  avgSatisfactionScore: number;
  sourceDistribution: { source: string; count: number; percentage: number }[];
  valueLevelDistribution: { level: string; count: number }[];
  topTags: { tag: string; count: number }[];
  deviceDistribution: { device: string; count: number }[];
  geoDistribution: { country: string; count: number }[];
}

export interface VisitorTimeline {
  events: {
    id: string;
    type: string;
    eventName?: string;
    pageUrl?: string;
    pageTitle?: string;
    eventData?: any;
    duration?: number;
    createdAt: string;
  }[];
  conversations: {
    id: string;
    status: string;
    agentName?: string;
    messageCount: number;
    satisfactionScore?: number;
    createdAt: string;
    resolvedAt?: string;
  }[];
}
