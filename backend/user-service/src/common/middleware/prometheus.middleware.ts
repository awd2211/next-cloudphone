import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus 指标中间件
 *
 * 功能：
 * - 自动收集 HTTP 请求指标（RED Method）
 * - 收集 Node.js 运行时指标
 * - 提供 /metrics 端点供 Prometheus 抓取
 */

// 启用默认指标收集（Node.js 运行时）
collectDefaultMetrics({ register });

// HTTP 请求总数
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP 请求延迟（直方图）
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5], // 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s, 5s
  registers: [register],
});

// 当前正在处理的请求数
export const httpRequestsInProgress = new Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method'],
  registers: [register],
});

// 业务指标 - 活跃用户数（需要在其他地方更新）
export const activeUsersGauge = new Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
  registers: [register],
});

// 业务指标 - 用户登录总数
export const userLoginsTotal = new Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['status'], // success, failed
  registers: [register],
});

// 业务指标 - 用户注册总数
export const userRegistrationsTotal = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['status'], // success, failed
  registers: [register],
});

@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const method = req.method;
    const path = this.normalizePath(req.path);

    // 增加正在处理的请求计数
    httpRequestsInProgress.labels(method).inc();

    // 监听响应完成事件
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // 转换为秒
      const status = res.statusCode.toString();

      // 记录请求总数
      httpRequestsTotal.labels(method, path, status).inc();

      // 记录请求延迟
      httpRequestDuration.labels(method, path).observe(duration);

      // 减少正在处理的请求计数
      httpRequestsInProgress.labels(method).dec();
    });

    next();
  }

  /**
   * 规范化路径（移除动态参数，避免高基数）
   * 例如：/users/123 -> /users/:id
   */
  private normalizePath(path: string): string {
    // 移除查询参数
    path = path.split('?')[0];

    // 替换 UUID 格式的 ID
    path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');

    // 替换数字 ID
    path = path.replace(/\/\d+/g, '/:id');

    // 限制路径长度（避免过长的路径）
    if (path.length > 100) {
      path = path.substring(0, 100) + '...';
    }

    return path;
  }
}

/**
 * Prometheus 指标控制器
 * 提供 /metrics 端点
 */
export class PrometheusController {
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async getContentType(): Promise<string> {
    return register.contentType;
  }
}
