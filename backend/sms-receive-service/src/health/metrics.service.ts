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

    this.logger.log('Prometheus metrics initialized');
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
}
