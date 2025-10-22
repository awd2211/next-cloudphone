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

