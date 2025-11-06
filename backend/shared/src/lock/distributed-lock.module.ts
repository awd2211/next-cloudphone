import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DistributedLockService } from './distributed-lock.service';
import { Redis } from 'ioredis';

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
@Module({})
export class DistributedLockModule {
  static forRoot(): DynamicModule {
    return {
      module: DistributedLockModule,
      global: true,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: (configService: ConfigService) => {
            const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
            const redisPort = configService.get<number>('REDIS_PORT', 6379);
            const redisPassword = configService.get<string>('REDIS_PASSWORD');

            return new Redis({
              host: redisHost,
              port: redisPort,
              password: redisPassword,
              retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
              },
              maxRetriesPerRequest: 3,
            });
          },
          inject: [ConfigService],
        },
        {
          provide: DistributedLockService,
          useFactory: (redis: Redis) => {
            return new DistributedLockService(redis);
          },
          inject: ['REDIS_CLIENT'],
        },
      ],
      exports: [DistributedLockService],
    };
  }
}
