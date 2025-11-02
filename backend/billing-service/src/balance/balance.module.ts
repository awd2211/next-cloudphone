import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceService } from './balance.service';
import { BalanceController } from './balance.controller';
import { UserBalance } from './entities/user-balance.entity';
import { BalanceTransaction } from './entities/balance-transaction.entity';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBalance, BalanceTransaction]),
    AuthModule,
    CacheModule,
  ],
  controllers: [BalanceController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
