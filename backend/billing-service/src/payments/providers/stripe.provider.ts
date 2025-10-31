// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
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

@Injectable()
export class StripeProvider implements IPaymentProvider {
  readonly providerName = 'stripe';
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe | null = null;
  private config: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
    mode: 'test' | 'live';
  };

  constructor(private configService: ConfigService) {
    const mode = this.configService.get('STRIPE_MODE', 'test') as 'test' | 'live';

    this.config = {
      secretKey:
        mode === 'test'
          ? this.configService.get('STRIPE_TEST_SECRET_KEY') || ''
          : this.configService.get('STRIPE_LIVE_SECRET_KEY') || '',
      publicKey:
        mode === 'test'
          ? this.configService.get('STRIPE_TEST_PUBLIC_KEY') || ''
          : this.configService.get('STRIPE_LIVE_PUBLIC_KEY') || '',
      webhookSecret: this.configService.get('STRIPE_WEBHOOK_SECRET') || '',
      mode,
    };

    if (this.config.secretKey) {
      try {
        this.stripe = new Stripe(this.config.secretKey, {
          typescript: true,
        });
        this.logger.log(`Stripe initialized in ${mode} mode`);
      } catch (error) {
        this.logger.error(`Failed to initialize Stripe: ${error.message}`);
      }
    } else {
      this.logger.warn('Stripe not configured. Please set environment variables.');
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
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const { amount, currency, description, paymentNo, returnUrl, mode, customerId, metadata } =
      params;

    this.logger.log(
      `Creating Stripe ${mode || 'hosted'} payment: ${paymentNo}, amount: ${amount} ${currency}`
    );

    try {
      // 托管模式：使用 Checkout Session
      if (mode === PaymentMode.HOSTED || !mode) {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card', 'alipay', 'wechat_pay'],
          line_items: [
            {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: {
                  name: description,
                },
                unit_amount: Math.round(amount * 100), // 转换为分
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url:
            returnUrl ||
            `${this.configService.get('FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: returnUrl || `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
          client_reference_id: paymentNo,
          customer: customerId,
          metadata: {
            paymentNo,
            ...metadata,
          },
        });

        return {
          transactionId: session.id,
          paymentUrl: session.url || '',
          metadata: {
            sessionId: session.id,
          },
        };
      }

      // 自定义模式：使用 Payment Intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        description,
        metadata: {
          paymentNo,
          ...metadata,
        },
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        customerId: paymentIntent.customer as string,
        metadata: {
          paymentIntentId: paymentIntent.id,
        },
      };
    } catch (error) {
      this.logger.error(`Stripe payment creation failed: ${error.message}`);
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
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const {
      customerId,
      customerEmail,
      priceId,
      trialPeriodDays,
      mode,
      successUrl,
      cancelUrl,
      metadata,
    } = params;

    this.logger.log(`Creating Stripe subscription for customer: ${customerId || customerEmail}`);

    try {
      // 托管模式：使用 Checkout Session
      if (mode === PaymentMode.HOSTED || !mode) {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url:
            successUrl ||
            `${this.configService.get('FRONTEND_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || `${this.configService.get('FRONTEND_URL')}/subscription/cancel`,
          customer: customerId,
          customer_email: !customerId ? customerEmail : undefined,
          subscription_data: {
            trial_period_days: trialPeriodDays,
            metadata,
          },
        });

        // 获取订阅详情（如果已创建）
        if (session.subscription) {
          const subscription = await this.stripe.subscriptions.retrieve(
            session.subscription as string
          );
          return this.mapSubscriptionResult(subscription, session.url || '');
        }

        return {
          subscriptionId: session.id,
          customerId: session.customer as string,
          status: 'incomplete',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          hostedPageUrl: session.url || '',
        };
      }

      // 自定义模式：直接创建订阅
      let customer = customerId;
      if (!customer && customerEmail) {
        const newCustomer = await this.stripe.customers.create({
          email: customerEmail,
          metadata,
        });
        customer = newCustomer.id;
      }

      if (!customer) {
        throw new Error('Customer ID or email is required');
      }

      const subscription = await this.stripe.subscriptions.create({
        customer,
        items: [{ price: priceId }],
        trial_period_days: trialPeriodDays,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
        },
        expand: ['latest_invoice.payment_intent'],
        metadata,
      });

      return this.mapSubscriptionResult(subscription);
    } catch (error) {
      this.logger.error(`Stripe subscription creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  async queryPayment(paymentNo: string): Promise<PaymentQueryResult> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    this.logger.log(`Querying Stripe payment: ${paymentNo}`);

    try {
      // 查询 Payment Intent
      const paymentIntents = await this.stripe.paymentIntents.search({
        query: `metadata['paymentNo']:'${paymentNo}'`,
      });

      if (paymentIntents.data.length > 0) {
        const intent = paymentIntents.data[0];
        return {
          transactionId: intent.id,
          status: this.mapPaymentStatus(intent.status),
          amount: intent.amount / 100,
          currency: intent.currency.toUpperCase(),
          paidAt: intent.status === 'succeeded' ? new Date(intent.created * 1000) : undefined,
          metadata: intent.metadata,
        };
      }

      // 查询 Checkout Session
      const sessions = await this.stripe.checkout.sessions.list({
        limit: 10,
      });

      const session = sessions.data.find((s) => s.client_reference_id === paymentNo);

      if (session) {
        return {
          transactionId: session.id,
          status: this.mapPaymentStatus(session.payment_status || 'unpaid'),
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'usd').toUpperCase(),
          paidAt: session.payment_status === 'paid' ? new Date(session.created * 1000) : undefined,
          metadata: session.metadata || {},
        };
      }

      throw new Error(`Payment not found: ${paymentNo}`);
    } catch (error) {
      this.logger.error(`Stripe query payment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询订阅状态
   */
  async querySubscription(subscriptionId: string): Promise<SubscriptionQueryResult> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    this.logger.log(`Querying Stripe subscription: ${subscriptionId}`);

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: subscription.metadata,
      };
    } catch (error) {
      this.logger.error(`Stripe query subscription failed: ${error.message}`);
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
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const { paymentNo, refundNo, refundAmount, reason, metadata } = params;

    this.logger.log(`Creating Stripe refund: ${refundNo}, amount: ${refundAmount}`);

    try {
      // 查找支付意图
      const queryResult = await this.queryPayment(paymentNo);

      const refund = await this.stripe.refunds.create({
        payment_intent: queryResult.transactionId,
        amount: Math.round(refundAmount * 100),
        reason: reason as any,
        metadata: {
          refundNo,
          ...metadata,
        },
      });

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        refundedAt: refund.status === 'succeeded' ? new Date(refund.created * 1000) : undefined,
        metadata: refund.metadata,
      };
    } catch (error) {
      this.logger.error(`Stripe refund failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<boolean> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    this.logger.log(
      `Canceling Stripe subscription: ${subscriptionId}, immediately: ${immediately}`
    );

    try {
      if (immediately) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
      return true;
    } catch (error) {
      this.logger.error(`Stripe cancel subscription failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 关闭未支付订单
   */
  async closeOrder(paymentNo: string): Promise<boolean> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    this.logger.log(`Closing Stripe order: ${paymentNo}`);

    try {
      const queryResult = await this.queryPayment(paymentNo);

      if (queryResult.status === 'pending' || queryResult.status === 'processing') {
        await this.stripe.paymentIntents.cancel(queryResult.transactionId);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Stripe close order failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 验证 Webhook 签名
   */
  verifyWebhookSignature(payload: any, signature: string, timestamp?: string): boolean {
    if (!this.stripe || !this.config.webhookSecret) {
      this.logger.warn('Stripe webhook secret not configured');
      return false;
    }

    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
      return true;
    } catch (error) {
      this.logger.error(`Stripe webhook verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取客户端配置
   */
  getClientConfig(): { publicKey?: string; clientId?: string; mode?: string } {
    return {
      publicKey: this.config.publicKey,
      mode: this.config.mode,
    };
  }

  /**
   * 映射订阅结果
   */
  private mapSubscriptionResult(
    subscription: Stripe.Subscription,
    hostedPageUrl?: string
  ): SubscriptionResult {
    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    return {
      subscriptionId: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      hostedPageUrl,
      clientSecret: paymentIntent?.client_secret || undefined,
      metadata: subscription.metadata,
    };
  }

  /**
   * 映射支付状态
   */
  private mapPaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      succeeded: 'success',
      processing: 'processing',
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      canceled: 'cancelled',
      failed: 'failed',
      paid: 'success',
      unpaid: 'pending',
    };

    return statusMap[status] || status;
  }
}
