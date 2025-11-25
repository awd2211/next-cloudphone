/**
 * Shared 模块统一导出
 *
 * 此包提供跨服务共享的通用功能模块
 */

// ========== API 响应规范 ==========
export * from './response';

// ========== 事件总线 ==========
export { EventBusService } from './events/event-bus.service';
export { EventBusModule } from './events/event-bus.module';
export * from './events/schemas';
export { IdempotentConsumer } from './events/idempotent-consumer';
export {
  BaseConsumer,
  ConsumerError,
  ConsumerErrorType,
  DefaultErrorHandlingStrategy,
} from './events/base-consumer';
export type { ErrorHandlingStrategy } from './events/base-consumer';

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

// ========== 代理客户端 ==========
export { ProxyClientService } from './proxy/proxy-client.service';
export { ProxyClientModule } from './proxy/proxy-client.module';
export * from './proxy/proxy.interfaces';
export * from './proxy/proxy.constants';

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
export { JwtConfigFactory, createJwtConfig, generateStrongJwtSecret } from './config/jwt.config';
export type { JwtConfigOptions } from './config/jwt.config';

// ========== 缓存模块 ==========
export { AppCacheModule } from './cache/cache.module';
export { UnifiedCacheService, CacheLayer } from './cache/unified-cache.service';
export type { UnifiedCacheConfig, CacheOptions, CacheStats } from './cache/unified-cache.service';
export { UnifiedCacheModule } from './cache/unified-cache.module';

// ========== 加密服务 ==========
export { UnifiedEncryptionService, EncryptionAlgorithm } from './encryption/unified-encryption.service';
export type { EncryptedData, MaskType, UnifiedEncryptionConfig } from './encryption/unified-encryption.service';
export { UnifiedEncryptionModule } from './encryption/unified-encryption.module';

// ========== 缓存装饰器 ==========
export {
  Cacheable,
  CacheEvict,
  CacheWarmup,
  evictCaches,
  setCaches,
} from './decorators/cacheable.decorator';
export type { CacheableOptions, CacheEvictOptions } from './decorators/cacheable.decorator';

// ========== 事件发布装饰器 ==========
export {
  PublishEvent,
  SimplePublishEvent,
  DynamicPublishEvent,
  BatchPublishEvents,
} from './decorators/publish-event.decorator';
export type { PublishEventOptions } from './decorators/publish-event.decorator';

// ========== 性能监控装饰器 ==========
export {
  MonitorTransaction,
  MonitorTransactionSimple,
  outboxDeliveryDelay,
  outboxBacklog,
  sagaDuration,
  sagaStepDuration,
  sagaTotal,
  sagaCompensations,
} from './decorators/monitor-transaction.decorator';
export type { MonitorTransactionOptions } from './decorators/monitor-transaction.decorator';

// ========== Metrics 端点设置 ==========
export { setupMetricsEndpoint } from './monitoring/metrics.setup';

// ========== 业务指标 ==========
export {
  BusinessMetrics,
  DeviceMetrics,
  BillingMetrics,
  UserMetrics,
  AppMetrics,
  NotificationMetrics,
} from './monitoring/business-metrics';
export type { MetricConfig } from './monitoring/business-metrics';

// ========== 分布式追踪 ==========
export { initTracing, shutdownTracing, getTracingSDK } from './tracing/tracing.setup';
export type { TracingConfig } from './tracing/tracing.setup';

// ========== 健康检查 ==========
export { HealthCheckService } from './health/health-check.service';
export type { HealthCheckResult, ComponentHealth } from './health/health-check.service';
export { BaseHealthController } from './health/base-health.controller';
export type {
  DependencyHealth,
  DependencyChecker,
  SystemInfo,
  HealthCheckResult as BaseHealthCheckResult,
} from './health/base-health.controller';

// ========== 输入验证和安全 ==========
export {
  SanitizationPipe,
  StrictSanitizationPipe,
  LooseSanitizationPipe,
} from './validators/sanitization.pipe';
export type { SanitizationOptions } from './validators/sanitization.pipe';
export {
  SqlInjectionGuard,
  StrictSqlInjectionGuard,
  SqlInjectionCheck,
} from './validators/sql-injection-guard';
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
export { CursorPaginationDto, CursorPagination } from './pagination/cursor-pagination';
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
export { MockJwtStrategy } from './testing/mock-jwt-strategy';

// ========== 安全中间件 ==========
// 说明：以下安全功能已通过 NestJS 生态系统实现，无需自定义中间件：
//
// ✅ Rate Limiting: @nestjs/throttler (已在各服务中配置)
// ✅ Security Headers: helmet (已在 api-gateway 中配置)
// ✅ CSRF Protection: csurf (按需在需要的路由启用)
// ✅ XSS Protection: class-transformer + helmet (自动处理)
// ✅ IP Blacklist: 可通过 Redis + Guard 实现 (见 SecurityModule)
//
// 如需自定义实现，可参考以下接口设计：
// export {
//   RateLimitMiddleware,
//   IPBlacklistMiddleware,
//   AutoBanMiddleware,
// } from './middlewares/rate-limit.middleware';
// export {
//   XssProtectionMiddleware,
//   StrictXssProtectionMiddleware,
//   LooseXssProtectionMiddleware,
// } from './middlewares/xss-protection.middleware';
// export type { XssProtectionConfig } from './middlewares/xss-protection.middleware';
// export {
//   CsrfProtectionMiddleware,
//   CsrfProtected,
//   CsrfExempt,
// } from './middlewares/csrf-protection.middleware';
// export type { CsrfProtectionConfig } from './middlewares/csrf-protection.middleware';
// export {
//   SecurityHeadersMiddleware,
//   DevelopmentSecurityHeadersMiddleware,
//   ProductionSecurityHeadersMiddleware,
// } from './middlewares/security-headers.middleware';
// export type { SecurityHeadersConfig } from './middlewares/security-headers.middleware';
// export { SecurityModule, SecurityModuleManual } from './middlewares/security.module';

// ========== Service-to-Service Authentication ==========
export { ServiceAuthGuard } from './auth/service-auth.guard';
export { ServiceTokenService } from './auth/service-token.service';
export type { ServiceTokenPayload } from './auth/service-auth.guard';

// ========== 统一认证授权基类 (New!) ==========
export * from './auth';

// ========== RBAC & Data Scope ==========
export { UserRole, isAdminRole, hasAdminRole, isSuperAdmin } from './constants/roles';
export { DataScope, DataScopeType } from './decorators/data-scope.decorator';
export type { DataScopeConfig } from './decorators/data-scope.decorator';
export { DataScopeGuard } from './guards/data-scope.guard';

// ========== K8s 集群化支持 ==========
// 环境检测工具
export { ClusterDetector } from './cluster/cluster-detector';

// 集群安全的 Cron 装饰器（自动适配本地开发和 K8s 环境）
export {
  ClusterSafeCron,
  ClusterSafeCronEveryMinute,
  ClusterSafeCronEvery5Minutes,
  ClusterSafeCronEvery10Minutes,
  ClusterSafeCronEvery30Minutes,
  ClusterSafeCronEveryHour,
  ClusterSafeCronEveryDay,
} from './cluster/cluster-safe-cron.decorator';
export type { ClusterSafeCronOptions } from './cluster/cluster-safe-cron.decorator';

// ========== 文件存储抽象层 ==========
// 存储接口和实现（自动切换 LocalFileStorage / MinIO）
export type { IStorageService, FileMetadata } from './storage/storage.interface';
export { LocalFileStorage } from './storage/local-file-storage.service';
export { MinIOStorage } from './storage/minio-storage.service';
export { StorageModule } from './storage/storage.module';
export type { StorageModuleOptions } from './storage/storage.module';

// 多云存储服务
export { S3CompatibleStorage } from './storage/s3-compatible-storage.service';
export type { S3CompatibleStorageConfig } from './storage/s3-compatible-storage.service';
export { AliyunOSSStorage } from './storage/aliyun-oss-storage.service';
export type { AliyunOSSStorageConfig } from './storage/aliyun-oss-storage.service';
export { TencentCOSStorage } from './storage/tencent-cos-storage.service';
export type { TencentCOSStorageConfig } from './storage/tencent-cos-storage.service';
export { QiniuStorage } from './storage/qiniu-storage.service';
export type { QiniuStorageConfig } from './storage/qiniu-storage.service';

// 存储工厂服务
export { StorageFactory } from './storage/storage-factory.service';
export type { StorageType, StorageConfig } from './storage/storage-factory.service';
