import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AlipaySdk from 'alipay-sdk';
import * as crypto from 'crypto';

export interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gateway?: string;
  charset?: string;
  signType?: string;
}

export interface AlipayResult {
  tradeNo: string;
  qrCode?: string;
  url?: string;
}

@Injectable()
export class AlipayProvider {
  private readonly logger = new Logger(AlipayProvider.name);
  private alipaySdk: AlipaySdk | null = null;
  private config: AlipayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      appId: this.configService.get('ALIPAY_APP_ID') || '',
      privateKey: this.configService.get('ALIPAY_PRIVATE_KEY') || '',
      alipayPublicKey: this.configService.get('ALIPAY_PUBLIC_KEY') || '',
      gateway: this.configService.get('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
      charset: 'utf-8',
      signType: 'RSA2',
    };

    // 初始化支付宝SDK
    if (this.config.appId && this.config.privateKey) {
      try {
        this.alipaySdk = new AlipaySdk({
          appId: this.config.appId,
          privateKey: this.config.privateKey,
          alipayPublicKey: this.config.alipayPublicKey,
          gateway: this.config.gateway,
          charset: this.config.charset,
          signType: this.config.signType,
        });
        this.logger.log('Alipay SDK initialized successfully');
      } catch (error) {
        this.logger.warn(
          `Failed to initialize Alipay SDK: ${error.message}. Using mock mode.`,
        );
      }
    } else {
      this.logger.warn('Alipay credentials not configured. Using mock mode.');
    }
  }

  /**
   * 创建扫码支付订单（PC网站支付）
   */
  async createQrCodeOrder(
    paymentNo: string,
    subject: string,
    amount: number,
    notifyUrl: string,
    returnUrl?: string,
  ): Promise<AlipayResult> {
    this.logger.log(
      `Creating Alipay QR code order: ${paymentNo}, amount: ${amount}`,
    );

    // Mock 模式
    if (!this.alipaySdk) {
      return this.createMockQrCodeOrder(paymentNo, amount);
    }

    try {
      const result = await this.alipaySdk.exec('alipay.trade.precreate', {
        bizContent: {
          out_trade_no: paymentNo,
          total_amount: amount.toFixed(2),
          subject,
          timeout_express: '15m',
        },
        notifyUrl,
      });

      return {
        tradeNo: result.outTradeNo || paymentNo,
        qrCode: result.qrCode || '',
      };
    } catch (error) {
      this.logger.error(`Alipay QR code order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建手机网站支付订单
   */
  async createWapOrder(
    paymentNo: string,
    subject: string,
    amount: number,
    notifyUrl: string,
    returnUrl: string,
  ): Promise<AlipayResult> {
    this.logger.log(
      `Creating Alipay WAP order: ${paymentNo}, amount: ${amount}`,
    );

    // Mock 模式
    if (!this.alipaySdk) {
      return this.createMockWapOrder(paymentNo, amount);
    }

    try {
      const result = await this.alipaySdk.exec('alipay.trade.wap.pay', {
        bizContent: {
          out_trade_no: paymentNo,
          total_amount: amount.toFixed(2),
          subject,
          product_code: 'QUICK_WAP_WAY',
          timeout_express: '15m',
        },
        notifyUrl,
        returnUrl,
      });

      return {
        tradeNo: paymentNo,
        url: result || '',
      };
    } catch (error) {
      this.logger.error(`Alipay WAP order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询订单支付状态
   */
  async queryOrder(paymentNo: string): Promise<any> {
    this.logger.log(`Querying Alipay order: ${paymentNo}`);

    // Mock 模式
    if (!this.alipaySdk) {
      return this.queryMockOrder(paymentNo);
    }

    try {
      const result = await this.alipaySdk.exec('alipay.trade.query', {
        bizContent: {
          out_trade_no: paymentNo,
        },
      });

      return {
        tradeNo: result.tradeNo,
        outTradeNo: result.outTradeNo,
        tradeStatus: result.tradeStatus,
        totalAmount: parseFloat(result.totalAmount || '0'),
        buyerUserId: result.buyerUserId,
        sendPayDate: result.sendPayDate,
      };
    } catch (error) {
      this.logger.error(`Alipay query failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(paymentNo: string): Promise<void> {
    this.logger.log(`Closing Alipay order: ${paymentNo}`);

    if (!this.alipaySdk) {
      return;
    }

    try {
      await this.alipaySdk.exec('alipay.trade.close', {
        bizContent: {
          out_trade_no: paymentNo,
        },
      });
    } catch (error) {
      this.logger.error(`Alipay close order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refund(
    paymentNo: string,
    refundAmount: number,
    reason: string,
  ): Promise<any> {
    this.logger.log(
      `Creating Alipay refund: ${paymentNo}, amount: ${refundAmount}`,
    );

    // Mock 模式
    if (!this.alipaySdk) {
      return this.createMockRefund(paymentNo, refundAmount);
    }

    try {
      const result = await this.alipaySdk.exec('alipay.trade.refund', {
        bizContent: {
          out_trade_no: paymentNo,
          refund_amount: refundAmount.toFixed(2),
          refund_reason: reason,
        },
      });

      return {
        tradeNo: result.tradeNo,
        outTradeNo: result.outTradeNo,
        fundChange: result.fundChange,
        refundFee: parseFloat(result.refundFee || '0'),
        gmtRefundPay: result.gmtRefundPay,
      };
    } catch (error) {
      this.logger.error(`Alipay refund failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证支付回调签名
   */
  verifyNotification(params: any): boolean {
    if (!this.alipaySdk) {
      this.logger.warn('Alipay SDK not initialized, skipping verification');
      return true; // Mock 模式下通过验证
    }

    try {
      return this.alipaySdk.checkNotifySign(params);
    } catch (error) {
      this.logger.error(`Alipay notification verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Mock: 创建扫码支付订单
   */
  private createMockQrCodeOrder(
    paymentNo: string,
    amount: number,
  ): AlipayResult {
    return {
      tradeNo: `mock_alipay_${paymentNo}`,
      qrCode: `https://qr.alipay.com/mock_${paymentNo}`,
    };
  }

  /**
   * Mock: 创建手机网站支付订单
   */
  private createMockWapOrder(
    paymentNo: string,
    amount: number,
  ): AlipayResult {
    return {
      tradeNo: `mock_alipay_${paymentNo}`,
      url: `https://openapi.alipay.com/gateway.do?mock=${paymentNo}`,
    };
  }

  /**
   * Mock: 查询订单
   */
  private queryMockOrder(paymentNo: string): any {
    return {
      tradeNo: `mock_alipay_${paymentNo}`,
      outTradeNo: paymentNo,
      tradeStatus: 'WAIT_BUYER_PAY', // 等待买家付款
      totalAmount: 0,
    };
  }

  /**
   * Mock: 创建退款
   */
  private createMockRefund(paymentNo: string, refundAmount: number): any {
    return {
      tradeNo: `mock_alipay_${paymentNo}`,
      outTradeNo: paymentNo,
      fundChange: 'Y',
      refundFee: refundAmount,
      gmtRefundPay: new Date().toISOString(),
    };
  }
}
