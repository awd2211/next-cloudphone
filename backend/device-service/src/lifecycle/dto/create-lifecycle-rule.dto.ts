import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsObject, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LifecycleRuleType } from '../../entities/lifecycle-rule.entity';

export class CreateLifecycleRuleDto {
  @ApiProperty({ description: '规则名称', example: '自动清理闲置设备' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: '规则描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '规则类型',
    enum: LifecycleRuleType,
    example: LifecycleRuleType.CLEANUP,
  })
  @IsEnum(LifecycleRuleType)
  type: LifecycleRuleType;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '优先级', default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Cron 表达式', example: '0 2 * * *' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiProperty({ description: '规则配置', example: { idleThresholdHours: 24 } })
  @IsObject()
  config: Record<string, any>;
}
