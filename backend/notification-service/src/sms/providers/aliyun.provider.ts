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
 * 阿里云短信服务提供商
 *
 * 阿里云短信服务是国内主流的短信平台，支持:
 * - 覆盖全球200+国家和地区
 * - 三网合一专属通道
 * - 验证码、通知、营销短信
 * - 99%到达率
 *
 * 官方文档: https://help.aliyun.com/document_detail/101414.html
 *
 * 环境变量配置:
 * - ALIYUN_SMS_ACCESS_KEY_ID: 阿里云 AccessKey ID
 * - ALIYUN_SMS_ACCESS_KEY_SECRET: 阿里云 AccessKey Secret
 * - ALIYUN_SMS_SIGN_NAME: 短信签名
 * - ALIYUN_SMS_TEMPLATE_CODE_OTP: 验证码模板ID
 * - ALIYUN_SMS_TEMPLATE_CODE_NOTIFICATION: 通知模板ID
 * - ALIYUN_SMS_ENDPOINT: API端点 (默认: dysmsapi.aliyuncs.com)
 *
 * 使用示例:
 * ```typescript
 * const provider = new AliyunSmsProvider(configService);
 * const result = await provider.send({
 *   to: '+8613800138000',
 *   message: 'Your code is 123456',
 *   isOtp: true,
 * });
 * ```
 */
@Injectable()
export class AliyunSmsProvider implements SmsProvider {
  readonly name = 'Aliyun SMS';
  private readonly logger = new Logger(AliyunSmsProvider.name);
  private config: SmsProviderConfig & {
    signName?: string;
    templateCodeOtp?: string;
    templateCodeNotification?: string;
    endpoint?: string;
  };
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.logger.log('Aliyun SMS Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'aliyun',
      accessKeyId: this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get<string>(
        'ALIYUN_SMS_ACCESS_KEY_SECRET',
      ),
      signName: this.configService.get<string>('ALIYUN_SMS_SIGN_NAME'),
      templateCodeOtp: this.configService.get<string>(
        'ALIYUN_SMS_TEMPLATE_CODE_OTP',
      ),
      templateCodeNotification: this.configService.get<string>(
        'ALIYUN_SMS_TEMPLATE_CODE_NOTIFICATION',
      ),
      enabled: this.configService.get<boolean>('ALIYUN_SMS_ENABLED', false),
      endpoint: this.configService.get<string>(
        'ALIYUN_SMS_ENDPOINT',
        'dysmsapi.aliyuncs.com',
      ),
    };

    // 验证必需配置
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      this.logger.warn(
        'Aliyun SMS credentials not configured. SMS sending will fail.',
      );
    }

    if (!this.config.signName) {
      this.logger.warn('Aliyun SMS sign name not configured.');
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
        !this.config.accessKeyId ||
        !this.config.accessKeySecret ||
        !this.config.signName
      ) {
        this.stats.pending--;
        this.stats.failed++;
        return {
          success: false,
          error: 'Aliyun SMS not properly configured',
        };
      }

      // 规范化手机号（移除+86前缀）
      const phoneNumber = this.normalizePhoneNumber(options.to);

      // 构建请求参数
      const params: Record<string, any> = {
        Action: 'SendSms',
        Version: '2017-05-25',
        RegionId: 'cn-hangzhou',
        PhoneNumbers: phoneNumber,
        SignName: this.config.signName,
        TemplateCode: options.isOtp
          ? this.config.templateCodeOtp
          : this.config.templateCodeNotification,
      };

      // 提取验证码或使用完整消息
      let templateParam: Record<string, string>;
      if (options.isOtp) {
        // 尝试从消息中提取验证码
        const codeMatch = options.message.match(/\b\d{4,6}\b/);
        const code = codeMatch ? codeMatch[0] : '000000';
        templateParam = { code };
      } else {
        // 通知消息
        templateParam = { content: options.message };
      }

      params.TemplateParam = JSON.stringify(templateParam);

      // 添加公共参数
      const publicParams = this.buildPublicParams();
      const allParams = { ...params, ...publicParams };

      // 生成签名
      const signature = this.generateSignature(allParams, 'POST');
      allParams.Signature = signature;

      // 发送请求
      const response = await axios({
        method: 'POST',
        url: `https://${this.config.endpoint}/`,
        params: allParams,
        timeout: 10000,
      });

      this.stats.pending--;

      // 检查响应
      if (response.data.Code === 'OK') {
        this.stats.sent++;
        this.logger.log(
          `SMS sent successfully via Aliyun to ${phoneNumber}, BizId: ${response.data.BizId}`,
        );
        return {
          success: true,
          messageId: response.data.BizId,
          provider: this.name,
        };
      } else {
        this.stats.failed++;
        this.logger.error(
          `Aliyun SMS failed: ${response.data.Code} - ${response.data.Message}`,
        );
        return {
          success: false,
          error: `${response.data.Code}: ${response.data.Message}`,
        };
      }
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      this.logger.error('Aliyun SMS error:', error.message);
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
    // 阿里云支持批量发送，但这里为了统一接口，使用逐个发送
    const results: SmsResult[] = [];

    for (const recipient of recipients) {
      const result = await this.send({
        to: recipient,
        message,
      });
      results.push(result);

      // 避免频率限制，添加小延迟
      if (recipients.length > 10) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // 支持中国大陆手机号
    // 格式: +86 开头或纯数字 11 位
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
   * 移除+86前缀，只保留11位数字
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/^\+86/, '');
  }

  /**
   * 构建公共参数
   */
  private buildPublicParams(): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const nonce = this.generateNonce();

    return {
      Format: 'JSON',
      AccessKeyId: this.config.accessKeyId!,
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: nonce,
      Timestamp: timestamp,
    };
  }

  /**
   * 生成签名
   */
  private generateSignature(
    params: Record<string, any>,
    method: string,
  ): string {
    // 1. 按字典序排序参数
    const sortedKeys = Object.keys(params).sort();
    const sortedParams = sortedKeys
      .map((key) => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');

    // 2. 构造待签名字符串
    const stringToSign = `${method}&${this.percentEncode('/')}&${this.percentEncode(sortedParams)}`;

    // 3. 计算签名
    const hmac = crypto.createHmac(
      'sha1',
      `${this.config.accessKeySecret}&`,
    );
    hmac.update(stringToSign);
    const signature = hmac.digest('base64');

    return signature;
  }

  /**
   * URL 编码 (按阿里云规范)
   */
  private percentEncode(value: string): string {
    return encodeURIComponent(value)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * 生成随机数
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
