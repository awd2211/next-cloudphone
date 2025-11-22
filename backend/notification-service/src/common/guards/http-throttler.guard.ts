import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 自定义 HTTP 限流守卫
 * 只在 HTTP 请求上下文中应用限流，跳过 RabbitMQ 消费者等非 HTTP 上下文
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  /**
   * 判断是否需要跳过限流检查
   * 对于非 HTTP 上下文（如 RabbitMQ 消息处理程序）返回 true
   */
  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    const type = context.getType();

    // 只对 HTTP 请求应用限流
    // 跳过 RabbitMQ (rpc) 和 WebSocket (ws) 上下文
    if (type !== 'http') {
      return Promise.resolve(true);
    }

    return super.shouldSkip(context);
  }
}
