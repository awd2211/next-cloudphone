import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingRulesService } from './billing-rules.service';
import { BillingRulesController } from './billing-rules.controller';
import { BillingRule } from './entities/billing-rule.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BillingRule]), AuthModule],
  controllers: [BillingRulesController],
  providers: [BillingRulesService],
  exports: [BillingRulesService],
})
export class BillingRulesModule {}
