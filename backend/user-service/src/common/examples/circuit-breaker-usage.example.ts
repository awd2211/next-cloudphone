import { Injectable, HttpException } from '@nestjs/common';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import {
  ExternalServiceCall,
  ThirdPartyApiCall,
  DatabaseOperation,
  CacheOperation,
} from '../decorators/circuit-breaker.decorator';

/**
 * 熔断器使用示例
 *
 * 展示如何在实际项目中使用熔断器
 */

// ============================================================================
// 示例 1: 手动创建和使用熔断器
// ============================================================================

@Injectable()
export class DeviceServiceClient {
  private deviceServiceBreaker;

  constructor(private circuitBreakerService: CircuitBreakerService) {
    // 在构造函数中创建熔断器
    this.deviceServiceBreaker = this.circuitBreakerService.createBreaker(
      'device-service',
      async (deviceId: string) => {
        // 实际的服务调用
        const response = await fetch(
          `http://device-service:30002/devices/${deviceId}`,
        );
        if (!response.ok) {
          throw new Error(`Device service error: ${response.statusText}`);
        }
        return response.json();
      },
      {
        timeout: 5000, // 5秒超时
        errorThresholdPercentage: 50, // 50%失败率触发熔断
        resetTimeout: 30000, // 30秒后尝试恢复
        // 降级函数：返回缓存数据或默认值
        fallback: async (deviceId: string) => {
          return {
            id: deviceId,
            status: 'unknown',
            message: 'Device service temporarily unavailable',
          };
        },
      },
    );
  }

  /**
   * 获取设备信息（受熔断器保护）
   */
  async getDevice(deviceId: string) {
    return this.circuitBreakerService.fire('device-service', deviceId);
  }
}

// ============================================================================
// 示例 2: 使用装饰器（推荐方式）
// ============================================================================

@Injectable()
export class AppServiceClient {
  /**
   * 调用应用服务
   * 使用 @ExternalServiceCall 装饰器自动添加熔断保护
   */
  @ExternalServiceCall('app-service', 5000)
  async getAppInfo(appId: string) {
    const response = await fetch(
      `http://app-service:30003/apps/${appId}`,
    );
    if (!response.ok) {
      throw new Error('App service error');
    }
    return response.json();
  }
}

// ============================================================================
// 示例 3: 第三方 API 调用
// ============================================================================

@Injectable()
export class PaymentServiceClient {
  /**
   * 调用支付宝支付接口
   * 第三方 API 使用更严格的熔断配置
   */
  @ThirdPartyApiCall('alipay')
  async createAlipayOrder(orderData: any) {
    // 调用支付宝 API
    const response = await fetch('https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  /**
   * 调用微信支付接口
   */
  @ThirdPartyApiCall('wechat-pay')
  async createWechatOrder(orderData: any) {
    // 调用微信支付 API
    const response = await fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/native', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return response.json();
  }
}

// ============================================================================
// 示例 4: 数据库操作保护
// ============================================================================

@Injectable()
export class ReportService {
  /**
   * 生成大数据报表
   * 数据库密集型操作，使用熔断器防止数据库过载
   */
  @DatabaseOperation('generate-report')
  async generateReport(startDate: Date, endDate: Date) {
    // 执行复杂的数据库查询和聚合
    // 如果数据库负载过高，熔断器会阻止新请求
    return {
      /* report data */
    };
  }
}

// ============================================================================
// 示例 5: 缓存操作保护
// ============================================================================

@Injectable()
export class CacheService {
  /**
   * Redis 批量写入
   * 保护 Redis 不被过载
   */
  @CacheOperation('bulk-write')
  async bulkWrite(data: Record<string, any>) {
    // 批量写入 Redis
    // 如果 Redis 出现问题，熔断器会触发降级
    return {
      /* write result */
    };
  }
}

// ============================================================================
// 示例 6: 带自定义降级函数的熔断器
// ============================================================================

@Injectable()
export class NotificationService {
  constructor(private circuitBreakerService: CircuitBreakerService) {
    // 创建短信服务熔断器，带降级函数
    this.circuitBreakerService.createBreaker(
      'sms-service',
      async (phone: string, message: string) => {
        // 调用短信服务
        const response = await fetch('http://sms-service/send', {
          method: 'POST',
          body: JSON.stringify({ phone, message }),
        });
        return response.json();
      },
      {
        timeout: 3000,
        errorThresholdPercentage: 40,
        // 降级函数：短信发送失败时，改为发送邮件
        fallback: async (phone: string, message: string) => {
          console.log(`SMS service down, sending email instead for ${phone}`);
          // 这里可以调用邮件服务作为降级方案
          return { status: 'fallback', method: 'email' };
        },
      },
    );
  }

  async sendSms(phone: string, message: string) {
    return this.circuitBreakerService.fire('sms-service', phone, message);
  }
}

// ============================================================================
// 示例 7: 监控熔断器状态
// ============================================================================

@Injectable()
export class CircuitBreakerHealthService {
  constructor(private circuitBreakerService: CircuitBreakerService) {}

  /**
   * 获取所有熔断器健康状态
   */
  async getCircuitBreakerHealth() {
    const statuses = this.circuitBreakerService.getAllBreakerStatus();

    return {
      total: statuses.length,
      healthy: statuses.filter((s) => s.state === 'CLOSED').length,
      degraded: statuses.filter((s) => s.state === 'HALF_OPEN').length,
      failed: statuses.filter((s) => s.state === 'OPEN').length,
      breakers: statuses.map((s) => ({
        name: s.name,
        state: s.state,
        stats: {
          fires: s.stats.fires,
          successes: s.stats.successes,
          failures: s.stats.failures,
          timeouts: s.stats.timeouts,
          rejects: s.stats.rejects,
          fallbacks: s.stats.fallbacks,
        },
      })),
    };
  }

  /**
   * 手动控制熔断器（紧急情况）
   */
  async manualControl(breakerName: string, action: 'open' | 'close') {
    if (action === 'open') {
      this.circuitBreakerService.openBreaker(breakerName);
    } else {
      this.circuitBreakerService.closeBreaker(breakerName);
    }

    return {
      breaker: breakerName,
      action,
      message: `Breaker ${action}ed manually`,
    };
  }
}

// ============================================================================
// 示例 8: 多层熔断器（组合使用）
// ============================================================================

@Injectable()
export class OrderService {
  constructor(
    private deviceServiceClient: DeviceServiceClient,
    private paymentServiceClient: PaymentServiceClient,
  ) {}

  /**
   * 创建订单
   * 涉及多个外部服务，每个服务都有独立的熔断器
   */
  async createOrder(userId: string, deviceId: string, paymentMethod: string) {
    try {
      // 1. 检查设备可用性（device-service 熔断器）
      const device = await this.deviceServiceClient.getDevice(deviceId);

      if (device.status === 'unknown') {
        // 设备服务降级，使用默认逻辑
        console.log('Device service degraded, using fallback logic');
      }

      // 2. 创建支付订单（payment-service 熔断器）
      const paymentOrder =
        await this.paymentServiceClient.createAlipayOrder({
          userId,
          deviceId,
          amount: 100,
        });

      return {
        orderId: 'order-123',
        device,
        payment: paymentOrder,
      };
    } catch (error) {
      // 如果任何服务熔断，返回友好错误
      if (error.message.includes('temporarily unavailable')) {
        throw new HttpException(
          'Service temporarily unavailable, please try again later',
          503,
        );
      }
      throw error;
    }
  }
}
