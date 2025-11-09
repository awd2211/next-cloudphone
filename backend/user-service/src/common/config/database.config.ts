import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

/**
 * 动态计算最佳连接池大小
 * 公式：(CPU 核心数 × 2) + 有效磁盘数
 * 参考：https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing
 */
const calculateOptimalPoolSize = (): { min: number; max: number } => {
  const cpuCores = os.cpus().length;
  const effectiveSpindleCount = 1; // 假设 1 个有效磁盘（SSD）

  // 最大连接数：(核心数 × 2) + 磁盘数
  const optimalMax = cpuCores * 2 + effectiveSpindleCount;

  // 最小连接数：核心数的一半，但至少 2 个
  const optimalMin = Math.max(2, Math.floor(cpuCores / 2));

  return {
    min: optimalMin,
    max: optimalMax,
  };
};

/**
 * 数据库连接池配置
 *
 * 极致优化策略（Phase 1）：
 * - 动态连接池大小（基于 CPU 核心数）
 * - Prepared Statement 缓存
 * - 连接超时和空闲超时优化
 * - 慢查询日志和监控
 * - 连接健康检查
 */
export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const isDevelopment = configService.get('NODE_ENV') === 'development';

  // 动态计算最佳连接池大小
  const optimalPoolSize = calculateOptimalPoolSize();

  // 日志输出连接池配置
  console.log('========================================');
  console.log('数据库连接池配置（极致优化）');
  console.log('========================================');
  console.log(`CPU 核心数: ${os.cpus().length}`);
  console.log(`计算的最小连接数: ${optimalPoolSize.min}`);
  console.log(`计算的最大连接数: ${optimalPoolSize.max}`);
  console.log(`Prepared Statement 缓存: 启用`);
  console.log('========================================');

  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: +configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: 'cloudphone_user',  // ✅ 强制使用 cloudphone_user 数据库

    // 实体配置
    entities: [`${__dirname}/../../**/*.entity{.ts,.js}`],
    // ✅ 使用迁移脚本管理数据库架构，禁用 synchronize
    synchronize: false,
    logging: isDevelopment ? 'all' : ['error', 'warn', 'schema'],

    // ========================================================================
    // 连接池配置（核心优化）
    // ========================================================================

    // 额外连接选项（传递给 pg 驱动）
    extra: {
      // ====================================================================
      // 动态连接池配置（极致优化）
      // ====================================================================

      // 连接池最小连接数（动态计算）
      // 保持最少的活跃连接，减少连接建立开销
      min: parseInt(configService.get('DB_POOL_MIN', String(optimalPoolSize.min)), 10),

      // 连接池最大连接数（动态计算）
      // 公式：(CPU 核心数 × 2) + 有效磁盘数
      // 例如：4核心 + 1个SSD = 4 × 2 + 1 = 9
      // 例如：8核心 + 1个SSD = 8 × 2 + 1 = 17
      max: parseInt(configService.get('DB_POOL_MAX', String(optimalPoolSize.max)), 10),

      // 连接获取超时时间（毫秒）
      // 当连接池耗尽时，等待多久抛出超时错误
      connectionTimeoutMillis: parseInt(configService.get('DB_CONNECTION_TIMEOUT', '10000'), 10),

      // 空闲连接超时时间（毫秒）
      // 空闲超过此时间的连接将被回收
      idleTimeoutMillis: parseInt(configService.get('DB_IDLE_TIMEOUT', '30000'), 10),

      // 语句超时时间（毫秒）
      // 单个 SQL 查询的最大执行时间
      statement_timeout: parseInt(
        configService.get('DB_STATEMENT_TIMEOUT', isProduction ? '30000' : '60000'),
        10
      ),

      // 查询超时时间（毫秒）
      query_timeout: parseInt(
        configService.get('DB_QUERY_TIMEOUT', isProduction ? '30000' : '60000'),
        10
      ),

      // 连接参数
      // 应用名称，方便在数据库端识别连接来源
      application_name: configService.get('DB_APPLICATION_NAME', 'user-service'),

      // ====================================================================
      // Prepared Statement 缓存（极致优化）
      // ====================================================================

      // 启用 Prepared Statement 缓存
      // 缓存编译后的查询计划，减少 SQL 解析开销
      // 对于频繁执行的查询，性能提升可达 30-50%
      preparedStatementCacheQueries: parseInt(
        configService.get('DB_PREPARED_STATEMENT_CACHE_QUERIES', '256'),
        10
      ),

      // Prepared Statement 缓存大小（MB）
      preparedStatementCacheSizeMiB: parseInt(
        configService.get('DB_PREPARED_STATEMENT_CACHE_SIZE', '25'),
        10
      ),

      // ====================================================================
      // 性能优化参数
      // ====================================================================

      // 连接池资源检查间隔（毫秒）
      // 定期检查连接池资源，清理无效连接
      evictionRunIntervalMillis: parseInt(
        configService.get('DB_EVICTION_RUN_INTERVAL', '10000'),
        10
      ),

      // 软空闲时间限制（毫秒）
      // 超过此时间的空闲连接可能被回收（如果超过 min 连接数）
      softIdleTimeoutMillis: parseInt(configService.get('DB_SOFT_IDLE_TIMEOUT', '60000'), 10),

      // 最大连接生命周期（毫秒）
      // 连接最多存活时间，防止长时间连接导致的问题
      // 0 表示无限制，生产环境建议设置
      maxLifetimeSeconds: parseInt(
        configService.get('DB_MAX_LIFETIME', isProduction ? '1800' : '0'),
        10
      ),

      // ====================================================================
      // SSL 配置（生产环境）
      // ====================================================================
      ...(isProduction && {
        ssl: {
          rejectUnauthorized: configService.get('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true',
        },
      }),
    },

    // ========================================================================
    // TypeORM 缓存配置
    // ========================================================================
    cache: isProduction
      ? {
          type: 'redis',
          options: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: +configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: +configService.get('REDIS_CACHE_DB', '2'), // 使用 DB 2 用于查询缓存
          },
          duration: 30000, // 缓存持续时间 30 秒
          ignoreErrors: true, // Redis 错误不影响主流程
        }
      : false, // 开发环境禁用缓存

    // ========================================================================
    // 慢查询日志配置
    // ========================================================================
    maxQueryExecutionTime: parseInt(
      configService.get('DB_SLOW_QUERY_THRESHOLD', isProduction ? '1000' : '5000'),
      10
    ), // 慢查询阈值（毫秒）

    // ========================================================================
    // 连接选项
    // ========================================================================
    dropSchema: false, // 永远不要在生产环境删除 schema
    migrationsRun: false, // 通过 CLI 手动运行迁移
    // keepConnectionAlive 已在新版 TypeORM 中移除

    // ========================================================================
    // 日志配置
    // ========================================================================
    logger: isDevelopment ? 'advanced-console' : 'file',
  };
};

/**
 * 连接池健康检查配置
 */
export const connectionPoolHealthConfig = {
  // 连接池使用率告警阈值
  POOL_USAGE_WARNING_THRESHOLD: 0.7, // 70%
  POOL_USAGE_CRITICAL_THRESHOLD: 0.9, // 90%

  // 连接获取时间告警阈值（毫秒）
  CONNECTION_ACQUISITION_WARNING_THRESHOLD: 500, // 500ms
  CONNECTION_ACQUISITION_CRITICAL_THRESHOLD: 2000, // 2s

  // 活跃连接时间告警阈值（毫秒）
  ACTIVE_CONNECTION_WARNING_THRESHOLD: 5000, // 5s
  ACTIVE_CONNECTION_CRITICAL_THRESHOLD: 30000, // 30s

  // 慢查询告警阈值（毫秒）
  SLOW_QUERY_WARNING_THRESHOLD: 1000, // 1s
  SLOW_QUERY_CRITICAL_THRESHOLD: 5000, // 5s
};

/**
 * 数据库连接池监控指标
 */
export interface ConnectionPoolMetrics {
  // 连接池大小
  poolSize: {
    min: number;
    max: number;
    current: number;
  };

  // 连接状态
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };

  // 使用率
  usage: {
    percentage: number; // 连接池使用率百分比
    isWarning: boolean; // 是否达到告警阈值
    isCritical: boolean; // 是否达到严重告警阈值
  };

  // 性能指标
  performance: {
    avgAcquisitionTime: number; // 平均连接获取时间（毫秒）
    avgQueryTime: number; // 平均查询时间（毫秒）
    slowQueries: number; // 慢查询数量
  };

  // 错误统计
  errors: {
    connectionErrors: number; // 连接错误次数
    queryErrors: number; // 查询错误次数
    timeoutErrors: number; // 超时错误次数
  };
}
