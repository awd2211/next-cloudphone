import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 只在 HTTP 上下文中启用限流
    // 跳过 RabbitMQ 消费者、WebSocket 等非 HTTP 上下文
    if (context.getType() !== 'http') {
      return true;
    }

    return super.canActivate(context);
  }
}
