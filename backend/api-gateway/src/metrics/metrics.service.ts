import { Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: promClient.Registry;

  // HTTP 请求相关指标
  public readonly httpRequestDuration: promClient.Histogram;
  public readonly httpRequestTotal: promClient.Counter;
  public readonly httpRequestErrors: promClient.Counter;

  // 代理请求指标
  public readonly proxyRequestDuration: promClient.Histogram;
  public readonly proxyRequestTotal: promClient.Counter;
  public readonly proxyRequestErrors: promClient.Counter;

  // 系统资源指标
  public readonly memoryUsage: promClient.Gauge;
  public readonly cpuUsage: promClient.Gauge;
  public readonly activeConnections: promClient.Gauge;

  constructor() {
    // 创建自定义 registry
    this.register = new promClient.Registry();

    // 添加默认指标（进程、内存、CPU等）
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'api_gateway_',
    });

    // HTTP 请求时长直方图
    this.httpRequestDuration = new promClient.Histogram({
      name: 'api_gateway_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // HTTP 请求计数器
    this.httpRequestTotal = new promClient.Counter({
      name: 'api_gateway_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP 错误计数器
    this.httpRequestErrors = new promClient.Counter({
      name: 'api_gateway_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
      registers: [this.register],
    });

    // 代理请求时长
    this.proxyRequestDuration = new promClient.Histogram({
      name: 'api_gateway_proxy_request_duration_seconds',
      help: 'Duration of proxied requests to backend services',
      labelNames: ['service', 'method', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    // 代理请求计数器
    this.proxyRequestTotal = new promClient.Counter({
      name: 'api_gateway_proxy_requests_total',
      help: 'Total number of proxied requests',
      labelNames: ['service', 'method', 'status_code'],
      registers: [this.register],
    });

    // 代理请求错误
    this.proxyRequestErrors = new promClient.Counter({
      name: 'api_gateway_proxy_request_errors_total',
      help: 'Total number of proxy request errors',
      labelNames: ['service', 'method', 'error_type'],
      registers: [this.register],
    });

    // 内存使用量
    this.memoryUsage = new promClient.Gauge({
      name: 'api_gateway_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register],
    });

    // CPU 使用率
    this.cpuUsage = new promClient.Gauge({
      name: 'api_gateway_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.register],
    });

    // 活跃连接数
    this.activeConnections = new promClient.Gauge({
      name: 'api_gateway_active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });
  }

  async onModuleInit() {
    // 启动系统指标收集
    this.startSystemMetricsCollection();
  }

  /**
   * 获取所有指标（Prometheus 格式）
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * 获取内容类型
   */
  getContentType(): string {
    return this.register.contentType;
  }

  /**
   * 记录 HTTP 请求
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);

    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
  }

  /**
   * 记录 HTTP 错误
   */
  recordHttpError(method: string, route: string, statusCode: number, errorType: string) {
    this.httpRequestErrors.labels(method, route, statusCode.toString(), errorType).inc();
  }

  /**
   * 记录代理请求
   */
  recordProxyRequest(service: string, method: string, statusCode: number, duration: number) {
    this.proxyRequestDuration.labels(service, method, statusCode.toString()).observe(duration);

    this.proxyRequestTotal.labels(service, method, statusCode.toString()).inc();
  }

  /**
   * 记录代理错误
   */
  recordProxyError(service: string, method: string, errorType: string) {
    this.proxyRequestErrors.labels(service, method, errorType).inc();
  }

  /**
   * 增加活跃连接数
   */
  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  /**
   * 减少活跃连接数
   */
  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  /**
   * 启动系统指标收集（每30秒）
   */
  private startSystemMetricsCollection() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.labels('heap_used').set(memUsage.heapUsed);
      this.memoryUsage.labels('heap_total').set(memUsage.heapTotal);
      this.memoryUsage.labels('rss').set(memUsage.rss);
      this.memoryUsage.labels('external').set(memUsage.external);

      // CPU 使用率需要更复杂的计算，这里简化处理
      const usage = process.cpuUsage();
      const cpuPercent = ((usage.user + usage.system) / 1000000 / 30) * 100; // 30秒间隔
      this.cpuUsage.set(cpuPercent);
    }, 30000);
  }

  /**
   * 重置所有指标（用于测试）
   */
  resetMetrics() {
    this.register.resetMetrics();
  }
}
