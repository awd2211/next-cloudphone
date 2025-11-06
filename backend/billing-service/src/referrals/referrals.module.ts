import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { ReferralConfig } from './entities/referral-config.entity';
import { ReferralRecord } from './entities/referral-record.entity';
import { WithdrawRecord } from './entities/withdraw-record.entity';
import { EarningsRecord } from './entities/earnings-record.entity';

/**
 * 邀请返利模块
 * 提供邀请码管理、邀请记录追踪、提现管理等功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralConfig, ReferralRecord, WithdrawRecord, EarningsRecord]),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
