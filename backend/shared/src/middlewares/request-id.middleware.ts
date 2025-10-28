import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID 中间件
 *
 * 功能:
 * 1. 为每个请求生成或传递唯一的 Request ID
 * 2. 支持从请求头读取 Request ID (X-Request-ID)
 * 3. 将 Request ID 注入到请求对象和响应头
 * 4. 便于跨服务追踪和日志关联
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. 从请求头获取 Request ID (如果存在)
    let requestId = req.headers['x-request-id'] as string;

    // 2. 如果不存在,生成新的 Request ID
    if (!requestId) {
      requestId = uuidv4();
    }

    // 3. 注入到请求对象
    (req as any).requestId = requestId;

    // 4. 设置响应头
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}

/**
 * 从请求对象获取 Request ID
 */
export function getRequestId(req: Request): string {
  return (req as any).requestId || 'unknown';
}
