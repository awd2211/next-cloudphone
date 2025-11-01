import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: '订单ID', example: 'uuid-order-id' })
  @IsUUID('4', { message: '订单ID格式不正确，必须是有效的UUID' })
  orderId: string;

  @ApiProperty({
    description: '支付方式',
    enum: PaymentMethod,
    example: PaymentMethod.WECHAT,
  })
  @IsEnum(PaymentMethod, { message: '支付方式不正确' })
  method: PaymentMethod;

  @ApiProperty({
    description: '支付金额（单位：元，最小0.01元，最大100万元）',
    example: 99.9,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber({}, { message: '支付金额必须是数字' })
  @Min(0.01, { message: '支付金额至少为0.01元' })
  @Max(1000000, { message: '支付金额最多为100万元' })
  amount: number;

  @ApiProperty({
    description: '用户ID',
    example: 'uuid-user-id',
    required: false,
  })
  @IsString({ message: '用户ID必须是字符串' })
  @IsOptional()
  userId?: string;
}

export class RefundPaymentDto {
  @ApiProperty({
    description: '退款金额（单位：元，最小0.01元，最大100万元）',
    example: 99.9,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber({}, { message: '退款金额必须是数字' })
  @Min(0.01, { message: '退款金额至少为0.01元' })
  @Max(1000000, { message: '退款金额最多为100万元' })
  amount: number;

  @ApiProperty({
    description: '退款原因',
    example: '用户申请退款',
    maxLength: 500,
  })
  @IsString({ message: '退款原因必须是字符串' })
  @MaxLength(500, { message: '退款原因最多500个字符' })
  @Transform(({ value }) => value?.toString().trim())
  reason: string;
}

export class QueryPaymentDto {
  @ApiProperty({
    description: '支付单号（格式：PAY + 时间戳 + 序列号）',
    example: 'PAY202501201234567890',
  })
  @IsString({ message: '支付单号必须是字符串' })
  @Matches(/^PAY\d{20}$/, {
    message: '支付单号格式不正确，必须是PAY开头的20位数字',
  })
  paymentNo: string;
}
