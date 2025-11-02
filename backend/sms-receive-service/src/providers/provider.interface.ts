/**
 * SMS平台适配器通用接口
 * 所有SMS平台适配器必须实现此接口
 */

export interface GetNumberResult {
  activationId: string;
  phoneNumber: string;
  country?: string;
  cost: number;
  raw?: any;
}

export interface SmsStatus {
  status: 'waiting' | 'received' | 'cancelled' | 'expired' | 'unknown';
  code: string | null;
  message?: string;
  timestamp?: Date;
}

export interface ProviderBalance {
  balance: number;
  currency: string;
}

export interface ProviderStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number; // milliseconds
  successRate: number; // percentage 0-100
}

/**
 * SMS平台适配器接口
 */
export interface ISmsProvider {
  /**
   * 平台名称
   */
  readonly providerName: string;

  /**
   * 获取虚拟号码
   * @param service 服务代码
   * @param country 国家代码（平台特定）
   * @returns 号码信息
   */
  getNumber(service: string, country: number | string): Promise<GetNumberResult>;

  /**
   * 检查短信状态
   * @param activationId 激活ID
   * @returns 短信状态
   */
  getStatus(activationId: string): Promise<SmsStatus>;

  /**
   * 取消号码（退款）
   * @param activationId 激活ID
   */
  cancel(activationId: string): Promise<void>;

  /**
   * 设置号码状态
   * @param activationId 激活ID
   * @param status 状态码（平台特定）
   */
  setStatus(activationId: string, status: number): Promise<void>;

  /**
   * 获取账户余额
   * @returns 余额信息
   */
  getBalance(): Promise<ProviderBalance>;

  /**
   * 租用号码（如果平台支持）
   * @param service 服务代码
   * @param country 国家代码
   * @param hours 租用小时数
   * @returns 号码信息
   */
  rentNumber?(service: string, country: number | string, hours: number): Promise<GetNumberResult>;

  /**
   * 检查平台健康状态
   * @returns 是否健康
   */
  healthCheck(): Promise<boolean>;
}

/**
 * 平台能力标志
 */
export interface ProviderCapabilities {
  supportsRental: boolean; // 是否支持租用
  supportsWebhook: boolean; // 是否支持webhook
  supportsBatch: boolean; // 是否支持批量请求
  minCost: number; // 最低成本（美元）
  averageCost: number; // 平均成本（美元）
  averageSpeed: number; // 平均接收时间（秒）
  countries: string[]; // 支持的国家代码列表
  services: string[]; // 支持的服务代码列表
}

/**
 * 平台错误类型
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * 平台配置
 */
export interface ProviderConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
  priority: number; // 优先级（1-10，数字越小优先级越高）
  timeout: number; // 超时时间（毫秒）
  retryAttempts: number; // 重试次数
  retryDelay: number; // 重试延迟（毫秒）
}
