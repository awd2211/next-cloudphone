import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider, SmsSendData, SmsSendResult } from '../sms-provider.interface';

// 动态导入腾讯云SDK
let TencentSmsClient: any = null;
try {
  const tencentcloud = require('tencentcloud-sdk-nodejs');
  TencentSmsClient = tencentcloud.sms.v20210111.Client;
} catch (error) {
  // SDK未安装，将使用模拟模式
}

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
  private client: any = null;

  constructor(private configService: ConfigService) {
    this.secretId = this.configService.get<string>('TENCENT_SMS_SECRET_ID', '');
    this.secretKey = this.configService.get<string>('TENCENT_SMS_SECRET_KEY', '');
    this.sdkAppId = this.configService.get<string>('TENCENT_SMS_SDK_APP_ID', '');
    this.signName = this.configService.get<string>('TENCENT_SMS_SIGN_NAME', '');
    
    // 初始化客户端
    this.initializeClient();
  }

  /**
   * 初始化腾讯云SMS客户端
   */
  private initializeClient(): void {
    if (TencentSmsClient && this.secretId && this.secretKey) {
      this.client = new TencentSmsClient({
        credential: {
          secretId: this.secretId,
          secretKey: this.secretKey,
        },
        region: 'ap-guangzhou',
      });
      this.logger.log('✅ Tencent SMS client initialized');
    } else {
      this.logger.warn('⚠️ Tencent SMS SDK not installed or credentials missing, using mock mode');
    }
  }

  async send(data: SmsSendData): Promise<SmsSendResult> {
    try {
      // 检查配置
      if (!this.secretId || !this.secretKey || !this.sdkAppId || !this.signName) {
        throw new Error('Tencent SMS credentials not configured');
      }

      if (this.client) {
        // 真实腾讯云短信发送
        const params = {
          SmsSdkAppId: this.sdkAppId,
          SignName: this.signName,
          TemplateId: data.templateCode,
          PhoneNumberSet: [data.phone],
          TemplateParamSet: data.templateParams ? Object.values(data.templateParams) : [],
        };

        const result = await this.client.SendSms(params);
        const sendStatus = result.SendStatusSet[0];

        this.logger.log(`[Tencent] SMS sent to ${data.phone}, SerialNo: ${sendStatus.SerialNo}`);

        return {
          success: sendStatus.Code === 'Ok',
          messageId: sendStatus.SerialNo,
          provider: this.name,
          error: sendStatus.Code !== 'Ok' ? sendStatus.Message : undefined,
        };
      } else {
        // 开发环境模拟发送
        this.logger.log(`[Tencent MOCK] Sending SMS to ${data.phone}`);
        await new Promise((resolve) => setTimeout(resolve, 300));

        return {
          success: true,
          messageId: `tencent-mock-${Date.now()}`,
          provider: this.name,
        };
      }
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
