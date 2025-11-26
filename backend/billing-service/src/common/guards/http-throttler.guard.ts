import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * HTTP Throttler Guard
 *
 * 扩展 NestJS 的 ThrottlerGuard，只在 HTTP 上下文中应用限流。
 * 这样可以避免在 RabbitMQ、WebSocket 等非 HTTP 上下文中触发错误。
 *
 * 问题背景：
 * - 默认的 ThrottlerGuard 会尝试在 response 上设置 header
 * - RabbitMQ 消费者没有 HTTP response 对象
 * - 这会导致 "res.header is not a function" 错误
 *
 * 解决方案：
 * - 检查上下文类型，只在 HTTP 上下文中应用限流
 * - 非 HTTP 上下文直接放行
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  /**
   * 检查请求是否可以继续
   * 只在 HTTP 上下文中应用限流规则
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 只在 HTTP 上下文中应用限流
    const contextType = context.getType();

    if (contextType !== 'http') {
      // 非 HTTP 上下文（如 RabbitMQ、WebSocket、gRPC），直接放行
      return true;
    }

    // HTTP 上下文，应用正常的限流逻辑
    return super.canActivate(context);
  }
}
