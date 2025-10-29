/**
 * SMS 发送结果
 */
export interface SmsResult {
  /**
   * 是否发送成功
   */
  success: boolean;

  /**
   * 消息 ID（服务商返回）
   */
  messageId?: string;

  /**
   * 状态码
   */
  statusCode?: string;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 提供商名称
   */
  provider?: string;

  /**
   * 原始响应（调试用）
   */
  rawResponse?: any;
}

/**
 * SMS 发送选项
 */
export interface SmsOptions {
  /**
   * 接收手机号（国际格式，如 +1234567890）
   */
  to: string;

  /**
   * 短信内容
   */
  message: string;

  /**
   * 发送方号码（可选，某些服务商需要）
   */
  from?: string;

  /**
   * 模板 ID（可选，用于模板短信）
   */
  templateId?: string;

  /**
   * 模板参数（可选）
   */
  templateParams?: Record<string, string>;

  /**
   * 是否为验证码短信
   */
  isOtp?: boolean;

  /**
   * 优先级（可选）
   */
  priority?: 'high' | 'normal' | 'low';

  /**
   * 有效期（秒，可选）
   */
  validityPeriod?: number;
}

/**
 * SMS 提供商接口
 */
export interface SmsProvider {
  /**
   * 提供商名称
   */
  readonly name: string;

  /**
   * 发送短信
   */
  send(options: SmsOptions): Promise<SmsResult>;

  /**
   * 批量发送短信
   */
  sendBatch(recipients: string[], message: string): Promise<SmsResult[]>;

  /**
   * 检查号码是否有效
   */
  validatePhoneNumber(phoneNumber: string): boolean;

  /**
   * 获取发送统计
   */
  getStats?(): Promise<{
    sent: number;
    failed: number;
    pending: number;
  }>;
}

/**
 * SMS 提供商配置
 */
export interface SmsProviderConfig {
  /**
   * 提供商类型
   */
  provider: 'twilio' | 'aws-sns' | 'messagebird' | 'nexmo' | 'aliyun' | 'tencent';

  /**
   * API 密钥
   */
  apiKey?: string;

  /**
   * API 密钥 ID（AWS）
   */
  apiKeyId?: string;

  /**
   * API 密钥 Secret（AWS）
   */
  apiKeySecret?: string;

  /**
   * Account SID（Twilio）
   */
  accountSid?: string;

  /**
   * Auth Token（Twilio）
   */
  authToken?: string;

  /**
   * 默认发送方号码
   */
  defaultFrom?: string;

  /**
   * AWS Region（AWS SNS）
   */
  region?: string;

  /**
   * Access Key ID（Aliyun/Tencent - 阿里云/腾讯云）
   */
  accessKeyId?: string;

  /**
   * Access Key Secret（Aliyun - 阿里云）
   */
  accessKeySecret?: string;

  /**
   * Secret ID（Tencent - 腾讯云）
   */
  secretId?: string;

  /**
   * Secret Key（Tencent - 腾讯云）
   */
  secretKey?: string;

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 重试次数
   */
  retries?: number;
}
