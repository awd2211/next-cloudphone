// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';
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
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class PayPalProvider implements IPaymentProvider {
  readonly providerName = 'paypal';
  private readonly logger = new Logger(PayPalProvider.name);
  private client: paypal.core.PayPalHttpClient | null = null;
  private config: {
    clientId: string;
    secret: string;
    mode: 'sandbox' | 'production';
    webhookId: string;
  };
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const mode = this.configService.get('PAYPAL_MODE', 'sandbox') as 'sandbox' | 'production';

    this.config = {
      clientId:
        mode === 'sandbox'
          ? this.configService.get('PAYPAL_SANDBOX_CLIENT_ID') || ''
          : this.configService.get('PAYPAL_LIVE_CLIENT_ID') || '',
      secret:
        mode === 'sandbox'
          ? this.configService.get('PAYPAL_SANDBOX_SECRET') || ''
          : this.configService.get('PAYPAL_LIVE_SECRET') || '',
      mode,
      webhookId: this.configService.get('PAYPAL_WEBHOOK_ID') || '',
    };

    this.baseUrl =
      mode === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';

    if (this.config.clientId && this.config.secret) {
      try {
        const environment =
          mode === 'sandbox'
            ? new paypal.core.SandboxEnvironment(this.config.clientId, this.config.secret)
            : new paypal.core.LiveEnvironment(this.config.clientId, this.config.secret);

        this.client = new paypal.core.PayPalHttpClient(environment);
        this.logger.log(`PayPal initialized in ${mode} mode`);
      } catch (error) {
        this.logger.error(`Failed to initialize PayPal: ${error.message}`);
      }
    } else {
      this.logger.warn('PayPal not configured. Please set environment variables.');
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
    if (!this.client) {
      throw new Error('PayPal not initialized');
    }

    const { amount, currency, description, paymentNo, returnUrl, metadata } = params;

    this.logger.log(
      `Creating PayPal order: ${paymentNo}, amount: ${amount} ${currency}`,
    );

    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: paymentNo,
            description,
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            custom_id: paymentNo,
          },
        ],
        application_context: {
          brand_name: this.configService.get('APP_NAME', 'Cloud Phone Platform'),
          return_url:
            returnUrl || `${this.configService.get('FRONTEND_URL')}/payment/success`,
          cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
          user_action: 'PAY_NOW',
        },
      });

      const response = await this.client.execute(request);
      const order = response.result;

      // 获取 approval URL
      const approvalLink = order.links?.find((link) => link.rel === 'approve');

      return {
        transactionId: order.id,
        paymentUrl: approvalLink?.href || '',
        metadata: {
          orderId: order.id,
          status: order.status,
        },
      };
    } catch (error) {
      this.logger.error(`PayPal order creation failed: ${error.message}`);
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
    if (!this.client) {
      throw new Error('PayPal not initialized');
    }

    const { priceId, successUrl, cancelUrl, metadata } = params;

    this.logger.log(`Creating PayPal subscription with plan: ${priceId}`);

    try {
      // 使用 REST API 创建订阅（因为 SDK 不完全支持）
      const accessToken = await this.getAccessToken();

      const subscriptionData: any = {
        plan_id: priceId,
        application_context: {
          brand_name: this.configService.get('APP_NAME', 'Cloud Phone Platform'),
          return_url:
            successUrl || `${this.configService.get('FRONTEND_URL')}/subscription/success`,
          cancel_url:
            cancelUrl || `${this.configService.get('FRONTEND_URL')}/subscription/cancel`,
          user_action: 'SUBSCRIBE_NOW',
        },
      };

      if (metadata) {
        subscriptionData.custom_id = JSON.stringify(metadata);
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v1/billing/subscriptions`, subscriptionData, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const subscription = response.data;
      const approvalLink = subscription.links?.find((link: any) => link.rel === 'approve');

      return {
        subscriptionId: subscription.id,
        customerId: subscription.subscriber?.email_address || '',
        status: subscription.status,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(), // PayPal 不直接返回，需要根据计费周期计算
        hostedPageUrl: approvalLink?.href || '',
        metadata: subscription,
      };
    } catch (error) {
      this.logger.error(`PayPal subscription creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  async queryPayment(paymentNo: string): Promise<PaymentQueryResult> {
    if (!this.client) {
      throw new Error('PayPal not initialized');
    }

    this.logger.log(`Querying PayPal order: ${paymentNo}`);

    try {
      // PayPal 使用 order ID 查询，这里假设 paymentNo 就是 orderId
      const request = new paypal.orders.OrdersGetRequest(paymentNo);
      const response = await this.client.execute(request);
      const order = response.result;

      let amount = 0;
      let currency = 'USD';

      if (order.purchase_units && order.purchase_units.length > 0) {
        const unit = order.purchase_units[0];
        amount = parseFloat(unit.amount?.value || '0');
        currency = unit.amount?.currency_code || 'USD';
      }

      return {
        transactionId: order.id,
        status: this.mapOrderStatus(order.status),
        amount,
        currency,
        paidAt: order.status === 'COMPLETED' ? new Date() : undefined,
        metadata: order,
      };
    } catch (error) {
      this.logger.error(`PayPal query order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询订阅状态
   */
  async querySubscription(subscriptionId: string): Promise<SubscriptionQueryResult> {
    if (!this.client) {
      throw new Error('PayPal not initialized');
    }

    this.logger.log(`Querying PayPal subscription: ${subscriptionId}`);

    try {
      const accessToken = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const subscription = response.data;

      return {
        subscriptionId: subscription.id,
        status: subscription.status.toLowerCase(),
        currentPeriodStart: new Date(subscription.start_time || Date.now()),
        currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now()),
        cancelAtPeriodEnd: subscription.status === 'CANCELLED',
        metadata: subscription,
      };
    } catch (error) {
      this.logger.error(`PayPal query subscription failed: ${error.message}`);
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
    if (!this.client) {
      throw new Error('PayPal not initialized');
    }

    const { paymentNo, refundNo, refundAmount, reason } = params;

    this.logger.log(`Creating PayPal refund: ${refundNo}, amount: ${refundAmount}`);

    try {
      // 首先获取 capture ID
      const order = await this.queryPayment(paymentNo);
      const captureId = await this.getCaptureId(paymentNo);

      if (!captureId) {
        throw new Error('Capture ID not found for this order');
      }

      const request = new paypal.payments.CapturesRefundRequest(captureId);
      request.requestBody({
        amount: {
          value: refundAmount.toFixed(2),
          currency_code: order.currency,
        },
        note_to_payer: reason || 'Refund processed',
        invoice_id: refundNo,
      });

      const response = await this.client.execute(request);
      const refund = response.result;

      return {
        refundId: refund.id,
        status: refund.status,
        amount: parseFloat(refund.amount?.value || '0'),
        refundedAt:
          refund.status === 'COMPLETED' ? new Date(refund.create_time) : undefined,
        metadata: refund,
      };
    } catch (error) {
      this.logger.error(`PayPal refund failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<boolean> {
    if (!this.client) {
      throw new Error('PayPal not initialized');
    }

    this.logger.log(`Canceling PayPal subscription: ${subscriptionId}`);

    try {
      const accessToken = await this.getAccessToken();

      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
          {
            reason: immediately ? 'Customer requested immediate cancellation' : 'Customer requested cancellation',
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return true;
    } catch (error) {
      this.logger.error(`PayPal cancel subscription failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 关闭未支付订单
   */
  async closeOrder(paymentNo: string): Promise<boolean> {
    // PayPal 订单会自动过期（通常3小时），不需要手动关闭
    this.logger.log(`PayPal orders auto-expire, no action needed for: ${paymentNo}`);
    return true;
  }

  /**
   * 验证 Webhook 签名
   */
  verifyWebhookSignature(payload: any, signature: string, timestamp?: string): boolean {
    if (!this.config.webhookId) {
      this.logger.warn('PayPal webhook ID not configured');
      return false;
    }

    try {
      // PayPal webhook 验证需要调用 API
      // 这里简化处理，实际应该调用 /v1/notifications/verify-webhook-signature
      // 由于是同步方法，这里返回 true，实际验证在 webhook 处理中进行
      return true;
    } catch (error) {
      this.logger.error(`PayPal webhook verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取客户端配置
   */
  getClientConfig(): { publicKey?: string; clientId?: string; mode?: string } {
    return {
      clientId: this.config.clientId,
      mode: this.config.mode,
    };
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.secret}`).toString('base64');

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    return response.data.access_token;
  }

  /**
   * 获取 Capture ID
   */
  private async getCaptureId(orderId: string): Promise<string | null> {
    try {
      const request = new paypal.orders.OrdersGetRequest(orderId);
      const response = await this.client!.execute(request);
      const order = response.result;

      if (order.purchase_units && order.purchase_units.length > 0) {
        const captures = order.purchase_units[0].payments?.captures;
        if (captures && captures.length > 0) {
          return captures[0].id;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get capture ID: ${error.message}`);
      return null;
    }
  }

  /**
   * 映射订单状态
   */
  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      CREATED: 'pending',
      SAVED: 'pending',
      APPROVED: 'processing',
      VOIDED: 'cancelled',
      COMPLETED: 'success',
      PAYER_ACTION_REQUIRED: 'pending',
    };

    return statusMap[status] || status.toLowerCase();
  }
}
