import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { VirtualNumber, SmsMessage } from '../entities';
import { Counter, Gauge, Histogram, Registry, register } from 'prom-client';

/**
 * Prometheus Metrics 服务
 * 收集和管理 SMS Receive Service 的各项指标
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // Counters
  private readonly numberRequestsTotal: Counter<string>;
  private readonly smsReceivedTotal: Counter<string>;
  private readonly numberCancellationsTotal: Counter<string>;
  private readonly errorTotal: Counter<string>;

  // Gauges
  private readonly activeNumbersGauge: Gauge<string>;
  private readonly waitingSmsGauge: Gauge<string>;
  private readonly providerHealthGauge: Gauge<string>;

  // Histograms
  private readonly pollingDurationHistogram: Histogram<string>;
  private readonly numberRequestDurationHistogram: Histogram<string>;
  private readonly smsReceiveTimeHistogram: Histogram<string>;
  private readonly verificationCodeExtractionTimeHistogram: Histogram<string>;

  // 成本和成功率追踪
  private readonly providerCostGauge: Gauge<string>;
  private readonly providerSuccessRateGauge: Gauge<string>;
  private readonly providerResponseTimeGauge: Gauge<string>;

  // 验证码相关
  private readonly verificationCodeExtractedTotal: Counter<string>;
  private readonly verificationCodeCacheHits: Counter<string>;
  private readonly verificationCodeCacheMisses: Counter<string>;

  // 号码池相关
  private readonly numberPoolSizeGauge: Gauge<string>;
  private readonly numberPoolPreheatedGauge: Gauge<string>;
  private readonly numberPoolReusedTotal: Counter<string>;

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
  ) {
    // Initialize Counters
    this.numberRequestsTotal = new Counter({
      name: 'sms_number_requests_total',
      help: 'Total number of virtual number requests',
      labelNames: ['provider', 'service', 'status'],
      registers: [register],
    });

    this.smsReceivedTotal = new Counter({
      name: 'sms_messages_received_total',
      help: 'Total number of SMS messages received',
      labelNames: ['provider', 'service'],
      registers: [register],
    });

    this.numberCancellationsTotal = new Counter({
      name: 'sms_number_cancellations_total',
      help: 'Total number of virtual number cancellations',
      labelNames: ['provider', 'reason'],
      registers: [register],
    });

    this.errorTotal = new Counter({
      name: 'sms_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'provider'],
      registers: [register],
    });

    // Initialize Gauges
    this.activeNumbersGauge = new Gauge({
      name: 'sms_active_numbers',
      help: 'Current number of active virtual numbers',
      labelNames: ['provider', 'status'],
      registers: [register],
    });

    this.waitingSmsGauge = new Gauge({
      name: 'sms_waiting_numbers',
      help: 'Current number of numbers waiting for SMS',
      registers: [register],
    });

    this.providerHealthGauge = new Gauge({
      name: 'sms_provider_health',
      help: 'Provider health status (1=healthy, 0=unhealthy)',
      labelNames: ['provider'],
      registers: [register],
    });

    // Initialize Histograms
    this.pollingDurationHistogram = new Histogram({
      name: 'sms_polling_duration_seconds',
      help: 'Duration of SMS polling operations',
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.numberRequestDurationHistogram = new Histogram({
      name: 'sms_number_request_duration_seconds',
      help: 'Duration of number request operations',
      labelNames: ['provider'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.smsReceiveTimeHistogram = new Histogram({
      name: 'sms_receive_time_seconds',
      help: 'Time taken to receive SMS after number activation',
      labelNames: ['provider', 'service'],
      buckets: [5, 10, 30, 60, 120, 300],
      registers: [register],
    });

    this.verificationCodeExtractionTimeHistogram = new Histogram({
      name: 'sms_verification_code_extraction_time_seconds',
      help: 'Time taken to extract verification code from SMS',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [register],
    });

    // 成本和性能指标
    this.providerCostGauge = new Gauge({
      name: 'sms_provider_average_cost_usd',
      help: 'Average cost per SMS in USD',
      labelNames: ['provider', 'service'],
      registers: [register],
    });

    this.providerSuccessRateGauge = new Gauge({
      name: 'sms_provider_success_rate_percent',
      help: 'Provider success rate percentage',
      labelNames: ['provider'],
      registers: [register],
    });

    this.providerResponseTimeGauge = new Gauge({
      name: 'sms_provider_response_time_seconds',
      help: 'Average provider API response time',
      labelNames: ['provider'],
      registers: [register],
    });

    // 验证码相关
    this.verificationCodeExtractedTotal = new Counter({
      name: 'sms_verification_code_extracted_total',
      help: 'Total number of verification codes successfully extracted',
      labelNames: ['service', 'pattern_type'],
      registers: [register],
    });

    this.verificationCodeCacheHits = new Counter({
      name: 'sms_verification_code_cache_hits_total',
      help: 'Total verification code cache hits',
      registers: [register],
    });

    this.verificationCodeCacheMisses = new Counter({
      name: 'sms_verification_code_cache_misses_total',
      help: 'Total verification code cache misses',
      registers: [register],
    });

    // 号码池相关
    this.numberPoolSizeGauge = new Gauge({
      name: 'sms_number_pool_size',
      help: 'Current size of number pool',
      labelNames: ['status', 'provider'],
      registers: [register],
    });

    this.numberPoolPreheatedGauge = new Gauge({
      name: 'sms_number_pool_preheated',
      help: 'Number of preheated numbers in pool',
      labelNames: ['provider', 'service'],
      registers: [register],
    });

    this.numberPoolReusedTotal = new Counter({
      name: 'sms_number_pool_reused_total',
      help: 'Total number of reused numbers from pool',
      labelNames: ['provider'],
      registers: [register],
    });

    this.logger.log('Prometheus metrics initialized with enhanced tracking');
  }

  /**
   * 记录号码请求
   */
  recordNumberRequest(provider: string, service: string, status: 'success' | 'failure') {
    this.numberRequestsTotal.inc({ provider, service, status });
  }

  /**
   * 记录收到的 SMS
   */
  recordSmsReceived(provider: string, service: string) {
    this.smsReceivedTotal.inc({ provider, service });
  }

  /**
   * 记录号码取消
   */
  recordNumberCancellation(provider: string, reason: string) {
    this.numberCancellationsTotal.inc({ provider, reason });
  }

  /**
   * 记录错误
   */
  recordError(type: string, provider?: string) {
    this.errorTotal.inc({ type, provider: provider || 'unknown' });
  }

  /**
   * 记录轮询持续时间
   */
  recordPollingDuration(durationSeconds: number) {
    this.pollingDurationHistogram.observe(durationSeconds);
  }

  /**
   * 记录号码请求持续时间
   */
  recordNumberRequestDuration(provider: string, durationSeconds: number) {
    this.numberRequestDurationHistogram.observe({ provider }, durationSeconds);
  }

  /**
   * 更新活跃号码指标
   */
  async updateActiveNumbersMetrics() {
    try {
      // Group by provider and status
      const results = await this.numberRepo
        .createQueryBuilder('number')
        .select('number.provider', 'provider')
        .addSelect('number.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('number.status IN (:...statuses)', {
          statuses: ['active', 'waiting_sms', 'received'],
        })
        .groupBy('number.provider')
        .addGroupBy('number.status')
        .getRawMany();

      // Reset gauge
      this.activeNumbersGauge.reset();

      // Set values
      for (const row of results) {
        this.activeNumbersGauge.set(
          { provider: row.provider, status: row.status },
          parseInt(row.count, 10),
        );
      }

      // Update waiting SMS count
      const waitingCount = await this.numberRepo.count({
        where: { status: 'waiting_sms' },
      });
      this.waitingSmsGauge.set(waitingCount);
    } catch (error) {
      this.logger.error('Failed to update active numbers metrics', error.stack);
    }
  }

  /**
   * 更新提供商健康状态
   */
  updateProviderHealth(provider: string, isHealthy: boolean) {
    this.providerHealthGauge.set({ provider }, isHealthy ? 1 : 0);
  }

  /**
   * 获取所有 metrics
   */
  async getMetrics(): Promise<string> {
    // Update real-time metrics
    await this.updateActiveNumbersMetrics();

    return register.metrics();
  }

  /**
   * 获取 metrics 的 Registry
   */
  getRegistry(): Registry {
    return register;
  }

  /**
   * 记录 SMS 接收时间
   */
  recordSmsReceiveTime(provider: string, service: string, durationSeconds: number) {
    this.smsReceiveTimeHistogram.observe({ provider, service }, durationSeconds);
  }

  /**
   * 记录验证码提取时间
   */
  recordVerificationCodeExtractionTime(durationSeconds: number) {
    this.verificationCodeExtractionTimeHistogram.observe(durationSeconds);
  }

  /**
   * 记录验证码提取成功
   */
  recordVerificationCodeExtracted(service: string, patternType: string) {
    this.verificationCodeExtractedTotal.inc({ service, pattern_type: patternType });
  }

  /**
   * 记录验证码缓存命中
   */
  recordVerificationCodeCacheHit() {
    this.verificationCodeCacheHits.inc();
  }

  /**
   * 记录验证码缓存未命中
   */
  recordVerificationCodeCacheMiss() {
    this.verificationCodeCacheMisses.inc();
  }

  /**
   * 记录号码池复用
   */
  recordNumberPoolReused(provider: string) {
    this.numberPoolReusedTotal.inc({ provider });
  }

  /**
   * 更新平台成本统计
   */
  updateProviderCost(provider: string, service: string, costUsd: number) {
    this.providerCostGauge.set({ provider, service }, costUsd);
  }

  /**
   * 更新平台成功率
   */
  updateProviderSuccessRate(provider: string, successRatePercent: number) {
    this.providerSuccessRateGauge.set({ provider }, successRatePercent);
  }

  /**
   * 更新平台响应时间
   */
  updateProviderResponseTime(provider: string, responseTimeSeconds: number) {
    this.providerResponseTimeGauge.set({ provider }, responseTimeSeconds);
  }

  /**
   * 更新号码池指标
   */
  async updateNumberPoolMetrics() {
    try {
      // 需要导入 NumberPool 实体
      // 这里暂时跳过，在完整实现时会添加
      this.logger.debug('Number pool metrics updated');
    } catch (error) {
      this.logger.error('Failed to update number pool metrics', error.stack);
    }
  }
}
