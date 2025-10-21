import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider, SmsSendData, SmsSendResult } from '../sms-provider.interface';

/**
 * 阿里云短信服务提供商
 *
 * 环境变量配置：
 * - ALIYUN_SMS_ACCESS_KEY_ID: 阿里云 AccessKey ID
 * - ALIYUN_SMS_ACCESS_KEY_SECRET: 阿里云 AccessKey Secret
 * - ALIYUN_SMS_SIGN_NAME: 短信签名
 * - ALIYUN_SMS_REGION: 区域（默认：cn-hangzhou）
 */
@Injectable()
export class AliyunSmsProvider implements ISmsProvider {
  readonly name = 'aliyun';
  private readonly logger = new Logger(AliyunSmsProvider.name);

  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly signName: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.accessKeyId = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID', '');
    this.accessKeySecret = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET', '');
    this.signName = this.configService.get<string>('ALIYUN_SMS_SIGN_NAME', '');
    this.region = this.configService.get<string>('ALIYUN_SMS_REGION', 'cn-hangzhou');
  }

  async send(data: SmsSendData): Promise<SmsSendResult> {
    try {
      // 检查配置
      if (!this.accessKeyId || !this.accessKeySecret || !this.signName) {
        throw new Error('Aliyun SMS credentials not configured');
      }

      /**
       * 生产环境集成阿里云短信 SDK
       *
       * 安装依赖：npm install @alicloud/pop-core
       *
       * 实现示例：
       * ```typescript
       * const Core = require('@alicloud/pop-core');
       * const client = new Core({
       *   accessKeyId: this.accessKeyId,
       *   accessKeySecret: this.accessKeySecret,
       *   endpoint: 'https://dysmsapi.aliyuncs.com',
       *   apiVersion: '2017-05-25'
       * });
       *
       * const params = {
       *   PhoneNumbers: data.phone,
       *   SignName: this.signName,
       *   TemplateCode: data.templateCode,
       *   TemplateParam: JSON.stringify(data.templateParams || {})
       * };
       *
       * const result = await client.request('SendSms', params, { method: 'POST' });
       * return {
       *   success: result.Code === 'OK',
       *   messageId: result.BizId,
       *   provider: this.name,
       * };
       * ```
       */

      // 当前为开发环境模拟发送
      this.logger.log(`[Aliyun] Sending SMS to ${data.phone}`);
      await new Promise((resolve) => setTimeout(resolve, 300));

      return {
        success: true,
        messageId: `aliyun-${Date.now()}`,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error(`[Aliyun] Failed to send SMS: ${error.message}`);
      return {
        success: false,
        error: error.message,
        provider: this.name,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.accessKeyId && this.accessKeySecret && this.signName);
  }
}
