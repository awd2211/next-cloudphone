import { Module, Global } from '@nestjs/common';
import { DistributedLockService } from './distributed-lock.service';

/**
 * Distributed Lock Module
 *
 * 提供分布式锁服务，基于 Redis 实现
 *
 * 使用方式:
 * ```typescript
 * // 在 AppModule 中导入
 * @Module({
 *   imports: [DistributedLockModule],
 * })
 * export class AppModule {}
 *
 * // 在服务中注入
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     private readonly lockService: DistributedLockService,
 *   ) {}
 *
 *   async login(userId: string) {
 *     await this.lockService.withLock(
 *       `user:${userId}:login`,
 *       5000,
 *       async () => {
 *         // 业务逻辑
 *       }
 *     );
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [DistributedLockService],
  exports: [DistributedLockService],
})
export class DistributedLockModule {}
