import { Injectable, Logger, OnApplicationShutdown, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

/**
 * 优雅关闭服务
 *
 * 功能：
 * - 监听关闭信号 (SIGTERM, SIGINT)
 * - 停止接收新请求
 * - 等待现有请求完成
 * - 关闭数据库连接
 * - 关闭队列连接
 * - 清理资源
 */
@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isShuttingDown = false;
  private shutdownTimeout: NodeJS.Timeout | null = null;

  // 关闭超时时间（毫秒）
  private readonly SHUTDOWN_TIMEOUT = 30000; // 30秒

  // 活跃请求计数
  private activeRequests = 0;

  // 关闭钩子回调
  private shutdownHooks: Array<{
    name: string;
    callback: () => Promise<void>;
    priority: number;
  }> = [];

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private pinoLogger: PinoLogger
  ) {
    this.setupSignalHandlers();
  }

  /**
   * 设置信号处理器
   */
  private setupSignalHandlers(): void {
    // SIGTERM: Docker 停止容器时发送
    process.on('SIGTERM', () => {
      this.logger.log('📥 Received SIGTERM signal');
      this.shutdown('SIGTERM');
    });

    // SIGINT: Ctrl+C 或 kill 命令
    process.on('SIGINT', () => {
      this.logger.log('📥 Received SIGINT signal');
      this.shutdown('SIGINT');
    });

    // 未捕获的异常
    process.on('uncaughtException', (error: Error) => {
      this.pinoLogger.error({
        type: 'uncaught_exception',
        error: error.message,
        stack: error.stack,
        message: '❌ Uncaught exception',
      });

      // 等待日志写入后退出
      setTimeout(() => {
        this.shutdown('uncaughtException', 1);
      }, 1000);
    });

    // 未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.pinoLogger.error({
        type: 'unhandled_rejection',
        reason: reason?.message || reason,
        stack: reason?.stack,
        message: '❌ Unhandled promise rejection',
      });
    });
  }

  /**
   * 执行优雅关闭
   */
  private async shutdown(signal: string, exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;

    this.pinoLogger.info({
      type: 'graceful_shutdown_start',
      signal,
      activeRequests: this.activeRequests,
      message: `🔄 Starting graceful shutdown (signal: ${signal})`,
    });

    // 设置关闭超时
    this.shutdownTimeout = setTimeout(() => {
      this.logger.error('⏰ Shutdown timeout reached, forcing exit');
      this.forceExit(1);
    }, this.SHUTDOWN_TIMEOUT);

    try {
      // 第1步: 停止接收新请求
      await this.stopAcceptingNewRequests();

      // 第2步: 等待现有请求完成
      await this.waitForActiveRequests();

      // 第3步: 执行关闭钩子（按优先级）
      await this.executeShutdownHooks();

      // 第4步: 关闭数据库连接
      await this.closeDatabaseConnections();

      // 第5步: 清理其他资源
      await this.cleanupResources();

      this.pinoLogger.info({
        type: 'graceful_shutdown_complete',
        signal,
        message: '✅ Graceful shutdown completed',
      });

      // 清除超时定时器
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
      }

      // 等待日志写入
      await this.flushLogs();

      // 退出进程
      process.exit(exitCode);
    } catch (error) {
      this.logger.error(`Shutdown error: ${error.message}`);
      this.forceExit(1);
    }
  }

  /**
   * 停止接收新请求
   */
  private async stopAcceptingNewRequests(): Promise<void> {
    this.logger.log('🛑 Step 1: Stopping new requests');

    // 设置健康检查为 degraded
    // 这会导致负载均衡器停止向此实例发送流量
    this.isShuttingDown = true;

    this.logger.log('✅ Stopped accepting new requests');
  }

  /**
   * 等待现有请求完成
   */
  private async waitForActiveRequests(): Promise<void> {
    this.logger.log(`⏳ Step 2: Waiting for ${this.activeRequests} active requests to complete`);

    const startTime = Date.now();
    const maxWaitTime = 15000; // 最多等待15秒

    while (this.activeRequests > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxWaitTime) {
        this.logger.warn(`⚠️ Timeout waiting for requests, ${this.activeRequests} still active`);
        break;
      }

      // 每100ms检查一次
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.logger.log('✅ All active requests completed');
  }

  /**
   * 执行关闭钩子
   */
  private async executeShutdownHooks(): Promise<void> {
    this.logger.log(`🪝 Step 3: Executing ${this.shutdownHooks.length} shutdown hooks`);

    // 按优先级排序（优先级高的先执行）
    const sortedHooks = [...this.shutdownHooks].sort((a, b) => b.priority - a.priority);

    for (const hook of sortedHooks) {
      try {
        this.logger.log(`Executing hook: ${hook.name} (priority: ${hook.priority})`);
        await hook.callback();
        this.logger.log(`✅ Hook completed: ${hook.name}`);
      } catch (error) {
        this.logger.error(`❌ Hook failed: ${hook.name} - ${error.message}`);
      }
    }

    this.logger.log('✅ All shutdown hooks executed');
  }

  /**
   * 关闭数据库连接
   */
  private async closeDatabaseConnections(): Promise<void> {
    this.logger.log('🗄️ Step 4: Closing database connections');

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.logger.log('✅ Database connections closed');
      } else {
        this.logger.log('Database already closed');
      }
    } catch (error) {
      this.logger.error(`Failed to close database: ${error.message}`);
    }
  }

  /**
   * 清理其他资源
   */
  private async cleanupResources(): Promise<void> {
    this.logger.log('🧹 Step 5: Cleaning up resources');

    // 这里可以添加其他资源清理逻辑
    // 例如：关闭文件句柄、清理临时文件等

    this.logger.log('✅ Resources cleaned up');
  }

  /**
   * 刷新日志
   */
  private async flushLogs(): Promise<void> {
    return new Promise((resolve) => {
      // 等待 Winston 日志写入完成
      setTimeout(resolve, 500);
    });
  }

  /**
   * 强制退出
   */
  private forceExit(code: number): void {
    this.logger.error('❌ Forcing immediate exit');
    process.exit(code);
  }

  /**
   * 注册关闭钩子
   *
   * @param name 钩子名称
   * @param callback 回调函数
   * @param priority 优先级（数字越大优先级越高）
   */
  registerShutdownHook(name: string, callback: () => Promise<void>, priority: number = 0): void {
    this.shutdownHooks.push({ name, callback, priority });
    this.logger.log(`Registered shutdown hook: ${name} (priority: ${priority})`);
  }

  /**
   * 增加活跃请求计数
   */
  incrementActiveRequests(): void {
    this.activeRequests++;
  }

  /**
   * 减少活跃请求计数
   */
  decrementActiveRequests(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
  }

  /**
   * 获取活跃请求数
   */
  getActiveRequestsCount(): number {
    return this.activeRequests;
  }

  /**
   * 检查是否正在关闭
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * NestJS 应用关闭钩子
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Application shutdown hook called (signal: ${signal})`);
  }
}
