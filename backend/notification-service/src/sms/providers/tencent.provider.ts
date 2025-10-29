import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SmsProvider,
  SmsOptions,
  SmsResult,
  SmsProviderConfig,
} from '../sms.interface';
import * as crypto from 'crypto';
import axios from 'axios';

/**
 * 腾讯云短信服务提供商
 *
 * 腾讯云短信服务(SMS)是国内主流的短信平台，支持:
 * - 覆盖全球200+国家和地区
 * - 三网合一
 * - 验证码、通知、营销短信
 * - 99%到达率
 * - 腾讯云安全防护
 *
 * 官方文档: https://cloud.tencent.com/document/product/382
 *
 * 环境变量配置:
 * - TENCENT_SMS_SECRET_ID: 腾讯云 SecretId
 * - TENCENT_SMS_SECRET_KEY: 腾讯云 SecretKey
 * - TENCENT_SMS_APP_ID: 短信应用ID (SDK AppID)
 * - TENCENT_SMS_SIGN_NAME: 短信签名
 * - TENCENT_SMS_TEMPLATE_ID_OTP: 验证码模板ID
 * - TENCENT_SMS_TEMPLATE_ID_NOTIFICATION: 通知模板ID
 * - TENCENT_SMS_REGION: 地域 (默认: ap-guangzhou)
 *
 * 使用示例:
 * ```typescript
 * const provider = new TencentSmsProvider(configService);
 * const result = await provider.send({
 *   to: '+8613800138000',
 *   message: 'Your code is 123456',
 *   isOtp: true,
 * });
 * ```
 */
@Injectable()
export class TencentSmsProvider implements SmsProvider {
  readonly name = 'Tencent Cloud SMS';
  private readonly logger = new Logger(TencentSmsProvider.name);
  private config: SmsProviderConfig & {
    appId?: string;
    signName?: string;
    templateIdOtp?: string;
    templateIdNotification?: string;
    region?: string;
    endpoint?: string;
  };
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.logger.log('Tencent Cloud SMS Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'tencent',
      secretId: this.configService.get<string>('TENCENT_SMS_SECRET_ID'),
      secretKey: this.configService.get<string>('TENCENT_SMS_SECRET_KEY'),
      appId: this.configService.get<string>('TENCENT_SMS_APP_ID'),
      signName: this.configService.get<string>('TENCENT_SMS_SIGN_NAME'),
      templateIdOtp: this.configService.get<string>(
        'TENCENT_SMS_TEMPLATE_ID_OTP',
      ),
      templateIdNotification: this.configService.get<string>(
        'TENCENT_SMS_TEMPLATE_ID_NOTIFICATION',
      ),
      enabled: this.configService.get<boolean>('TENCENT_SMS_ENABLED', false),
      region: this.configService.get<string>(
        'TENCENT_SMS_REGION',
        'ap-guangzhou',
      ),
      endpoint: 'sms.tencentcloudapi.com',
    };

    // 验证必需配置
    if (!this.config.secretId || !this.config.secretKey) {
      this.logger.warn(
        'Tencent Cloud SMS credentials not configured. SMS sending will fail.',
      );
    }

    if (!this.config.appId || !this.config.signName) {
      this.logger.warn(
        'Tencent Cloud SMS app ID or sign name not configured.',
      );
    }
  }

  /**
   * 发送短信
   */
  async send(options: SmsOptions): Promise<SmsResult> {
    try {
      this.stats.pending++;

      // 验证配置
      if (
        !this.config.secretId ||
        !this.config.secretKey ||
        !this.config.appId ||
        !this.config.signName
      ) {
        this.stats.pending--;
        this.stats.failed++;
        return {
          success: false,
          error: 'Tencent Cloud SMS not properly configured',
        };
      }

      // 规范化手机号
      const phoneNumber = this.normalizePhoneNumber(options.to);

      // 提取模板参数
      let templateParamSet: string[];
      if (options.isOtp) {
        // 验证码短信
        const codeMatch = options.message.match(/\b\d{4,6}\b/);
        const code = codeMatch ? codeMatch[0] : '000000';
        // 大部分验证码模板格式: {1}是验证码，{2}是有效期
        templateParamSet = [code, '5']; // 默认5分钟有效期
      } else {
        // 通知短信
        templateParamSet = [options.message];
      }

      // 构建请求 payload
      const payload = {
        PhoneNumberSet: [phoneNumber],
        SmsSdkAppId: this.config.appId,
        SignName: this.config.signName,
        TemplateId: options.isOtp
          ? this.config.templateIdOtp
          : this.config.templateIdNotification,
        TemplateParamSet: templateParamSet,
      };

      // 构建请求头
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = this.buildHeaders('SendSms', payload, timestamp);

      // 发送请求
      const response = await axios({
        method: 'POST',
        url: `https://${this.config.endpoint}/`,
        headers,
        data: payload,
        timeout: 10000,
      });

      this.stats.pending--;

      // 检查响应
      if (response.data.Response?.SendStatusSet?.[0]?.Code === 'Ok') {
        this.stats.sent++;
        const messageId = response.data.Response.SendStatusSet[0].SerialNo;
        this.logger.log(
          `SMS sent successfully via Tencent Cloud to ${phoneNumber}, MessageId: ${messageId}`,
        );
        return {
          success: true,
          messageId,
          provider: this.name,
        };
      } else {
        this.stats.failed++;
        const error =
          response.data.Response?.SendStatusSet?.[0]?.Message ||
          response.data.Response?.Error?.Message ||
          'Unknown error';
        this.logger.error(`Tencent Cloud SMS failed: ${error}`);
        return {
          success: false,
          error,
        };
      }
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      this.logger.error('Tencent Cloud SMS error:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 批量发送短信
   */
  async sendBatch(recipients: string[], message: string): Promise<SmsResult[]> {
    // 腾讯云支持批量发送（一次最多200个号码）
    const batchSize = 200;
    const results: SmsResult[] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchResults = await this.sendBatchInternal(batch, message);
      results.push(...batchResults);

      // 避免频率限制
      if (i + batchSize < recipients.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * 内部批量发送
   */
  private async sendBatchInternal(
    recipients: string[],
    message: string,
  ): Promise<SmsResult[]> {
    try {
      // 规范化所有手机号
      const phoneNumbers = recipients.map((r) => this.normalizePhoneNumber(r));

      // 构建请求 payload
      const payload = {
        PhoneNumberSet: phoneNumbers,
        SmsSdkAppId: this.config.appId,
        SignName: this.config.signName,
        TemplateId: this.config.templateIdNotification,
        TemplateParamSet: [message],
      };

      // 构建请求头
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = this.buildHeaders('SendSms', payload, timestamp);

      // 发送请求
      const response = await axios({
        method: 'POST',
        url: `https://${this.config.endpoint}/`,
        headers,
        data: payload,
        timeout: 10000,
      });

      // 解析每个号码的结果
      const sendStatusSet = response.data.Response?.SendStatusSet || [];
      return sendStatusSet.map((status: any, index: number) => {
        if (status.Code === 'Ok') {
          return {
            success: true,
            messageId: status.SerialNo,
            provider: this.name,
          };
        } else {
          return {
            success: false,
            error: status.Message || 'Unknown error',
          };
        }
      });
    } catch (error: any) {
      // 如果批量发送失败，返回所有失败
      return recipients.map(() => ({
        success: false,
        error: error.message || 'Batch send failed',
      }));
    }
  }

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // 支持中国大陆手机号
    const regex = /^(\+86)?1[3-9]\d{9}$/;
    return regex.test(phoneNumber);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    sent: number;
    failed: number;
    pending: number;
  }> {
    return { ...this.stats };
  }

  /**
   * 规范化手机号
   * 腾讯云需要 +86 格式
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith('+86')) {
      return phoneNumber;
    }
    if (phoneNumber.startsWith('86')) {
      return `+${phoneNumber}`;
    }
    if (/^1[3-9]\d{9}$/.test(phoneNumber)) {
      return `+86${phoneNumber}`;
    }
    return phoneNumber;
  }

  /**
   * 构建请求头（腾讯云 TC3-HMAC-SHA256 签名）
   */
  private buildHeaders(
    action: string,
    payload: any,
    timestamp: number,
  ): Record<string, string> {
    const service = 'sms';
    const version = '2021-01-11';
    const algorithm = 'TC3-HMAC-SHA256';
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];

    // 1. 拼接规范请求串
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json\nhost:${this.config.endpoint}\n`;
    const signedHeaders = 'content-type;host';
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // 2. 拼接待签名字符串
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex');
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    // 3. 计算签名
    const secretDate = crypto
      .createHmac('sha256', `TC3${this.config.secretKey}`)
      .update(date)
      .digest();
    const secretService = crypto
      .createHmac('sha256', secretDate)
      .update(service)
      .digest();
    const secretSigning = crypto
      .createHmac('sha256', secretService)
      .update('tc3_request')
      .digest();
    const signature = crypto
      .createHmac('sha256', secretSigning)
      .update(stringToSign)
      .digest('hex');

    // 4. 拼接 Authorization
    const authorization = `${algorithm} Credential=${this.config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      'Content-Type': 'application/json',
      Host: this.config.endpoint!,
      Authorization: authorization,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Region': this.config.region!,
    };
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
