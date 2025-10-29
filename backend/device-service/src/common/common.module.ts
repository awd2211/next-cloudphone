import { Module, Global } from "@nestjs/common";
import { RetryService } from "./retry.service";
import { RetryController } from "./retry.controller";
import { RateLimiterService } from "./rate-limiter.service";

/**
 * 通用模块：提供跨模块共享的工具和服务
 *
 * 提供的功能：
 * - RetryService: 重试策略管理和统计
 * - @Retry 装饰器: 自动重试（指数退避）
 * - retryWithBackoff: 通用重试工具函数
 * - RateLimiterService: Token Bucket 速率限制
 * - @RateLimit 装饰器: API 调用速率限制
 */
@Global()
@Module({
  controllers: [RetryController],
  providers: [RetryService, RateLimiterService],
  exports: [RetryService, RateLimiterService],
})
export class CommonModule {}
