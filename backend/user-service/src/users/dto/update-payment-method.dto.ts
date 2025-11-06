import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Length,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BillingAddressDto {
  @ApiPropertyOptional({ description: '国家' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '省/州' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '邮政编码' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: '地址行1' })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ description: '地址行2' })
  @IsOptional()
  @IsString()
  addressLine2?: string;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({ description: '支付方式显示名称', example: '我的Visa卡' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: '有效期月份 (1-12)', example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @ApiPropertyOptional({ description: '有效期年份', example: 2025 })
  @IsOptional()
  @IsInt()
  @Min(2024)
  expiryYear?: number;

  @ApiPropertyOptional({ description: '是否设为默认支付方式', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '账单地址' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiPropertyOptional({ description: '额外元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
