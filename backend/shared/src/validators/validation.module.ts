import { Module, Global } from '@nestjs/common';
import { APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SanitizationPipe } from './sanitization.pipe';
import { SqlInjectionGuard } from './sql-injection-guard';

/**
 * 全局验证模块
 *
 * 集成所有输入验证和安全检测功能:
 * 1. 输入清理管道 (SanitizationPipe)
 * 2. SQL 注入防护守卫 (SqlInjectionGuard)
 * 3. 自定义验证装饰器
 *
 * 使用方式:
 * ```typescript
 * // 在 app.module.ts 中导入
 * @Module({
 *   imports: [
 *     ValidationModule,
 *     // ... 其他模块
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * 配置选项（通过环境变量）:
 * - VALIDATION_STRICT_MODE: 是否启用严格验证模式（默认 false）
 * - VALIDATION_SQL_INJECTION_SEVERITY: SQL 注入检测严重程度 (low/medium/high，默认 medium)
 * - VALIDATION_MAX_STRING_LENGTH: 最大字符串长度（默认 10000）
 * - VALIDATION_ENABLE_HTML_SANITIZATION: 是否启用 HTML 清理（默认 true）
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // 全局输入清理管道
    {
      provide: APP_PIPE,
      useFactory: (configService: ConfigService) => {
        const strictMode = configService.get<boolean>('VALIDATION_STRICT_MODE', false);
        const maxStringLength = configService.get<number>('VALIDATION_MAX_STRING_LENGTH', 10000);
        const enableHtmlSanitization = configService.get<boolean>(
          'VALIDATION_ENABLE_HTML_SANITIZATION',
          true,
        );

        return new SanitizationPipe({
          strictMode,
          maxStringLength,
          enableHtmlSanitization,
          enableSqlKeywordDetection: true,
          enableNoSqlInjectionDetection: true,
          trimWhitespace: true,
          escapeSpecialChars: false,
          allowedTags: [],
        });
      },
      inject: [ConfigService],
    },

    // 全局 SQL 注入防护守卫
    {
      provide: APP_GUARD,
      useClass: SqlInjectionGuard,
    },
  ],
  exports: [],
})
export class ValidationModule {}

/**
 * 验证模块（不自动启用全局功能）
 *
 * 如果你想手动控制 Pipe 和 Guard 的应用范围，使用此模块
 */
@Module({
  imports: [ConfigModule],
  providers: [SanitizationPipe, SqlInjectionGuard],
  exports: [SanitizationPipe, SqlInjectionGuard],
})
export class ValidationModuleManual {}
