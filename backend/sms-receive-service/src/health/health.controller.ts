import { Controller, Get, Header, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from './health-check.service';
import { MetricsService } from './metrics.service';

/**
 * 健康检查和监控端点
 */
@ApiTags('Health & Monitoring')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * 基础健康检查
   */
  @Get('health')
  @ApiOperation({
    summary: '基础健康检查',
    description: '检查服务是否正在运行',
  })
  @ApiResponse({
    status: 200,
    description: '服务健康',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 详细健康检查
   */
  @Get('health/detailed')
  @ApiOperation({
    summary: '详细健康检查',
    description: '检查所有外部依赖的健康状态(数据库、Redis、RabbitMQ)',
  })
  @ApiResponse({
    status: 200,
    description: '详细健康状态',
    schema: {
      type: 'object',
      properties: {
        overall: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy', 'unknown'] },
        database: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            lastCheck: { type: 'string' },
            error: { type: 'string', nullable: true },
          },
        },
        redis: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            lastCheck: { type: 'string' },
            error: { type: 'string', nullable: true },
          },
        },
        rabbitmq: {
          type: 'object',
          properties: {
            healthy: { type: 'boolean' },
            lastCheck: { type: 'string' },
            error: { type: 'string', nullable: true },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  async detailedHealth() {
    this.logger.debug('Detailed health check requested');
    return await this.healthCheck.getDetailedHealth();
  }

  /**
   * Prometheus metrics 端点
   */
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus Metrics',
    description: '获取 Prometheus 格式的性能指标',
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP sms_number_requests_total Total number of virtual number requests
# TYPE sms_number_requests_total counter
sms_number_requests_total{provider="sms-activate",service="telegram",status="success"} 42

# HELP sms_active_numbers Current number of active virtual numbers
# TYPE sms_active_numbers gauge
sms_active_numbers{provider="sms-activate",status="active"} 5`,
        },
      },
    },
  })
  async metrics() {
    this.logger.debug('Metrics requested');
    return await this.metricsService.getMetrics();
  }

  /**
   * 存活检查 (Kubernetes liveness probe)
   */
  @Get('health/live')
  @ApiOperation({
    summary: '存活检查',
    description: 'Kubernetes liveness probe - 检查服务是否存活',
  })
  @ApiResponse({
    status: 200,
    description: '服务存活',
  })
  liveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  /**
   * 就绪检查 (Kubernetes readiness probe)
   */
  @Get('health/ready')
  @ApiOperation({
    summary: '就绪检查',
    description: 'Kubernetes readiness probe - 检查服务是否就绪接收流量',
  })
  @ApiResponse({
    status: 200,
    description: '服务就绪',
  })
  @ApiResponse({
    status: 503,
    description: '服务未就绪',
  })
  readiness() {
    const isHealthy = this.healthCheck.isHealthy();

    if (isHealthy) {
      return { status: 'ready', timestamp: new Date().toISOString() };
    } else {
      this.logger.warn('Readiness check failed - service not healthy');
      return { status: 'not_ready', timestamp: new Date().toISOString() };
    }
  }
}
