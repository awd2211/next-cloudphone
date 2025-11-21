import { IsString, IsOptional, IsBoolean, IsInt, IsObject, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLifecycleRuleDto {
  @ApiPropertyOptional({ description: '规则名称' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: '规则描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Cron 表达式' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({ description: '规则配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
