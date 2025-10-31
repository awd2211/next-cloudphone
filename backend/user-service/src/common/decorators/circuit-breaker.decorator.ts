import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from '../services/circuit-breaker.service';

/**
 * 熔断器元数据键
 */
export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';

/**
 * 熔断器配置接口
 */
export interface CircuitBreakerDecoratorOptions extends CircuitBreakerOptions {
  /**
   * 熔断器名称
   */
  name: string;
}

/**
 * 熔断器装饰器
 *
 * 自动为方法添加熔断保护
 *
 * @example
 * ```typescript
 * @UseCircuitBreaker({
 *   name: 'device-service',
 *   timeout: 5000,
 *   errorThresholdPercentage: 50,
 *   fallback: () => ({ status: 'unavailable' })
 * })
 * async getDeviceInfo(deviceId: string) {
 *   return this.httpService.get(`http://device-service/devices/${deviceId}`);
 * }
 * ```
 */
export const UseCircuitBreaker = (options: CircuitBreakerDecoratorOptions) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, options);

/**
 * 外部服务调用装饰器
 *
 * 为外部服务调用添加熔断保护，使用预设配置
 */
export const ExternalServiceCall = (serviceName: string, timeout: number = 5000) =>
  UseCircuitBreaker({
    name: serviceName,
    timeout,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 10,
  });

/**
 * 第三方 API 调用装饰器
 *
 * 为第三方 API 调用添加熔断保护，更严格的配置
 */
export const ThirdPartyApiCall = (apiName: string) =>
  UseCircuitBreaker({
    name: `third-party-${apiName}`,
    timeout: 10000, // 10秒超时
    errorThresholdPercentage: 30, // 30%失败率即熔断
    resetTimeout: 60000, // 1分钟后尝试恢复
    volumeThreshold: 5, // 至少5个请求
  });

/**
 * 数据库操作熔断装饰器
 *
 * 为数据库操作添加熔断保护
 */
export const DatabaseOperation = (operationName: string) =>
  UseCircuitBreaker({
    name: `db-${operationName}`,
    timeout: 3000, // 3秒超时
    errorThresholdPercentage: 70, // 70%失败率才熔断（数据库较稳定）
    resetTimeout: 20000, // 20秒后尝试恢复
    volumeThreshold: 20, // 至少20个请求
  });

/**
 * 缓存操作熔断装饰器
 *
 * 为缓存操作添加熔断保护
 */
export const CacheOperation = (operationName: string) =>
  UseCircuitBreaker({
    name: `cache-${operationName}`,
    timeout: 2000, // 2秒超时
    errorThresholdPercentage: 60, // 60%失败率触发熔断
    resetTimeout: 15000, // 15秒后尝试恢复
    volumeThreshold: 15, // 至少15个请求
  });
