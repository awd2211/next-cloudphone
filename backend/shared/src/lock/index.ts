/**
 * Distributed Lock Utilities
 *
 * 分布式锁工具集合，基于 Redis 实现
 */

export { DistributedLockService, Lock } from './distributed-lock.service';
export type { LockConfig } from './distributed-lock.service';
export { DistributedLockModule } from './distributed-lock.module';
