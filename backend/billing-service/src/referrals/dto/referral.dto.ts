import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsString,
  MinLength,
  MaxLength,
  IsPositive,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReferralStatus } from '../entities/referral-record.entity';
import { WithdrawStatus, WithdrawMethod } from '../entities/withdraw-record.entity';
import { EarningsType } from '../entities/earnings-record.entity';

/**
 * 查询邀请记录 DTO
 */
export class QueryReferralDto {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
 * 查询提现记录 DTO
 */
export class QueryWithdrawDto {
  @IsOptional()
  @IsEnum(WithdrawStatus)
  status?: WithdrawStatus;

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
 * 查询收益明细 DTO
 */
export class QueryEarningsDto {
  @IsOptional()
  @IsEnum(EarningsType)
  type?: EarningsType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
 * 申请提现 DTO
 */
export class ApplyWithdrawDto {
  @IsNumber()
  @IsPositive()
  amount: number; // 提现金额

  @IsEnum(WithdrawMethod)
  method: WithdrawMethod; // 提现方式

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  account: string; // 提现账户

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountName?: string; // 账户名

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string; // 备注
}

/**
 * 分享 DTO
 */
export class ShareDto {
  @IsIn(['wechat', 'qq', 'weibo', 'link'])
  platform: 'wechat' | 'qq' | 'weibo' | 'link';

  @IsString()
  inviteCode: string;
}
