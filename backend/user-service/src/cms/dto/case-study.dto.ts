import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CaseStudyIndustry,
  CaseStudyResult,
  CaseStudyTestimonial,
} from '../entities/case-study.entity';

class CaseStudyResultDto implements CaseStudyResult {
  @IsString()
  metric: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class CaseStudyTestimonialDto implements CaseStudyTestimonial {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class CreateCaseStudyDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsEnum(CaseStudyIndustry)
  industry?: CaseStudyIndustry;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  solution?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaseStudyResultDto)
  results?: CaseStudyResult[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseStudyTestimonialDto)
  testimonial?: CaseStudyTestimonial;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateCaseStudyDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEnum(CaseStudyIndustry)
  industry?: CaseStudyIndustry;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  solution?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaseStudyResultDto)
  results?: CaseStudyResult[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseStudyTestimonialDto)
  testimonial?: CaseStudyTestimonial;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
