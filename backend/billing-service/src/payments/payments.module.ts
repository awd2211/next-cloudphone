import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { HttpClientModule, SagaModule } from '@cloudphone/shared';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsAdminController } from './admin/payments-admin.controller';
import { PaymentsAdminService } from './admin/payments-admin.service';
import { Payment } from './entities/payment.entity';
import { Subscription } from './entities/subscription.entity';
import { Order } from '../billing/entities/order.entity';
import { CurrencyModule } from '../currency/currency.module';
import { WeChatPayProvider } from './providers/wechat-pay.provider';
import { AlipayProvider } from './providers/alipay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PayPalProvider } from './providers/paypal.provider';
import { PaddleProvider } from './providers/paddle.provider';
import { BalanceClientService } from './clients/balance-client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Subscription, Order]),
    ConfigModule,
    HttpModule,
    HttpClientModule,
    CurrencyModule,
    SagaModule, // ✅ PaymentsService 依赖 SagaOrchestratorService
  ],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [
    PaymentsService,
    PaymentsAdminService,
    WeChatPayProvider,
    AlipayProvider,
    StripeProvider,
    PayPalProvider,
    PaddleProvider,
    BalanceClientService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
