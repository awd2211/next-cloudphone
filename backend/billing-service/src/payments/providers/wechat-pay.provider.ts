import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WxPay from 'wechatpay-node-v3';
import * as crypto from 'crypto';

export interface WeChatPayConfig {
  appId: string;
  mchId: string;
  serialNo: string;
  apiV3Key: string;
  privateKey: string;
  publicKey?: string;
}

export interface WeChatPayResult {
  prepayId: string;
  codeUrl?: string;
  transactionId?: string;
}

@Injectable()
export class WeChatPayProvider {
  private readonly logger = new Logger(WeChatPayProvider.name);
  private wxPay: any;
  private config: WeChatPayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      appId: this.configService.get('WECHAT_APP_ID') || '',
      mchId: this.configService.get('WECHAT_MCH_ID') || '',
      serialNo: this.configService.get('WECHAT_SERIAL_NO') || '',
      apiV3Key: this.configService.get('WECHAT_API_V3_KEY') || '',
      privateKey: this.configService.get('WECHAT_PRIVATE_KEY') || '',
    };

    // 初始化微信支付
    if (this.config.mchId && this.config.apiV3Key) {
      try {
        this.wxPay = new WxPay({
          appid: this.config.appId,
          mchid: this.config.mchId,
          serial_no: this.config.serialNo,
          publicKey: this.config.publicKey,
          privateKey: this.config.privateKey,
          key: this.config.apiV3Key,
        });
        this.logger.log('WeChat Pay initialized successfully');
      } catch (error) {
        this.logger.warn(
          `Failed to initialize WeChat Pay: ${error.message}. Using mock mode.`,
        );
      }
    } else {
      this.logger.warn(
        'WeChat Pay credentials not configured. Using mock mode.',
      );
    }
  }

  /**
   * 创建 Native 支付订单（扫码支付）
   */
  async createNativeOrder(
    paymentNo: string,
    description: string,
    amount: number,
    notifyUrl: string,
  ): Promise<WeChatPayResult> {
    this.logger.log(
      `Creating WeChat Pay Native order: ${paymentNo}, amount: ${amount}`,
    );

    // Mock 模式
    if (!this.wxPay) {
      return this.createMockNativeOrder(paymentNo, amount);
    }

    try {
      const params = {
        description,
        out_trade_no: paymentNo,
        notify_url: notifyUrl,
        amount: {
          total: Math.round(amount * 100), // 转换为分
        },
      };

      const result = await this.wxPay.transactions_native(params);

      return {
        prepayId: result.prepay_id || '',
        codeUrl: result.code_url || '',
      };
    } catch (error) {
      this.logger.error(`WeChat Pay Native order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询订单支付状态
   */
  async queryOrder(paymentNo: string): Promise<any> {
    this.logger.log(`Querying WeChat Pay order: ${paymentNo}`);

    // Mock 模式
    if (!this.wxPay) {
      return this.queryMockOrder(paymentNo);
    }

    try {
      const result = await this.wxPay.query({ out_trade_no: paymentNo });
      return {
        transactionId: result.transaction_id,
        tradeState: result.trade_state,
        tradeStateDesc: result.trade_state_desc,
        successTime: result.success_time,
        amount: result.amount?.total ? result.amount.total / 100 : 0,
      };
    } catch (error) {
      this.logger.error(`WeChat Pay query failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(paymentNo: string): Promise<void> {
    this.logger.log(`Closing WeChat Pay order: ${paymentNo}`);

    if (!this.wxPay) {
      return;
    }

    try {
      await this.wxPay.close({ out_trade_no: paymentNo });
    } catch (error) {
      this.logger.error(`WeChat Pay close order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refund(
    paymentNo: string,
    refundNo: string,
    totalAmount: number,
    refundAmount: number,
    reason: string,
  ): Promise<any> {
    this.logger.log(
      `Creating WeChat Pay refund: ${refundNo}, amount: ${refundAmount}`,
    );

    // Mock 模式
    if (!this.wxPay) {
      return this.createMockRefund(refundNo, refundAmount);
    }

    try {
      const params = {
        out_trade_no: paymentNo,
        out_refund_no: refundNo,
        reason,
        amount: {
          refund: Math.round(refundAmount * 100),
          total: Math.round(totalAmount * 100),
          currency: 'CNY',
        },
      };

      const result = await this.wxPay.refund(params);

      return {
        refundId: result.refund_id,
        status: result.status,
        createTime: result.create_time,
      };
    } catch (error) {
      this.logger.error(`WeChat Pay refund failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证支付回调签名
   */
  verifyNotification(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
  ): boolean {
    if (!this.config.publicKey) {
      this.logger.warn('WeChat Pay public key not configured, skipping verification');
      return true; // Mock 模式下通过验证
    }

    const message = `${timestamp}\n${nonce}\n${body}\n`;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);

    return verify.verify(this.config.publicKey, signature, 'base64');
  }

  /**
   * Mock: 创建 Native 订单
   */
  private createMockNativeOrder(
    paymentNo: string,
    amount: number,
  ): WeChatPayResult {
    return {
      prepayId: `mock_prepay_${paymentNo}`,
      codeUrl: `weixin://wxpay/bizpayurl?pr=mock_${paymentNo}`,
    };
  }

  /**
   * Mock: 查询订单
   */
  private queryMockOrder(paymentNo: string): any {
    return {
      transactionId: `mock_transaction_${paymentNo}`,
      tradeState: 'NOTPAY', // 未支付
      tradeStateDesc: '订单未支付',
      amount: 0,
    };
  }

  /**
   * Mock: 创建退款
   */
  private createMockRefund(refundNo: string, refundAmount: number): any {
    return {
      refundId: `mock_refund_${refundNo}`,
      status: 'SUCCESS',
      createTime: new Date().toISOString(),
    };
  }
}
