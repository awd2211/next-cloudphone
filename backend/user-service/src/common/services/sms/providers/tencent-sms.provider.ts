import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider, SmsSendData, SmsSendResult } from '../sms-provider.interface';

/**
 * 腾讯云短信服务提供商
 *
 * 环境变量配置：
 * - TENCENT_SMS_SECRET_ID: 腾讯云 SecretId
 * - TENCENT_SMS_SECRET_KEY: 腾讯云 SecretKey
 * - TENCENT_SMS_SDK_APP_ID: 短信应用ID
 * - TENCENT_SMS_SIGN_NAME: 短信签名
 */
@Injectable()
export class TencentSmsProvider implements ISmsProvider {
  readonly name = 'tencent';
  private readonly logger = new Logger(TencentSmsProvider.name);

  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly sdkAppId: string;
  private readonly signName: string;

  constructor(private configService: ConfigService) {
    this.secretId = this.configService.get<string>('TENCENT_SMS_SECRET_ID', '');
    this.secretKey = this.configService.get<string>('TENCENT_SMS_SECRET_KEY', '');
    this.sdkAppId = this.configService.get<string>('TENCENT_SMS_SDK_APP_ID', '');
    this.signName = this.configService.get<string>('TENCENT_SMS_SIGN_NAME', '');
  }

  async send(data: SmsSendData): Promise<SmsSendResult> {
    try {
      // 检查配置
      if (!this.secretId || !this.secretKey || !this.sdkAppId || !this.signName) {
        throw new Error('Tencent SMS credentials not configured');
      }

      /**
       * 生产环境集成腾讯云短信 SDK
       *
       * 安装依赖：npm install tencentcloud-sdk-nodejs
       *
       * 实现示例：
       * ```typescript
       * const tencentcloud = require('tencentcloud-sdk-nodejs');
       * const SmsClient = tencentcloud.sms.v20210111.Client;
       *
       * const client = new SmsClient({
       *   credential: {
       *     secretId: this.secretId,
       *     secretKey: this.secretKey,
       *   },
       *   region: 'ap-guangzhou',
       * });
       *
       * const params = {
       *   SmsSdkAppId: this.sdkAppId,
       *   SignName: this.signName,
       *   TemplateId: data.templateCode,
       *   PhoneNumberSet: [data.phone],
       *   TemplateParamSet: Object.values(data.templateParams || {}),
       * };
       *
       * const result = await client.SendSms(params);
       * return {
       *   success: result.SendStatusSet[0].Code === 'Ok',
       *   messageId: result.SendStatusSet[0].SerialNo,
       *   provider: this.name,
       * };
       * ```
       */

      // 当前为开发环境模拟发送
      this.logger.log(`[Tencent] Sending SMS to ${data.phone}`);
      await new Promise((resolve) => setTimeout(resolve, 300));

      return {
        success: true,
        messageId: `tencent-${Date.now()}`,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error(`[Tencent] Failed to send SMS: ${error.message}`);
      return {
        success: false,
        error: error.message,
        provider: this.name,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.secretId && this.secretKey && this.sdkAppId && this.signName);
  }
}
