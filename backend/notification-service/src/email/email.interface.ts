/**
 * 邮件发送选项
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

/**
 * 邮件附件
 */
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

/**
 * 邮件发送结果
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  accepted?: string[];
  rejected?: string[];
}

/**
 * 邮件提供商配置
 */
export interface EmailProviderConfig {
  provider: string;
  [key: string]: any;
}

/**
 * 邮件提供商接口
 *
 * 所有邮件提供商必须实现此接口
 */
export interface EmailProvider {
  /**
   * 提供商名称
   */
  readonly name: string;

  /**
   * 发送邮件
   */
  send(options: EmailOptions): Promise<EmailResult>;

  /**
   * 批量发送邮件
   */
  sendBatch?(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<EmailResult[]>;

  /**
   * 验证邮箱格式
   */
  validateEmail(email: string): boolean;

  /**
   * 获取统计信息
   */
  getStats?(): Promise<{
    sent: number;
    failed: number;
    pending: number;
  }>;

  /**
   * 健康检查
   */
  healthCheck?(): Promise<boolean>;
}
