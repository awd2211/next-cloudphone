import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
