import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitMiddleware, IPBlacklistMiddleware, AutoBanMiddleware } from './rate-limit.middleware';
import { XssProtectionMiddleware } from './xss-protection.middleware';
import { CsrfProtectionMiddleware } from './csrf-protection.middleware';
import { SecurityHeadersMiddleware, DevelopmentSecurityHeadersMiddleware, ProductionSecurityHeadersMiddleware } from './security-headers.middleware';

/**
 * 安全中间件模块
 * 集成所有安全相关的中间件
 *
 * 包含的安全功能:
 * 1. API 速率限制 (RateLimitMiddleware)
 * 2. IP 黑名单管理 (IPBlacklistMiddleware)
 * 3. 自动封禁 (AutoBanMiddleware)
 * 4. XSS 防护 (XssProtectionMiddleware)
 * 5. CSRF 防护 (CsrfProtectionMiddleware)
 * 6. HTTP 安全头 (SecurityHeadersMiddleware)
 *
 * 使用示例:
 * ```typescript
 * @Module({
 *   imports: [SecurityModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [ConfigModule],
  providers: [
    RateLimitMiddleware,
    IPBlacklistMiddleware,
    AutoBanMiddleware,
    XssProtectionMiddleware,
    CsrfProtectionMiddleware,
    {
      provide: SecurityHeadersMiddleware,
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('NODE_ENV', 'development');
        if (env === 'production') {
          return new ProductionSecurityHeadersMiddleware(configService);
        }
        return new DevelopmentSecurityHeadersMiddleware(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    RateLimitMiddleware,
    IPBlacklistMiddleware,
    AutoBanMiddleware,
    XssProtectionMiddleware,
    CsrfProtectionMiddleware,
    SecurityHeadersMiddleware,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 1. HTTP 安全头 - 最先应用（影响所有响应）
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 2. IP 黑名单 - 尽早拦截恶意 IP
    consumer
      .apply(IPBlacklistMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 3. API 限流 - 排除健康检查和指标端点
    consumer
      .apply(RateLimitMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 4. XSS 防护 - 清理请求输入
    consumer
      .apply(XssProtectionMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 5. CSRF 防护 - 验证请求来源
    consumer
      .apply(CsrfProtectionMiddleware)
      .exclude(
        { path: 'api/v1/auth/login', method: RequestMethod.POST },
        { path: 'api/v1/auth/register', method: RequestMethod.POST },
        { path: 'api/v1/auth/captcha', method: RequestMethod.GET },
        { path: 'api/auth/login', method: RequestMethod.POST },  // 兼容旧路径
        { path: 'api/auth/register', method: RequestMethod.POST },  // 兼容旧路径
        { path: 'health', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 6. 自动封禁 - 监控并自动封禁异常行为
    consumer
      .apply(AutoBanMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

/**
 * 手动安全模块
 * 不自动应用中间件，仅提供服务
 */
@Module({
  imports: [ConfigModule],
  providers: [
    RateLimitMiddleware,
    IPBlacklistMiddleware,
    AutoBanMiddleware,
    XssProtectionMiddleware,
    CsrfProtectionMiddleware,
    SecurityHeadersMiddleware,
  ],
  exports: [
    RateLimitMiddleware,
    IPBlacklistMiddleware,
    AutoBanMiddleware,
    XssProtectionMiddleware,
    CsrfProtectionMiddleware,
    SecurityHeadersMiddleware,
  ],
})
export class SecurityModuleManual {}
