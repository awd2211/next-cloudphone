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
import { PaymentProviderConfig } from './entities/payment-provider-config.entity';
import { Order } from '../billing/entities/order.entity';
import { CurrencyModule } from '../currency/currency.module';
import { WeChatPayProvider } from './providers/wechat-pay.provider';
import { AlipayProvider } from './providers/alipay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PayPalProvider } from './providers/paypal.provider';
import { PaddleProvider } from './providers/paddle.provider';
import { BalanceClientService } from './clients/balance-client.service';
import { EncryptionService } from './services/encryption.service';
import { PaymentConfigService } from './services/payment-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Subscription, Order, PaymentProviderConfig]),
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
    EncryptionService,
    PaymentConfigService,
  ],
  exports: [PaymentsService, PaymentConfigService, EncryptionService],
})
export class PaymentsModule {}
