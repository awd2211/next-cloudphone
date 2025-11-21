import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsNumber, Min, Max } from 'class-validator';
import { StrategyType } from '../../entities/scheduling-strategy.entity';

/**
 * 创建调度策略 DTO
 */
export class CreateStrategyDto {
  @IsString()
  name: string;

  @IsEnum(StrategyType)
  type: StrategyType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;
}

/**
 * 更新调度策略 DTO
 */
export class UpdateStrategyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(StrategyType)
  type?: StrategyType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;
}
