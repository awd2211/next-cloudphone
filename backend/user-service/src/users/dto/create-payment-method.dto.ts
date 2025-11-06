import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
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
import { PaymentMethodType } from '../../entities/payment-method.entity';

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

export class CreatePaymentMethodDto {
  @ApiProperty({
    enum: PaymentMethodType,
    description: '支付方式类型',
    example: PaymentMethodType.CREDIT_CARD,
  })
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @ApiProperty({ description: '支付方式显示名称', example: '我的Visa卡' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: '卡号后4位', example: '1234' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  lastFour?: string;

  @ApiPropertyOptional({ description: '卡品牌', example: 'Visa' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  cardBrand?: string;

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

  @ApiPropertyOptional({
    description: '账户标识符 (支付宝/微信账号等)',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  accountIdentifier?: string;

  @ApiPropertyOptional({ description: '支付服务商', example: 'Stripe' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  paymentProvider?: string;

  @ApiPropertyOptional({ description: '支付服务商的支付方式ID', example: 'pm_1234567890' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  providerPaymentMethodId?: string;

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
