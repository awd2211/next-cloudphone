import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: '订单ID', example: 'uuid-order-id' })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: '支付方式',
    enum: PaymentMethod,
    example: PaymentMethod.WECHAT,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: '支付金额', example: 99.9, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: '用户ID',
    example: 'uuid-user-id',
    required: false,
  })
  @IsString()
  userId?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: '退款金额', example: 99.9, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: '退款原因', example: '用户申请退款' })
  @IsString()
  reason: string;
}

export class QueryPaymentDto {
  @ApiProperty({ description: '支付单号', example: 'PAY202501201234567890' })
  @IsString()
  paymentNo: string;
}
