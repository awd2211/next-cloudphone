/**
 * 代理模块常量
 */

/** 默认代理服务URL */
export const DEFAULT_PROXY_SERVICE_URL = 'http://localhost:30007';

/** 默认代理获取超时 (ms) */
export const DEFAULT_ACQUIRE_TIMEOUT = 10000;

/** 默认代理验证超时 (ms) */
export const DEFAULT_VALIDATE_TIMEOUT = 5000;

/** 代理会话默认有效期 (ms) - 10分钟 */
export const DEFAULT_SESSION_TTL = 10 * 60 * 1000;

/** 代理客户端配置Token */
export const PROXY_CLIENT_CONFIG = 'PROXY_CLIENT_CONFIG';

/** 代理客户端配置接口 */
export interface ProxyClientConfig {
  /** 代理服务URL */
  serviceUrl: string;
  /** 是否启用代理客户端 */
  enabled: boolean;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用熔断器 */
  circuitBreaker?: boolean;
}
