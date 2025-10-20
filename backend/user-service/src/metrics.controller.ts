import { Controller, Get, Header } from '@nestjs/common';
import { register } from 'prom-client';

/**
 * Prometheus Metrics 控制器
 *
 * 提供 /metrics 端点供 Prometheus 抓取
 */
@Controller()
export class MetricsController {
  @Get('metrics')
  @Header('Content-Type', register.contentType)
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
