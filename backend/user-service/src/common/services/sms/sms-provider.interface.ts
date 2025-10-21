/**
 * 短信发送数据
 */
export interface SmsSendData {
  phone: string;
  message?: string;
  templateCode?: string;
  templateParams?: Record<string, string>;
}

/**
 * 短信发送结果
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

/**
 * 短信服务提供商接口
 */
export interface ISmsProvider {
  /**
   * 提供商名称
   */
  readonly name: string;

  /**
   * 发送短信
   */
  send(data: SmsSendData): Promise<SmsSendResult>;

  /**
   * 检查服务是否可用
   */
  isAvailable(): Promise<boolean>;
}
