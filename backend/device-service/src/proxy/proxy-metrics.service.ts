import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyHealthService } from './proxy-health.service';
import { ProxyCleanupService } from './proxy-cleanup.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * 代理 Prometheus 指标服务
 * 负责收集和暴露代理相关的 Prometheus 指标
 */
@Injectable()
export class ProxyMetricsService implements OnModuleInit {
  private readonly logger = new Logger(ProxyMetricsService.name);

  // Prometheus Registry（从 MetricsService 获取）
  private readonly register: promClient.Registry;

  // 代理指标
  private proxyActiveGauge: promClient.Gauge;
  private proxyUnhealthyGauge: promClient.Gauge;
  private proxyAssignmentsCounter: promClient.Counter;
  private proxyReleasesCounter: promClient.Counter;
  private proxyByCountryGauge: promClient.Gauge;
  private proxyUsageDurationHistogram: promClient.Histogram;
  private proxyHealthCheckSuccessRateGauge: promClient.Gauge;
  private proxyOrphanCleanupCounter: promClient.Counter;
  private proxyLatencyHistogram: promClient.Histogram;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly proxyStats: ProxyStatsService,
    private readonly proxyHealth: ProxyHealthService,
    private readonly proxyCleanup: ProxyCleanupService,
  ) {
    // 使用 MetricsService 的 register（共享同一个 registry）
    this.register = metricsService.register;
    this.initializeMetrics();
  }

  async onModuleInit() {
    this.logger.log(
      'ProxyMetricsService initialized - starting metrics collection',
    );

    // 启动定时采集（每 60 秒更新一次代理指标）
    setInterval(() => this.collectProxyMetrics(), 60000);
  }

  /**
   * 初始化所有代理 Prometheus 指标
   */
  private initializeMetrics() {
    // 1. 活跃代理数量
    this.proxyActiveGauge = new promClient.Gauge({
      name: 'cloudphone_proxy_active_total',
      help: 'Total number of active proxies',
      labelNames: ['proxy_country', 'proxy_type'],
      registers: [this.register],
    });

    // 2. 不健康代理数量
    this.proxyUnhealthyGauge = new promClient.Gauge({
      name: 'cloudphone_proxy_unhealthy_total',
      help: 'Total number of unhealthy proxies',
      labelNames: ['health_status'], // healthy, degraded, unhealthy
      registers: [this.register],
    });

    // 3. 代理分配次数（Counter）
    this.proxyAssignmentsCounter = new promClient.Counter({
      name: 'cloudphone_proxy_assignments_total',
      help: 'Total number of proxy assignments',
      labelNames: ['proxy_country', 'proxy_type'],
      registers: [this.register],
    });

    // 4. 代理释放次数（Counter）
    this.proxyReleasesCounter = new promClient.Counter({
      name: 'cloudphone_proxy_releases_total',
      help: 'Total number of proxy releases',
      labelNames: ['release_reason'], // device_deleted, health_check_failed, manual, auto_cleanup, orphan_cleanup
      registers: [this.register],
    });

    // 5. 按国家分组的活跃代理数
    this.proxyByCountryGauge = new promClient.Gauge({
      name: 'cloudphone_proxy_active_by_country',
      help: 'Number of active proxies grouped by country',
      labelNames: ['country'],
      registers: [this.register],
    });

    // 6. 代理使用时长分布（Histogram）
    this.proxyUsageDurationHistogram = new promClient.Histogram({
      name: 'cloudphone_proxy_usage_duration_minutes',
      help: 'Distribution of proxy usage duration in minutes',
      labelNames: ['proxy_country'],
      buckets: [5, 15, 30, 60, 120, 240, 480, 1440], // 5分钟到24小时
      registers: [this.register],
    });

    // 7. 代理健康检查成功率
    this.proxyHealthCheckSuccessRateGauge = new promClient.Gauge({
      name: 'cloudphone_proxy_health_check_success_rate',
      help: 'Proxy health check success rate (0-100)',
      labelNames: ['proxy_id'],
      registers: [this.register],
    });

    // 8. 孤儿代理清理次数
    this.proxyOrphanCleanupCounter = new promClient.Counter({
      name: 'cloudphone_proxy_orphan_cleanup_total',
      help: 'Total number of orphan proxy cleanups',
      labelNames: ['status'], // success, failed
      registers: [this.register],
    });

    // 9. 代理延迟分布（Histogram）
    this.proxyLatencyHistogram = new promClient.Histogram({
      name: 'cloudphone_proxy_latency_ms',
      help: 'Distribution of proxy latency in milliseconds',
      labelNames: ['proxy_country', 'proxy_type'],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000], // 50ms到5秒
      registers: [this.register],
    });

    this.logger.log('All proxy Prometheus metrics initialized');
  }

  /**
   * 定时采集代理指标
   */
  private async collectProxyMetrics() {
    try {
      // 1. 获取活跃代理统计
      const activeProxyStats = await this.proxyStats.getActiveProxyStats();

      // 重置 Gauge（避免过时数据）
      this.proxyActiveGauge.reset();
      this.proxyByCountryGauge.reset();

      // 按国家统计
      const countryStats: Record<string, number> = {};

      for (const proxyStats of activeProxyStats) {
        // 活跃代理数
        this.proxyActiveGauge.inc({
          proxy_country: proxyStats.proxyCountry || 'unknown',
          proxy_type: 'http', // 如果有类型字段可以使用
        });

        // 按国家统计
        const country = proxyStats.proxyCountry || 'unknown';
        countryStats[country] = (countryStats[country] || 0) + 1;

        // 健康检查成功率
        this.proxyHealthCheckSuccessRateGauge.set(
          { proxy_id: proxyStats.proxyId },
          proxyStats.avgHealthRate,
        );
      }

      // 更新国家统计
      for (const [country, count] of Object.entries(countryStats)) {
        this.proxyByCountryGauge.set({ country }, count);
      }

      // 2. 获取不健康代理数量
      const unhealthyProxies = await this.proxyHealth.getUnhealthyProxies();
      this.proxyUnhealthyGauge.reset();

      const healthStatusCounts: Record<string, number> = {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
      };

      for (const proxy of unhealthyProxies) {
        const status = proxy.healthStatus || 'unhealthy';
        healthStatusCounts[status] = (healthStatusCounts[status] || 0) + 1;
      }

      for (const [status, count] of Object.entries(healthStatusCounts)) {
        this.proxyUnhealthyGauge.set({ health_status: status }, count);
      }

      // 3. 获取孤儿代理统计
      const orphanStats = await this.proxyCleanup.getOrphanStatistics();
      // 注意：这里只设置当前值，实际清理计数由 recordOrphanCleanup 方法更新

      this.logger.debug(
        `Collected proxy metrics: ${activeProxyStats.length} active, ${unhealthyProxies.length} unhealthy, ${orphanStats.orphanCount} orphans`,
      );
    } catch (error) {
      this.logger.error('Failed to collect proxy metrics', error.stack);
    }
  }

  /**
   * 记录代理分配
   */
  recordProxyAssignment(proxyCountry: string, proxyType: string = 'http') {
    this.proxyAssignmentsCounter.inc({
      proxy_country: proxyCountry || 'unknown',
      proxy_type: proxyType,
    });
  }

  /**
   * 记录代理释放
   */
  recordProxyRelease(releaseReason: string) {
    this.proxyReleasesCounter.inc({
      release_reason: releaseReason,
    });
  }

  /**
   * 记录代理使用时长
   */
  recordProxyUsageDuration(durationMinutes: number, proxyCountry?: string) {
    this.proxyUsageDurationHistogram.observe(
      { proxy_country: proxyCountry || 'unknown' },
      durationMinutes,
    );
  }

  /**
   * 记录代理延迟
   */
  recordProxyLatency(
    latencyMs: number,
    proxyCountry?: string,
    proxyType?: string,
  ) {
    this.proxyLatencyHistogram.observe(
      {
        proxy_country: proxyCountry || 'unknown',
        proxy_type: proxyType || 'http',
      },
      latencyMs,
    );
  }

  /**
   * 记录孤儿代理清理
   */
  recordOrphanCleanup(status: 'success' | 'failed') {
    this.proxyOrphanCleanupCounter.inc({ status });
  }

  /**
   * 手动触发指标采集（用于测试或强制更新）
   */
  async triggerCollection(): Promise<void> {
    this.logger.log('Manual metrics collection triggered');
    await this.collectProxyMetrics();
  }
}
