import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { BillingCycle, PlanType } from '../entities/plan.entity';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PlanType)
  type: PlanType;

  @IsNumber()
  price: number;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsNumber()
  @IsOptional()
  deviceQuota?: number;

  @IsNumber()
  @IsOptional()
  storageQuotaGB?: number;

  @IsNumber()
  @IsOptional()
  trafficQuotaGB?: number;

  @IsArray()
  @IsOptional()
  features?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
