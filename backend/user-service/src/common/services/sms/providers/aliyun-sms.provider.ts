import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider, SmsSendData, SmsSendResult } from '../sms-provider.interface';

// 动态导入阿里云SDK
let AliyunSmsClient: any = null;
try {
  const Core = require('@alicloud/pop-core');
  AliyunSmsClient = Core;
} catch (error) {
  // SDK未安装，将使用模拟模式
}

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
  private client: any = null;

  constructor(private configService: ConfigService) {
    this.accessKeyId = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID', '');
    this.accessKeySecret = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET', '');
    this.signName = this.configService.get<string>('ALIYUN_SMS_SIGN_NAME', '');
    this.region = this.configService.get<string>('ALIYUN_SMS_REGION', 'cn-hangzhou');
    
    // 初始化客户端
    this.initializeClient();
  }

  /**
   * 初始化阿里云SMS客户端
   */
  private initializeClient(): void {
    if (AliyunSmsClient && this.accessKeyId && this.accessKeySecret) {
      this.client = new AliyunSmsClient({
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        endpoint: 'https://dysmsapi.aliyuncs.com',
        apiVersion: '2017-05-25',
      });
      this.logger.log('✅ Aliyun SMS client initialized');
    } else {
      this.logger.warn('⚠️ Aliyun SMS SDK not installed or credentials missing, using mock mode');
    }
  }

  async send(data: SmsSendData): Promise<SmsSendResult> {
    try {
      // 检查配置
      if (!this.accessKeyId || !this.accessKeySecret || !this.signName) {
        throw new Error('Aliyun SMS credentials not configured');
      }

      if (this.client) {
        // 真实阿里云短信发送
        const params = {
          PhoneNumbers: data.phone,
          SignName: this.signName,
          TemplateCode: data.templateCode,
          TemplateParam: JSON.stringify(data.templateParams || {}),
        };

        const result = await this.client.request('SendSms', params, { method: 'POST' });

        this.logger.log(`[Aliyun] SMS sent to ${data.phone}, BizId: ${result.BizId}`);

        return {
          success: result.Code === 'OK',
          messageId: result.BizId,
          provider: this.name,
          error: result.Code !== 'OK' ? result.Message : undefined,
        };
      } else {
        // 开发环境模拟发送
        this.logger.log(`[Aliyun MOCK] Sending SMS to ${data.phone}`);
        await new Promise((resolve) => setTimeout(resolve, 300));

        return {
          success: true,
          messageId: `aliyun-mock-${Date.now()}`,
          provider: this.name,
        };
      }
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
