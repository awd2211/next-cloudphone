/**
 * 业务指标工具类
 * 提供易用的 API 来创建和管理自定义业务指标
 */

import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * 业务指标基础配置
 */
export interface MetricConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

/**
 * 业务指标管理器
 * 提供统一的业务指标创建和管理接口
 */
export class BusinessMetrics {
  private static counters: Map<string, Counter> = new Map();
  private static gauges: Map<string, Gauge> = new Map();
  private static histograms: Map<string, Histogram> = new Map();

  /**
   * 创建或获取 Counter 指标（计数器）
   * 用于统计累计值，例如：请求总数、错误总数、订单总数
   *
   * @example
   * const orderCounter = BusinessMetrics.createCounter({
   *   name: 'cloudphone_orders_total',
   *   help: '订单总数',
   *   labelNames: ['status', 'userId']
   * });
   * orderCounter.inc({ status: 'success', userId: '123' });
   */
  static createCounter(config: MetricConfig): Counter {
    const key = config.name;

    if (this.counters.has(key)) {
      return this.counters.get(key)!;
    }

    const counter = new Counter({
      name: config.name,
      help: config.help,
      labelNames: config.labelNames || [],
    });

    this.counters.set(key, counter);
    return counter;
  }

  /**
   * 创建或获取 Gauge 指标（测量值）
   * 用于表示可增可减的值，例如：活跃用户数、队列长度、温度
   *
   * @example
   * const activeDevices = BusinessMetrics.createGauge({
   *   name: 'cloudphone_devices_active',
   *   help: '当前活跃设备数'
   * });
   * activeDevices.set(42);
   * activeDevices.inc(); // +1
   * activeDevices.dec(); // -1
   */
  static createGauge(config: MetricConfig): Gauge {
    const key = config.name;

    if (this.gauges.has(key)) {
      return this.gauges.get(key)!;
    }

    const gauge = new Gauge({
      name: config.name,
      help: config.help,
      labelNames: config.labelNames || [],
    });

    this.gauges.set(key, gauge);
    return gauge;
  }

  /**
   * 创建或获取 Histogram 指标（直方图）
   * 用于统计分布情况，例如：响应时间、请求大小
   *
   * @example
   * const paymentDuration = BusinessMetrics.createHistogram({
   *   name: 'cloudphone_payment_duration_seconds',
   *   help: '支付处理耗时（秒）',
   *   labelNames: ['method']
   * });
   * paymentDuration.observe({ method: 'alipay' }, 0.5);
   */
  static createHistogram(config: MetricConfig & { buckets?: number[] }): Histogram {
    const key = config.name;

    if (this.histograms.has(key)) {
      return this.histograms.get(key)!;
    }

    const histogram = new Histogram({
      name: config.name,
      help: config.help,
      labelNames: config.labelNames || [],
      buckets: config.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.histograms.set(key, histogram);
    return histogram;
  }

  /**
   * 获取已创建的 Counter
   */
  static getCounter(name: string): Counter | undefined {
    return this.counters.get(name);
  }

  /**
   * 获取已创建的 Gauge
   */
  static getGauge(name: string): Gauge | undefined {
    return this.gauges.get(name);
  }

  /**
   * 获取已创建的 Histogram
   */
  static getHistogram(name: string): Histogram | undefined {
    return this.histograms.get(name);
  }

  /**
   * 清理所有指标（主要用于测试）
   */
  static reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * 设备相关业务指标
 */
export class DeviceMetrics {
  // 设备创建相关
  static readonly creationAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_device_creation_attempts_total',
    help: '设备创建尝试总数',
    labelNames: ['userId', 'provider'],
  });

  static readonly creationFailures = BusinessMetrics.createCounter({
    name: 'cloudphone_device_creation_failures_total',
    help: '设备创建失败总数',
    labelNames: ['userId', 'provider', 'reason'],
  });

  // 设备启动相关
  static readonly startAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_device_start_attempts_total',
    help: '设备启动尝试总数',
    labelNames: ['deviceId'],
  });

  static readonly startFailures = BusinessMetrics.createCounter({
    name: 'cloudphone_device_start_failures_total',
    help: '设备启动失败总数',
    labelNames: ['deviceId', 'reason'],
  });

  // 设备状态统计
  static readonly devicesActive = BusinessMetrics.createGauge({
    name: 'cloudphone_devices_active',
    help: '当前活跃设备数',
  });

  static readonly devicesRunning = BusinessMetrics.createGauge({
    name: 'cloudphone_devices_running',
    help: '当前运行中设备数',
  });

  static readonly devicesStopped = BusinessMetrics.createGauge({
    name: 'cloudphone_devices_stopped',
    help: '当前已停止设备数',
  });

  static readonly devicesError = BusinessMetrics.createGauge({
    name: 'cloudphone_devices_error',
    help: '当前错误状态设备数',
  });

  // 设备操作耗时
  static readonly operationDuration = BusinessMetrics.createHistogram({
    name: 'cloudphone_device_operation_duration_seconds',
    help: '设备操作耗时（秒）',
    labelNames: ['operation', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  });
}

/**
 * 计费相关业务指标
 */
export class BillingMetrics {
  // 支付相关
  static readonly paymentAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_payment_attempts_total',
    help: '支付尝试总数',
    labelNames: ['userId', 'method'],
  });

  static readonly paymentFailures = BusinessMetrics.createCounter({
    name: 'cloudphone_payment_failures_total',
    help: '支付失败总数',
    labelNames: ['userId', 'method', 'reason'],
  });

  static readonly paymentsSuccess = BusinessMetrics.createCounter({
    name: 'cloudphone_payments_success_total',
    help: '支付成功总数',
    labelNames: ['userId', 'method'],
  });

  // 退款相关
  static readonly refunds = BusinessMetrics.createCounter({
    name: 'cloudphone_refunds_total',
    help: '退款总数',
    labelNames: ['userId', 'reason'],
  });

  // 余额统计
  static readonly usersLowBalance = BusinessMetrics.createGauge({
    name: 'cloudphone_users_low_balance',
    help: '余额不足用户数（<10元）',
  });

  static readonly totalRevenue = BusinessMetrics.createGauge({
    name: 'cloudphone_total_revenue_yuan',
    help: '总营收（元）',
  });

  // 支付耗时
  static readonly paymentDuration = BusinessMetrics.createHistogram({
    name: 'cloudphone_payment_duration_seconds',
    help: '支付处理耗时（秒）',
    labelNames: ['method', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  // 账单生成
  static readonly billsGenerated = BusinessMetrics.createCounter({
    name: 'cloudphone_bills_generated_total',
    help: '账单生成总数',
    labelNames: ['userId', 'type'],
  });
}

/**
 * 用户相关业务指标
 */
export class UserMetrics {
  // 注册相关
  static readonly registrationAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_user_registration_attempts_total',
    help: '用户注册尝试总数',
    labelNames: ['source'],
  });

  static readonly registrationFailures = BusinessMetrics.createCounter({
    name: 'cloudphone_user_registration_failures_total',
    help: '用户注册失败总数',
    labelNames: ['source', 'reason'],
  });

  static readonly registrationSuccess = BusinessMetrics.createCounter({
    name: 'cloudphone_user_registration_success_total',
    help: '用户注册成功总数',
  });

  // 登录相关
  static readonly loginAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_user_login_attempts_total',
    help: '用户登录尝试总数',
    labelNames: ['username'],
  });

  static readonly loginFailures = BusinessMetrics.createCounter({
    name: 'cloudphone_user_login_failures_total',
    help: '用户登录失败总数',
    labelNames: ['username', 'reason'],
  });

  static readonly loginSuccess = BusinessMetrics.createCounter({
    name: 'cloudphone_user_login_success_total',
    help: '用户登录成功总数',
    labelNames: ['username'],
  });

  // 用户状态
  static readonly usersActive = BusinessMetrics.createGauge({
    name: 'cloudphone_users_active',
    help: '活跃用户数',
  });

  static readonly usersLocked = BusinessMetrics.createCounter({
    name: 'cloudphone_users_locked_total',
    help: '用户锁定总数',
    labelNames: ['userId', 'reason'],
  });

  static readonly usersOnline = BusinessMetrics.createGauge({
    name: 'cloudphone_users_online',
    help: '在线用户数',
  });

  static readonly totalUsers = BusinessMetrics.createGauge({
    name: 'cloudphone_users_total',
    help: '总用户数',
  });

  // 角色管理
  static readonly roleAssignment = BusinessMetrics.createCounter({
    name: 'cloudphone_user_role_assignment_total',
    help: '角色分配总数',
    labelNames: ['userId', 'role'],
  });

  // 用户操作耗时
  static readonly operationDuration = BusinessMetrics.createHistogram({
    name: 'cloudphone_user_operation_duration_seconds',
    help: '用户操作耗时（秒）',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  });
}

/**
 * 应用管理相关业务指标
 */
export class AppMetrics {
  // 应用安装
  static readonly installAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_app_install_attempts_total',
    help: '应用安装尝试总数',
    labelNames: ['appId', 'deviceId'],
  });

  static readonly installFailures = BusinessMetrics.createCounter({
    name: 'cloudphone_app_install_failures_total',
    help: '应用安装失败总数',
    labelNames: ['appId', 'deviceId', 'reason'],
  });

  // 应用卸载
  static readonly uninstallAttempts = BusinessMetrics.createCounter({
    name: 'cloudphone_app_uninstall_attempts_total',
    help: '应用卸载尝试总数',
    labelNames: ['appId', 'deviceId'],
  });

  // 应用审核
  static readonly reviewsTotal = BusinessMetrics.createGauge({
    name: 'cloudphone_app_reviews_pending',
    help: '待审核应用数',
  });

  // 应用下载量
  static readonly downloads = BusinessMetrics.createCounter({
    name: 'cloudphone_app_downloads_total',
    help: '应用下载总数',
    labelNames: ['appId'],
  });
}

/**
 * 通知相关业务指标
 */
export class NotificationMetrics {
  // 发送统计
  static readonly sent = BusinessMetrics.createCounter({
    name: 'cloudphone_notifications_sent_total',
    help: '通知发送总数',
    labelNames: ['channel', 'type'],
  });

  static readonly failures = BusinessMetrics.createCounter({
    name: 'cloudphone_notifications_failed_total',
    help: '通知发送失败总数',
    labelNames: ['channel', 'type', 'reason'],
  });

  // 通知队列
  static readonly queueSize = BusinessMetrics.createGauge({
    name: 'cloudphone_notifications_queue_size',
    help: '通知队列长度',
    labelNames: ['channel'],
  });

  // 发送耗时
  static readonly sendDuration = BusinessMetrics.createHistogram({
    name: 'cloudphone_notification_send_duration_seconds',
    help: '通知发送耗时（秒）',
    labelNames: ['channel', 'type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });
}
