/**
 * Events 模块统一导出
 */

export * from './event-bus.service';
export * from './event-bus.module';
export * from './schemas';
export { IdempotentConsumer } from './idempotent-consumer';
export {
  BaseConsumer,
  ConsumerError,
  ConsumerErrorType,
  DefaultErrorHandlingStrategy,
} from './base-consumer';
export type { ErrorHandlingStrategy } from './base-consumer';
