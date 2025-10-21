import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GracefulShutdownService } from '../services/graceful-shutdown.service';

/**
 * 请求追踪中间件
 *
 * 用于配合优雅关闭，追踪活跃请求数量
 */
@Injectable()
export class RequestTrackerMiddleware implements NestMiddleware {
  constructor(private gracefulShutdownService: GracefulShutdownService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // 如果正在关闭，拒绝新请求
    if (this.gracefulShutdownService.isShutdownInProgress()) {
      res.status(503).json({
        statusCode: 503,
        message: 'Service is shutting down, please retry later',
        error: 'Service Unavailable',
      });
      return;
    }

    // 增加活跃请求计数
    this.gracefulShutdownService.incrementActiveRequests();

    // 请求完成时减少计数
    const cleanup = () => {
      this.gracefulShutdownService.decrementActiveRequests();
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    next();
  }
}
