/**
 * Shared 模块统一导出
 * 
 * 此包提供跨服务共享的通用功能模块
 */

// ========== 事件总线 ==========
export { EventBusService } from './events/event-bus.service';
export { EventBusModule } from './events/event-bus.module';
export * from './events/schemas';

// ========== Provider 类型定义 ==========
export * from './types/provider.types';

// ========== 通知类型定义 ==========
export * from './types/notification.types';

// ========== 服务发现 ==========
export { ConsulService } from './consul/consul.service';
export { ConsulModule } from './consul/consul.module';

// ========== HTTP 客户端 ==========
export { HttpClientService } from './http/http-client.service';
export { HttpClientModule } from './http/http-client.module';

// ========== 异常处理 ==========
export * from './exceptions';

// ========== 过滤器 ==========
export * from './filters';

// ========== 拦截器 ==========
export * from './interceptors';

// ========== 中间件 ==========
export * from './middlewares';

// ========== 工具类 ==========
export { TempFileManagerService } from './utils/temp-file-manager.service';

// ========== 配置验证 ==========
export * from './config/env.validation';

// ========== 日志配置 ==========
export * from './config/logger.config';

// ========== 数据库配置工厂 ==========
export * from './config/database.config';

// ========== Redis 配置工厂 ==========
export * from './config/redis.config';

// ========== JWT 配置工厂 ==========
export {
  JwtConfigFactory,
  createJwtConfig,
  generateStrongJwtSecret,
} from './config/jwt.config';
export type { JwtConfigOptions } from './config/jwt.config';

// ========== 缓存模块 ==========
export { AppCacheModule } from './cache/cache.module';

// ========== 缓存装饰器 ==========
export {
  Cacheable,
  CacheEvict,
  CacheWarmup,
  evictCaches,
  setCaches,
} from './decorators/cacheable.decorator';
export type { CacheableOptions, CacheEvictOptions } from './decorators/cacheable.decorator';

// ========== 健康检查 ==========
export { HealthCheckService } from './health/health-check.service';
export type { HealthCheckResult, ComponentHealth } from './health/health-check.service';

// ========== 输入验证和安全 ==========
export { SanitizationPipe, StrictSanitizationPipe, LooseSanitizationPipe } from './validators/sanitization.pipe';
export type { SanitizationOptions } from './validators/sanitization.pipe';
export { SqlInjectionGuard, StrictSqlInjectionGuard, SqlInjectionCheck } from './validators/sql-injection-guard';
export { SqlInjectionSeverity } from './validators/sql-injection-guard';
export type { SqlInjectionDetectionResult } from './validators/sql-injection-guard';
export * from './validators/custom-validators';
export { ValidationModule, ValidationModuleManual } from './validators/validation.module';

// ========== 查询审计 ==========
export { QueryAudit, createAuditedQueryBuilder, AuditedQueryBuilder } from './utils/query-audit';
export type { QueryAuditConfig, QueryAuditResult } from './utils/query-audit';

// ========== 数据库工具 ==========
export {
  Transaction,
  Transactional,
  TransactionWithOptions,
  TransactionPropagation,
} from './database/transaction.decorator';
export type { TransactionOptions } from './database/transaction.decorator';

// ========== 分页工具 ==========
export {
  CursorPaginationDto,
  CursorPagination,
} from './pagination/cursor-pagination';
export type { CursorPaginatedResponse } from './pagination/cursor-pagination';

// ========== 分布式锁 ==========
export { DistributedLockService, Lock } from './lock/distributed-lock.service';
export type { LockConfig } from './lock/distributed-lock.service';
export { DistributedLockModule } from './lock/distributed-lock.module';

// ========== 重试机制 ==========
export {
  Retry,
  retryWithBackoff,
  NetworkError,
  TimeoutError,
  TemporaryError,
  DockerError,
  AdbError,
  DatabaseTemporaryError,
  ServiceUnavailableError,
  RateLimitError,
} from './common/retry.decorator';
export type { RetryOptions } from './common/retry.decorator';

// ========== Saga 编排 ==========
export { SagaOrchestratorService, SagaModule } from './saga';
export type { SagaState, SagaStep, SagaDefinition } from './saga';
export { SagaStatus, SagaType } from './saga';

// ========== Transactional Outbox ==========
export { EventOutbox, EventOutboxService, EventOutboxModule } from './outbox';

// ========== 测试工具 ==========
// 注意: 测试工具仅在测试环境中使用,不应在生产代码中导出
// export { TransactionTestHelper, ConcurrencyTestHelper } from './testing';
// export type { ConcurrencyTestResult, RaceConditionTestResult } from './testing';

// ========== 测试辅助工具 (Test Helpers & Mock Factories) ==========
// 注意: Jest mock 工具仅在测试环境中使用,不应在生产代码中导出
// export * from './testing/test-helpers';
// export * from './testing/mock-factories';

// ========== 安全中间件 ==========
export { RateLimitMiddleware, IPBlacklistMiddleware, AutoBanMiddleware } from './middleware/rate-limit.middleware';
export { XssProtectionMiddleware, StrictXssProtectionMiddleware, LooseXssProtectionMiddleware } from './middleware/xss-protection.middleware';
export type { XssProtectionConfig } from './middleware/xss-protection.middleware';
export { CsrfProtectionMiddleware, CsrfProtected, CsrfExempt } from './middleware/csrf-protection.middleware';
export type { CsrfProtectionConfig } from './middleware/csrf-protection.middleware';
export {
  SecurityHeadersMiddleware,
  DevelopmentSecurityHeadersMiddleware,
  ProductionSecurityHeadersMiddleware
} from './middleware/security-headers.middleware';
export type { SecurityHeadersConfig } from './middleware/security-headers.middleware';
export { SecurityModule, SecurityModuleManual } from './middleware/security.module';

// ========== Service-to-Service Authentication ==========
export { ServiceAuthGuard } from './auth/service-auth.guard';
export { ServiceTokenService } from './auth/service-token.service';
export type { ServiceTokenPayload } from './auth/service-auth.guard';

