import { Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as os from 'os';

/**
 * 依赖项健康状态
 */
export interface DependencyHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  message?: string;
  version?: string;
  details?: Record<string, any>;
}

/**
 * 系统信息
 */
export interface SystemInfo {
  hostname: string;
  platform: string;
  nodeVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  cpu: {
    cores: number;
    model: string;
  };
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'unhealthy' | 'shutting_down';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  dependencies: Record<string, DependencyHealth>;
  system: SystemInfo;
  metadata?: Record<string, any>;
}

/**
 * 依赖检查器接口
 */
export interface DependencyChecker {
  name: string;
  /** 是否为关键依赖 (影响 readiness) */
  critical: boolean;
  check(): Promise<DependencyHealth>;
}

/**
 * 基础健康检查控制器
 *
 * 提供标准化的健康检查端点:
 * - GET /health - 完整健康检查
 * - GET /health/liveness - K8s 存活探针
 * - GET /health/readiness - K8s 就绪探针
 * - GET /health/detailed - 详细健康检查
 *
 * 使用方式:
 * ```typescript
 * @Controller('health')
 * export class HealthController extends BaseHealthController {
 *   constructor(
 *     @InjectDataSource() dataSource: DataSource,
 *     @InjectRedis() redis: Redis,
 *   ) {
 *     super('my-service', '1.0.0');
 *
 *     // 注册依赖检查器
 *     this.registerChecker({
 *       name: 'database',
 *       critical: true,
 *       check: () => this.checkDatabase(dataSource),
 *     });
 *
 *     this.registerChecker({
 *       name: 'redis',
 *       critical: true,
 *       check: () => this.checkRedis(redis),
 *     });
 *   }
 *
 *   // 可选: 重写以添加服务描述
 *   protected getServiceDetails() {
 *     return {
 *       description: 'My Service Description',
 *       capabilities: ['feature1', 'feature2'],
 *     };
 *   }
 * }
 * ```
 */
@ApiTags('health')
export abstract class BaseHealthController {
  protected readonly startTime: number = Date.now();
  protected readonly checkers: DependencyChecker[] = [];
  protected shuttingDown: boolean = false;

  constructor(
    protected readonly serviceName: string,
    protected readonly serviceVersion: string = '1.0.0',
  ) {}

  /**
   * 注册依赖检查器
   */
  protected registerChecker(checker: DependencyChecker): void {
    this.checkers.push(checker);
  }

  /**
   * 标记服务正在关闭
   */
  public markShuttingDown(): void {
    this.shuttingDown = true;
  }

  /**
   * 主健康检查端点
   */
  @Get()
  @ApiOperation({
    summary: '健康检查',
    description: '检查服务是否正常运行，包括依赖项状态和系统信息',
  })
  @ApiResponse({ status: 200, description: '服务正常或降级' })
  async check(): Promise<HealthCheckResult> {
    // 检查是否正在关闭
    if (this.shuttingDown) {
      return this.buildResult('shutting_down', {});
    }

    // 并行执行所有依赖检查
    const dependencies: Record<string, DependencyHealth> = {};
    const checkPromises = this.checkers.map(async (checker) => {
      try {
        const result = await checker.check();
        dependencies[checker.name] = result;
      } catch (error) {
        dependencies[checker.name] = {
          status: 'unhealthy',
          message: error.message || 'Check failed',
        };
      }
    });

    await Promise.all(checkPromises);

    // 计算整体状态
    const status = this.calculateOverallStatus(dependencies);

    return this.buildResult(status, dependencies);
  }

  /**
   * Kubernetes 存活探针
   * 只检查服务进程是否存活，不检查依赖
   */
  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes 存活探针' })
  @ApiResponse({ status: 200, description: '服务存活' })
  async liveness() {
    // 存活检查只需要确认进程运行
    return {
      status: this.shuttingDown ? 'shutting_down' : 'ok',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
    };
  }

  /**
   * Kubernetes 就绪探针
   * 检查所有关键依赖是否就绪
   */
  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes 就绪探针' })
  @ApiResponse({ status: 200, description: '服务就绪' })
  @ApiResponse({ status: 503, description: '服务未就绪' })
  async readiness() {
    if (this.shuttingDown) {
      return {
        status: 'error',
        message: 'Service is shutting down',
        timestamp: new Date().toISOString(),
      };
    }

    // 只检查关键依赖
    const criticalCheckers = this.checkers.filter((c) => c.critical);
    const dependencies: Record<string, string> = {};
    let allHealthy = true;

    for (const checker of criticalCheckers) {
      try {
        const result = await checker.check();
        dependencies[checker.name] = result.status;
        if (result.status === 'unhealthy') {
          allHealthy = false;
        }
      } catch (error) {
        dependencies[checker.name] = 'unhealthy';
        allHealthy = false;
      }
    }

    if (!allHealthy) {
      return {
        status: 'error',
        message: 'Critical dependencies unhealthy',
        dependencies,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'ok',
      service: this.serviceName,
      dependencies,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 详细健康检查
   */
  @Get('detailed')
  @ApiOperation({ summary: '详细健康检查' })
  @ApiResponse({ status: 200, description: '详细健康信息' })
  async detailedCheck() {
    const basicCheck = await this.check();

    return {
      ...basicCheck,
      details: this.getServiceDetails(),
      checkers: this.checkers.map((c) => ({
        name: c.name,
        critical: c.critical,
      })),
    };
  }

  // ==================== 辅助方法 ====================

  /**
   * 构建健康检查结果
   */
  protected buildResult(
    status: HealthCheckResult['status'],
    dependencies: Record<string, DependencyHealth>,
  ): HealthCheckResult {
    return {
      status,
      service: this.serviceName,
      version: this.serviceVersion,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      system: this.getSystemInfo(),
      metadata: this.getMetadata(),
    };
  }

  /**
   * 计算整体状态
   */
  protected calculateOverallStatus(
    dependencies: Record<string, DependencyHealth>,
  ): HealthCheckResult['status'] {
    const statuses = Object.values(dependencies).map((d) => d.status);

    if (statuses.some((s) => s === 'unhealthy')) {
      // 检查是否为关键依赖不健康
      for (const checker of this.checkers) {
        if (checker.critical && dependencies[checker.name]?.status === 'unhealthy') {
          return 'unhealthy';
        }
      }
      return 'degraded';
    }

    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }

    return 'ok';
  }

  /**
   * 获取运行时间 (秒)
   */
  protected getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * 获取系统信息
   */
  protected getSystemInfo(): SystemInfo {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
      memory: {
        total: Math.floor(totalMemory / 1024 / 1024), // MB
        free: Math.floor(freeMemory / 1024 / 1024), // MB
        used: Math.floor(usedMemory / 1024 / 1024), // MB
        usagePercent: Math.floor((usedMemory / totalMemory) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
      },
    };
  }

  /**
   * 获取服务描述 (子类可重写)
   */
  protected getServiceDetails(): Record<string, any> {
    return {
      description: this.serviceName,
      capabilities: [],
    };
  }

  /**
   * 获取额外元数据 (子类可重写)
   */
  protected getMetadata(): Record<string, any> | undefined {
    return undefined;
  }

  // ==================== 通用依赖检查方法 ====================

  /**
   * 检查数据库连接
   */
  protected async checkDatabase(
    dataSource: { query: (sql: string) => Promise<any>; isInitialized?: boolean },
  ): Promise<DependencyHealth> {
    try {
      if (dataSource.isInitialized === false) {
        return {
          status: 'unhealthy',
          message: 'Database not initialized',
        };
      }

      const start = Date.now();
      await dataSource.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        message: responseTime < 100 ? 'Database healthy' : 'Database slow',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database error: ${error.message}`,
      };
    }
  }

  /**
   * 检查 Redis 连接
   */
  protected async checkRedis(
    redis: { ping: () => Promise<string>; info?: (section?: string) => Promise<string> },
  ): Promise<DependencyHealth> {
    try {
      const start = Date.now();
      const result = await redis.ping();

      if (result !== 'PONG') {
        return {
          status: 'unhealthy',
          message: 'Redis PING failed',
        };
      }

      const responseTime = Date.now() - start;

      // 可选: 获取版本
      let version: string | undefined;
      if (redis.info) {
        try {
          const info = await redis.info('server');
          version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        } catch {
          // Ignore version fetch errors
        }
      }

      return {
        status: responseTime < 50 ? 'healthy' : 'degraded',
        responseTime,
        version,
        message: responseTime < 50 ? 'Redis healthy' : 'Redis slow',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis error: ${error.message}`,
      };
    }
  }

  /**
   * 检查 RabbitMQ 连接
   */
  protected async checkRabbitMQ(
    connection: { isConnected?: () => boolean },
  ): Promise<DependencyHealth> {
    try {
      const isConnected = connection.isConnected?.() ?? false;

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        message: isConnected ? 'RabbitMQ connected' : 'RabbitMQ disconnected',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `RabbitMQ error: ${error.message}`,
      };
    }
  }
}
