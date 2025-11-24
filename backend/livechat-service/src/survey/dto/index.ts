import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  IsUUID,
  IsDate,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyTrigger, SurveyQuestion } from '../../entities/survey-template.entity';

// ========== Survey Template DTOs ==========

export class CreateSurveyTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @IsArray()
  questions: SurveyQuestion[];

  @IsOptional()
  @IsEnum(SurveyTrigger)
  trigger?: SurveyTrigger;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delaySeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInHours?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableGroupIds?: string[];
}

export class UpdateSurveyTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @IsOptional()
  @IsArray()
  questions?: SurveyQuestion[];

  @IsOptional()
  @IsEnum(SurveyTrigger)
  trigger?: SurveyTrigger;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delaySeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInHours?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableGroupIds?: string[];
}

// ========== Survey Response DTOs ==========

export class SubmitSurveyResponseDto {
  @IsUUID()
  surveyResponseId: string;

  @IsArray()
  answers: {
    questionId: string;
    value: any;
  }[];

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SendSurveyDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}

// ========== Query DTOs ==========

export class QuerySurveyTemplatesDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsEnum(SurveyTrigger)
  trigger?: SurveyTrigger;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}

export class QuerySurveyResponsesDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}

// ========== Statistics DTOs ==========

export interface SurveyStats {
  totalSent: number;
  totalCompleted: number;
  completionRate: number;
  avgOverallRating: number;
  avgNpsScore: number;
  npsBreakdown: {
    promoters: number;    // 9-10
    passives: number;     // 7-8
    detractors: number;   // 0-6
    nps: number;          // (promoters - detractors) / total * 100
  };
  categoryAverages: {
    responseSpeed: number;
    professionalism: number;
    problemSolving: number;
    attitude: number;
  };
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  topTags: {
    tag: string;
    count: number;
  }[];
  trendData: {
    date: string;
    avgRating: number;
    responseCount: number;
  }[];
}

export interface AgentSurveyStats {
  agentId: string;
  agentName?: string;
  totalResponses: number;
  avgOverallRating: number;
  avgNpsScore: number;
  categoryAverages: {
    responseSpeed: number;
    professionalism: number;
    problemSolving: number;
    attitude: number;
  };
}
