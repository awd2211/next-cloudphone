import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * ✅ 请求追踪中间件
 * 功能：
 * 1. 为每个请求生成唯一的 traceId 和 spanId
 * 2. 将 traceId 传播到下游服务（通过 X-Trace-Id header）
 * 3. 将追踪信息注入到请求对象（方便日志拦截器使用）
 * 4. 支持分布式追踪（从上游服务提取 traceId）
 */
@Injectable()
export class RequestTracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestTracing');

  use(req: Request, res: Response, next: NextFunction) {
    // ✅ 1. 生成或提取 traceId（支持分布式追踪）
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const spanId = uuidv4(); // 当前服务的 span ID
    const parentSpanId = req.headers['x-span-id'] as string; // 上游服务的 span ID

    // ✅ 2. 将追踪信息注入到请求对象（方便后续使用）
    (req as any).traceId = traceId;
    (req as any).spanId = spanId;
    (req as any).parentSpanId = parentSpanId;

    // ✅ 3. 将追踪信息添加到响应头（方便客户端追踪）
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Span-Id', spanId);

    next();
  }
}

/**
 * ✅ 扩展 Express Request 类型
 * 添加追踪字段的类型定义
 */
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      spanId?: string;
      parentSpanId?: string;
    }
  }
}
