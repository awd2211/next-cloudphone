/**
 * Shared 模块统一导出
 * 
 * 此包提供跨服务共享的通用功能模块
 */

// ========== 事件总线 ==========
export { EventBusService } from './events/event-bus.service';
export { EventBusModule } from './events/event-bus.module';
export * from './events/schemas';

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

// ========== 缓存模块 ==========
export { AppCacheModule } from './cache/cache.module';

// ========== 健康检查 ==========
export { HealthCheckService } from './health/health-check.service';
export type { HealthCheckResult, ComponentHealth } from './health/health-check.service';

