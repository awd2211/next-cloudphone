import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, register } from 'prom-client';

/**
 * 用户服务自定义指标服务
 * 提供业务相关的 Prometheus 指标
 */
@Injectable()
export class UserMetricsService implements OnModuleInit {
  // ========== 计数器指标 ==========

  /**
   * 用户创建计数器
   * 标签：tenant_id（租户ID）, status（成功/失败）
   */
  private readonly userCreatedCounter: Counter;

  /**
   * 用户登录计数器
   * 标签：tenant_id, status（success/failed）, reason（失败原因）
   */
  private readonly userLoginCounter: Counter;

  /**
   * 密码修改计数器
   * 标签：tenant_id, status
   */
  private readonly passwordChangeCounter: Counter;

  /**
   * 账户锁定计数器
   * 标签：tenant_id, attempts（尝试次数）
   */
  private readonly accountLockedCounter: Counter;

  // ========== 直方图指标 ==========

  /**
   * 登录请求耗时（秒）
   * 用于性能监控和SLA保证
   */
  private readonly loginDurationHistogram: Histogram;

  /**
   * 用户查询耗时（秒）
   * 包括单个用户查询和列表查询
   */
  private readonly userQueryDurationHistogram: Histogram;

  /**
   * 统计查询耗时（秒）
   */
  private readonly statsDurationHistogram: Histogram;

  // ========== 仪表指标 ==========

  /**
   * 活跃用户数
   * 标签：tenant_id
   */
  private readonly activeUsersGauge: Gauge;

  /**
   * 总用户数
   * 标签：tenant_id
   */
  private readonly totalUsersGauge: Gauge;

  /**
   * 锁定用户数
   * 标签：tenant_id
   */
  private readonly lockedUsersGauge: Gauge;

  constructor() {
    // 初始化计数器 - 使用 getSingleMetric 避免重复注册
    this.userCreatedCounter = this.getOrCreateCounter({
      name: 'user_created_total',
      help: 'Total number of users created',
      labelNames: ['tenant_id', 'status'],
    });

    this.userLoginCounter = this.getOrCreateCounter({
      name: 'user_login_total',
      help: 'Total number of login attempts',
      labelNames: ['tenant_id', 'status', 'reason'],
    });

    this.passwordChangeCounter = this.getOrCreateCounter({
      name: 'user_password_change_total',
      help: 'Total number of password changes',
      labelNames: ['tenant_id', 'status'],
    });

    this.accountLockedCounter = this.getOrCreateCounter({
      name: 'user_account_locked_total',
      help: 'Total number of account lockouts',
      labelNames: ['tenant_id', 'attempts'],
    });

    // 初始化直方图 - 使用 getOrCreateHistogram 避免重复注册
    this.loginDurationHistogram = this.getOrCreateHistogram({
      name: 'user_login_duration_seconds',
      help: 'Login request duration in seconds',
      labelNames: ['tenant_id', 'status'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5], // 100ms, 300ms, 500ms, 1s, 2s, 5s
    });

    this.userQueryDurationHistogram = this.getOrCreateHistogram({
      name: 'user_query_duration_seconds',
      help: 'User query duration in seconds',
      labelNames: ['operation', 'tenant_id'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1], // 10ms, 50ms, 100ms, 300ms, 500ms, 1s
    });

    this.statsDurationHistogram = this.getOrCreateHistogram({
      name: 'user_stats_duration_seconds',
      help: 'Statistics query duration in seconds',
      labelNames: ['tenant_id'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2], // 50ms, 100ms, 300ms, 500ms, 1s, 2s
    });

    // 初始化仪表 - 使用 getOrCreateGauge 避免重复注册
    this.activeUsersGauge = this.getOrCreateGauge({
      name: 'user_active_count',
      help: 'Number of active users',
      labelNames: ['tenant_id'],
    });

    this.totalUsersGauge = this.getOrCreateGauge({
      name: 'user_total_count',
      help: 'Total number of users',
      labelNames: ['tenant_id'],
    });

    this.lockedUsersGauge = this.getOrCreateGauge({
      name: 'user_locked_count',
      help: 'Number of locked users',
      labelNames: ['tenant_id'],
    });
  }

  onModuleInit() {
    // 模块初始化时可以做一些初始化工作
  }

  // ========== 计数器方法 ==========

  recordUserCreated(tenantId: string, success: boolean): void {
    this.userCreatedCounter.inc({
      tenant_id: tenantId || 'default',
      status: success ? 'success' : 'failed',
    });
  }

  recordUserLogin(tenantId: string, success: boolean, reason?: string): void {
    this.userLoginCounter.inc({
      tenant_id: tenantId || 'default',
      status: success ? 'success' : 'failed',
      reason: reason || 'none',
    });
  }

  recordPasswordChange(tenantId: string, success: boolean): void {
    this.passwordChangeCounter.inc({
      tenant_id: tenantId || 'default',
      status: success ? 'success' : 'failed',
    });
  }

  recordAccountLocked(tenantId: string, attempts: number): void {
    this.accountLockedCounter.inc({
      tenant_id: tenantId || 'default',
      attempts: attempts.toString(),
    });
  }

  // ========== 直方图方法 ==========

  recordLoginDuration(tenantId: string, durationSeconds: number, success: boolean): void {
    this.loginDurationHistogram.observe(
      {
        tenant_id: tenantId || 'default',
        status: success ? 'success' : 'failed',
      },
      durationSeconds
    );
  }

  recordUserQueryDuration(operation: string, tenantId: string, durationSeconds: number): void {
    this.userQueryDurationHistogram.observe(
      {
        operation,
        tenant_id: tenantId || 'default',
      },
      durationSeconds
    );
  }

  recordStatsDuration(tenantId: string, durationSeconds: number): void {
    this.statsDurationHistogram.observe(
      {
        tenant_id: tenantId || 'default',
      },
      durationSeconds
    );
  }

  // ========== 仪表方法 ==========

  updateActiveUsersCount(tenantId: string, count: number): void {
    this.activeUsersGauge.set(
      {
        tenant_id: tenantId || 'default',
      },
      count
    );
  }

  updateTotalUsersCount(tenantId: string, count: number): void {
    this.totalUsersGauge.set(
      {
        tenant_id: tenantId || 'default',
      },
      count
    );
  }

  updateLockedUsersCount(tenantId: string, count: number): void {
    this.lockedUsersGauge.set(
      {
        tenant_id: tenantId || 'default',
      },
      count
    );
  }

  /**
   * 批量更新用户统计指标
   * 通常在 getStats 方法中调用
   */
  updateUserStats(
    tenantId: string,
    stats: {
      totalUsers: number;
      activeUsers: number;
      lockedUsers?: number;
    }
  ): void {
    this.updateTotalUsersCount(tenantId, stats.totalUsers);
    this.updateActiveUsersCount(tenantId, stats.activeUsers);
    if (stats.lockedUsers !== undefined) {
      this.updateLockedUsersCount(tenantId, stats.lockedUsers);
    }
  }

  /**
   * 创建定时器，用于测量操作耗时
   * 使用方法：
   * const timer = metricsService.startTimer();
   * // ... 执行操作 ...
   * timer(); // 记录耗时
   */
  startLoginTimer(tenantId: string, onSuccess: boolean) {
    return this.loginDurationHistogram.startTimer({
      tenant_id: tenantId || 'default',
      status: onSuccess ? 'success' : 'failed',
    });
  }

  startQueryTimer(operation: string, tenantId: string) {
    return this.userQueryDurationHistogram.startTimer({
      operation,
      tenant_id: tenantId || 'default',
    });
  }

  startStatsTimer(tenantId: string) {
    return this.statsDurationHistogram.startTimer({
      tenant_id: tenantId || 'default',
    });
  }

  // ========== Helper methods to avoid duplicate metric registration ==========

  /**
   * Get or create a Counter metric
   * This prevents "metric already registered" errors in cluster mode
   */
  private getOrCreateCounter(config: any): Counter {
    try {
      // Try to get existing metric
      const existingMetric = register.getSingleMetric(config.name);
      if (existingMetric) {
        return existingMetric as Counter;
      }
    } catch (error) {
      // Metric doesn't exist, create it
    }

    return new Counter({
      ...config,
      registers: [register],
    });
  }

  /**
   * Get or create a Histogram metric
   */
  private getOrCreateHistogram(config: any): Histogram {
    try {
      const existingMetric = register.getSingleMetric(config.name);
      if (existingMetric) {
        return existingMetric as Histogram;
      }
    } catch (error) {
      // Metric doesn't exist, create it
    }

    return new Histogram({
      ...config,
      registers: [register],
    });
  }

  /**
   * Get or create a Gauge metric
   */
  private getOrCreateGauge(config: any): Gauge {
    try {
      const existingMetric = register.getSingleMetric(config.name);
      if (existingMetric) {
        return existingMetric as Gauge;
      }
    } catch (error) {
      // Metric doesn't exist, create it
    }

    return new Gauge({
      ...config,
      registers: [register],
    });
  }
}
