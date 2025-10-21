import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

/**
 * 熔断器配置
 */
export interface CircuitBreakerOptions {
  /**
   * 超时时间（毫秒）
   * 超过此时间视为失败
   */
  timeout?: number;

  /**
   * 错误阈值百分比 (0-1)
   * 例如 0.5 表示 50% 的请求失败时触发熔断
   */
  errorThresholdPercentage?: number;

  /**
   * 重置超时时间（毫秒）
   * 熔断器打开后，经过此时间会尝试半开状态
   */
  resetTimeout?: number;

  /**
   * 熔断器打开后降级函数
   */
  fallback?: (...args: any[]) => any | Promise<any>;

  /**
   * 请求容量
   * 用于计算错误率的请求数量
   */
  volumeThreshold?: number;
}

/**
 * 熔断器服务
 *
 * 功能：
 * - Circuit Breaker 模式实现
 * - 自动熔断故障服务
 * - 服务降级支持
 * - 熔断状态监控
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * 创建熔断器
   *
   * @param name 熔断器名称
   * @param action 要保护的异步操作
   * @param options 熔断器配置
   */
  createBreaker<T extends any[], R>(
    name: string,
    action: (...args: T) => Promise<R>,
    options: CircuitBreakerOptions = {},
  ): CircuitBreaker<T, R> {
    // 如果已存在，直接返回
    if (this.breakers.has(name)) {
      return this.breakers.get(name) as CircuitBreaker<T, R>;
    }

    // 默认配置
    const defaultOptions = {
      timeout: 10000,                  // 10秒超时
      errorThresholdPercentage: 50,    // 50%失败率触发熔断
      resetTimeout: 30000,             // 30秒后尝试恢复
      volumeThreshold: 10,             // 至少10个请求才计算错误率
    };

    const config = { ...defaultOptions, ...options };

    // 创建熔断器
    const breaker = new CircuitBreaker<T, R>(action, {
      timeout: config.timeout,
      errorThresholdPercentage: config.errorThresholdPercentage,
      resetTimeout: config.resetTimeout,
      volumeThreshold: config.volumeThreshold,
    });

    // 设置降级函数
    if (config.fallback) {
      breaker.fallback(config.fallback);
    }

    // 监听熔断器事件
    this.setupBreakerListeners(breaker, name);

    // 缓存熔断器
    this.breakers.set(name, breaker as any);

    this.logger.log(`✅ 创建熔断器: ${name}`);

    return breaker;
  }

  /**
   * 获取熔断器
   */
  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * 执行受保护的操作
   *
   * @param name 熔断器名称
   * @param args 参数
   */
  async fire<T>(name: string, ...args: any[]): Promise<T> {
    const breaker = this.breakers.get(name);

    if (!breaker) {
      throw new Error(`熔断器 ${name} 不存在`);
    }

    return breaker.fire(...args);
  }

  /**
   * 获取熔断器状态
   */
  getBreakerStatus(name: string): {
    name: string;
    state: string;
    stats: any;
  } | null {
    const breaker = this.breakers.get(name);

    if (!breaker) {
      return null;
    }

    return {
      name,
      state: this.getStateString(breaker),
      stats: breaker.stats,
    };
  }

  /**
   * 获取所有熔断器状态
   */
  getAllBreakerStatus(): Array<{
    name: string;
    state: string;
    stats: any;
  }> {
    const statuses: Array<{
      name: string;
      state: string;
      stats: any;
    }> = [];

    this.breakers.forEach((breaker, name) => {
      statuses.push({
        name,
        state: this.getStateString(breaker),
        stats: breaker.stats,
      });
    });

    return statuses;
  }

  /**
   * 手动打开熔断器
   */
  openBreaker(name: string): void {
    const breaker = this.breakers.get(name);

    if (breaker) {
      breaker.open();
      this.logger.warn(`🔴 手动打开熔断器: ${name}`);
    }
  }

  /**
   * 手动关闭熔断器
   */
  closeBreaker(name: string): void {
    const breaker = this.breakers.get(name);

    if (breaker) {
      breaker.close();
      this.logger.log(`🟢 手动关闭熔断器: ${name}`);
    }
  }

  /**
   * 清除熔断器统计数据
   */
  clearStats(name: string): void {
    const breaker = this.breakers.get(name);

    if (breaker) {
      breaker.stats.clear();
      this.logger.log(`🧹 清除熔断器统计: ${name}`);
    }
  }

  /**
   * 设置熔断器事件监听
   */
  private setupBreakerListeners(breaker: CircuitBreaker, name: string): void {
    // 熔断器打开
    breaker.on('open', () => {
      this.logger.error({
        event: 'circuit_breaker_opened',
        breaker: name,
        message: `🔴 熔断器已打开: ${name} - 服务降级中`,
      });
    });

    // 熔断器半开（尝试恢复）
    breaker.on('halfOpen', () => {
      this.logger.warn({
        event: 'circuit_breaker_half_open',
        breaker: name,
        message: `🟡 熔断器半开: ${name} - 尝试恢复服务`,
      });
    });

    // 熔断器关闭（恢复正常）
    breaker.on('close', () => {
      this.logger.log({
        event: 'circuit_breaker_closed',
        breaker: name,
        message: `🟢 熔断器已关闭: ${name} - 服务恢复正常`,
      });
    });

    // 请求成功
    breaker.on('success', (result, latency) => {
      this.logger.debug({
        event: 'circuit_breaker_success',
        breaker: name,
        latency: `${latency}ms`,
      });
    });

    // 请求失败
    breaker.on('failure', (error) => {
      this.logger.warn({
        event: 'circuit_breaker_failure',
        breaker: name,
        error: error.message,
      });
    });

    // 请求超时
    breaker.on('timeout', () => {
      this.logger.warn({
        event: 'circuit_breaker_timeout',
        breaker: name,
        message: '请求超时',
      });
    });

    // 请求被拒绝（熔断器打开状态）
    breaker.on('reject', () => {
      this.logger.warn({
        event: 'circuit_breaker_rejected',
        breaker: name,
        message: '请求被拒绝 - 熔断器已打开',
      });
    });

    // 使用降级函数
    breaker.on('fallback', (result) => {
      this.logger.warn({
        event: 'circuit_breaker_fallback',
        breaker: name,
        message: '使用降级响应',
      });
    });
  }

  /**
   * 获取状态字符串
   */
  private getStateString(breaker: CircuitBreaker): string {
    if (breaker.opened) return 'OPEN';
    if (breaker.halfOpen) return 'HALF_OPEN';
    return 'CLOSED';
  }
}
