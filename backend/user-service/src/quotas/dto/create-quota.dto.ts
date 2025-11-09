import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotaLimitsDto } from './quota-limits.dto';

/**
 * 创建配额 DTO
 */
export class CreateQuotaDto {
  @ApiProperty({
    description: '用户 ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: '套餐 ID',
    example: 'plan-basic',
  })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({
    description: '套餐名称',
    example: 'Basic Plan',
  })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiProperty({
    description: '配额限制',
    type: QuotaLimitsDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => QuotaLimitsDto)
  limits: QuotaLimitsDto;

  @ApiPropertyOptional({
    description: '生效时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validFrom?: Date;

  @ApiPropertyOptional({
    description: '失效时间',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @ApiPropertyOptional({
    description: '是否自动续期',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({
    description: '备注',
    example: 'VIP user quota',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
