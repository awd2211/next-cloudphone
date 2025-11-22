import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingFeature } from '../entities/pricing-plan.entity';

class PricingFeatureDto implements PricingFeature {
  @IsString()
  name: string;

  @IsBoolean()
  included: boolean;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class CreatePricingPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  yearlyPrice?: number;

  @IsOptional()
  @IsBoolean()
  isCustomPrice?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingFeatureDto)
  features: PricingFeature[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlightFeatures?: string[];

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdatePricingPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  yearlyPrice?: number;

  @IsOptional()
  @IsBoolean()
  isCustomPrice?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingFeatureDto)
  features?: PricingFeature[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlightFeatures?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
