import { IsEnum, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CouponStatus } from '../entities/coupon.entity';

/**
 * 查询优惠券列表 DTO
 */
export class QueryCouponDto {
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}

/**
 * 使用优惠券 DTO
 */
export class UseCouponDto {
  @IsUUID()
  orderId: string; // 订单ID
}
