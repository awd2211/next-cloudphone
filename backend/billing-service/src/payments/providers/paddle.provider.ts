// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import {
  IPaymentProvider,
  OneTimePaymentResult,
  SubscriptionResult,
  RefundResult,
  PaymentQueryResult,
  SubscriptionQueryResult,
} from '../interfaces/payment-provider.interface';
import { PaymentMode } from '../entities/payment.entity';
import { SubscriptionInterval } from '../entities/subscription.entity';
import * as crypto from 'crypto';

@Injectable()
export class PaddleProvider implements IPaymentProvider {
  readonly providerName = 'paddle';
  private readonly logger = new Logger(PaddleProvider.name);
  private paddle: Paddle | null = null;
  private config: {
    apiKey: string;
    environment: Environment;
    webhookSecret: string;
  };

  constructor(private configService: ConfigService) {
    const environment =
      this.configService.get('PADDLE_ENVIRONMENT', 'sandbox') === 'production'
        ? Environment.production
        : Environment.sandbox;

    this.config = {
      apiKey: this.configService.get('PADDLE_API_KEY') || '',
      environment,
      webhookSecret: this.configService.get('PADDLE_WEBHOOK_SECRET') || '',
    };

    if (this.config.apiKey) {
      try {
        this.paddle = new Paddle(this.config.apiKey, {
          environment: this.config.environment,
        });
        this.logger.log(`Paddle initialized in ${environment} mode`);
      } catch (error) {
        this.logger.error(`Failed to initialize Paddle: ${error.message}`);
      }
    } else {
      this.logger.warn('Paddle not configured. Please set environment variables.');
    }
  }

  /**
   * 创建一次性支付
   */
  async createOneTimePayment(params: {
    amount: number;
    currency: string;
    description: string;
    paymentNo: string;
    notifyUrl: string;
    returnUrl?: string;
    mode?: PaymentMode;
    customerId?: string;
    metadata?: any;
  }): Promise<OneTimePaymentResult> {
    if (!this.paddle) {
      throw new Error('Paddle not initialized');
    }

    const { amount, currency, description, paymentNo, returnUrl, customerId, metadata } = params;

    this.logger.log(`Creating Paddle transaction: ${paymentNo}, amount: ${amount} ${currency}`);

    try {
      // Paddle 主要使用托管页面
      // 创建价格项
      const priceData = {
        description,
        name: description,
        unitPrice: {
          amount: Math.round(amount * 100).toString(), // Paddle 使用字符串格式的分
          currencyCode: currency.toUpperCase(),
        },
        quantity: 1,
      };

      // 创建交易
      const transaction = await this.paddle.transactions.create({
        items: [
          {
            priceId: undefined as any, // 使用内联价格
            price: priceData,
          } as any,
        ],
        customerId: customerId,
        customData: {
          paymentNo,
          ...metadata,
        },
        settings: {
          successUrl: returnUrl || `${this.configService.get('FRONTEND_URL')}/payment/success`,
          locale: 'en',
        },
      });

      return {
        transactionId: transaction.id,
        paymentUrl: transaction.checkoutUrl || '',
        metadata: {
          transactionId: transaction.id,
          status: transaction.status,
        },
      };
    } catch (error) {
      this.logger.error(`Paddle transaction creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建订阅
   */
  async createSubscription(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    planId?: string;
    interval: SubscriptionInterval;
    intervalCount?: number;
    trialPeriodDays?: number;
    currency: string;
    mode?: PaymentMode;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: any;
  }): Promise<SubscriptionResult> {
    if (!this.paddle) {
      throw new Error('Paddle not initialized');
    }

    const { customerId, customerEmail, priceId, trialPeriodDays, successUrl, metadata } = params;

    this.logger.log(`Creating Paddle subscription for customer: ${customerId || customerEmail}`);

    try {
      // 如果没有 customerId，先创建客户
      let customer = customerId;
      if (!customer && customerEmail) {
        const newCustomer = await this.paddle.customers.create({
          email: customerEmail,
        });
        customer = newCustomer.id;
      }

      if (!customer) {
        throw new Error('Customer ID or email is required');
      }

      // 创建订阅
      const subscription = await this.paddle.subscriptions.create({
        customerId: customer,
        items: [
          {
            priceId: priceId,
            quantity: 1,
          },
        ],
        customData: metadata,
        scheduledChange: trialPeriodDays
          ? {
              action: 'pause' as any,
              effectiveAt: new Date(
                Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000
              ).toISOString(),
            }
          : undefined,
      });

      // 获取订阅的结算周期信息
      let currentPeriodEnd = new Date();
      if (subscription.currentBillingPeriod) {
        currentPeriodEnd = new Date(subscription.currentBillingPeriod.endsAt);
      }

      // 对于托管模式，创建一个 checkout 链接
      let hostedPageUrl = '';
      if (!params.mode || params.mode === PaymentMode.HOSTED) {
        // 创建交易来获取 checkout URL
        const transaction = await this.paddle.transactions.create({
          items: [
            {
              priceId: priceId,
              quantity: 1,
            },
          ],
          customerId: customer,
          settings: {
            successUrl:
              successUrl || `${this.configService.get('FRONTEND_URL')}/subscription/success`,
            locale: 'en',
          },
        });

        hostedPageUrl = transaction.checkoutUrl || '';
      }

      return {
        subscriptionId: subscription.id,
        customerId: customer,
        status: subscription.status,
        currentPeriodStart: subscription.currentBillingPeriod
          ? new Date(subscription.currentBillingPeriod.startsAt)
          : new Date(),
        currentPeriodEnd,
        trialEnd: trialPeriodDays
          ? new Date(Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000)
          : undefined,
        hostedPageUrl,
        metadata: subscription,
      };
    } catch (error) {
      this.logger.error(`Paddle subscription creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  async queryPayment(paymentNo: string): Promise<PaymentQueryResult> {
    if (!this.paddle) {
      throw new Error('Paddle not initialized');
    }

    this.logger.log(`Querying Paddle transaction: ${paymentNo}`);

    try {
      // Paddle 需要使用 transaction ID 查询
      // 这里假设 paymentNo 是 transaction ID
      const transaction = await this.paddle.transactions.get(paymentNo);

      let amount = 0;
      let currency = 'USD';

      if (transaction.details?.totals) {
        amount = parseInt(transaction.details.totals.total) / 100;
        currency = transaction.currencyCode || 'USD';
      }

      return {
        transactionId: transaction.id,
        status: this.mapTransactionStatus(transaction.status),
        amount,
        currency,
        paidAt: transaction.status === 'completed' ? new Date(transaction.createdAt) : undefined,
        metadata: transaction,
      };
    } catch (error) {
      this.logger.error(`Paddle query transaction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询订阅状态
   */
  async querySubscription(subscriptionId: string): Promise<SubscriptionQueryResult> {
    if (!this.paddle) {
      throw new Error('Paddle not initialized');
    }

    this.logger.log(`Querying Paddle subscription: ${subscriptionId}`);

    try {
      const subscription = await this.paddle.subscriptions.get(subscriptionId);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentBillingPeriod
          ? new Date(subscription.currentBillingPeriod.startsAt)
          : new Date(),
        currentPeriodEnd: subscription.currentBillingPeriod
          ? new Date(subscription.currentBillingPeriod.endsAt)
          : new Date(),
        cancelAtPeriodEnd: subscription.scheduledChange?.action === 'cancel',
        metadata: subscription,
      };
    } catch (error) {
      this.logger.error(`Paddle query subscription failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refund(params: {
    paymentNo: string;
    refundNo: string;
    totalAmount: number;
    refundAmount: number;
    reason?: string;
    metadata?: any;
  }): Promise<RefundResult> {
    if (!this.paddle) {
      throw new Error('Paddle not initialized');
    }

    const { paymentNo, refundAmount, reason } = params;

    this.logger.log(`Creating Paddle refund: ${paymentNo}, amount: ${refundAmount}`);

    try {
      // Paddle 需要先获取交易信息
      const transaction = await this.paddle.transactions.get(paymentNo);

      // 创建退款调整
      const adjustment = await this.paddle.adjustments.create({
        transactionId: paymentNo,
        action: 'refund',
        reason: (reason as any) || 'Customer request',
        items: transaction.items?.map((item) => ({
          itemId: item.id,
          type: 'partial' as any,
          amount: Math.round(refundAmount * 100).toString(),
        })),
      });

      return {
        refundId: adjustment.id,
        status: adjustment.status,
        amount: parseInt(adjustment.totals?.total || '0') / 100,
        refundedAt: adjustment.status === 'approved' ? new Date() : undefined,
        metadata: adjustment,
      };
    } catch (error) {
      this.logger.error(`Paddle refund failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<boolean> {
    if (!this.paddle) {
      throw new Error('Paddle not initialized');
    }

    this.logger.log(
      `Canceling Paddle subscription: ${subscriptionId}, immediately: ${immediately}`
    );

    try {
      if (immediately) {
        // 立即取消
        await this.paddle.subscriptions.cancel(subscriptionId, {
          effectiveFrom: 'immediately' as any,
        });
      } else {
        // 周期结束时取消
        await this.paddle.subscriptions.cancel(subscriptionId, {
          effectiveFrom: 'next_billing_period' as any,
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`Paddle cancel subscription failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 关闭未支付订单
   */
  async closeOrder(paymentNo: string): Promise<boolean> {
    // Paddle 交易会自动过期
    this.logger.log(`Paddle transactions auto-expire, no action needed for: ${paymentNo}`);
    return true;
  }

  /**
   * 验证 Webhook 签名
   */
  verifyWebhookSignature(payload: any, signature: string, timestamp?: string): boolean {
    if (!this.config.webhookSecret) {
      this.logger.warn('Paddle webhook secret not configured');
      return false;
    }

    try {
      // Paddle webhook 验证
      // 格式: ts:signature
      const [ts, sig] = signature.split(':');

      if (!ts || !sig) {
        return false;
      }

      // 构建签名字符串
      const signedPayload = `${ts}:${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature));
    } catch (error) {
      this.logger.error(`Paddle webhook verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取客户端配置
   */
  getClientConfig(): { publicKey?: string; clientId?: string; mode?: string } {
    return {
      mode: this.config.environment === Environment.production ? 'production' : 'sandbox',
    };
  }

  /**
   * 映射交易状态
   */
  private mapTransactionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'pending',
      ready: 'pending',
      billed: 'processing',
      paid: 'success',
      completed: 'success',
      canceled: 'cancelled',
      past_due: 'failed',
    };

    return statusMap[status] || status;
  }
}
