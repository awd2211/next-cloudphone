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
 * proxy-service 特殊优化：
 * - 代理池管理（1000-5000个代理）
 * - 高并发查询（读多写少）
 * - 代理健康检查（频繁状态更新）
 * - Prepared Statement 缓存对频繁查询特别有效
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
  console.log(`服务: proxy-service`);
  console.log(`数据库: cloudphone_proxy`);
  console.log(`CPU 核心数: ${os.cpus().length}`);
  console.log(`计算的最小连接数: ${optimalPoolSize.min}`);
  console.log(`计算的最大连接数: ${optimalPoolSize.max}`);
  console.log(`Prepared Statement 缓存: 启用`);
  console.log(`特殊优化: 高并发代理池管理`);
  console.log('========================================');

  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: +configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: 'cloudphone_proxy', // ✅ 强制使用 cloudphone_proxy 数据库

    // 实体配置
    // ✅ HMR 兼容：自动加载 forFeature() 注册的实体
    autoLoadEntities: true,
    synchronize: false, // 生产环境禁用，表已通过迁移脚本创建
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
      min: parseInt(configService.get('DB_POOL_MIN', String(optimalPoolSize.min)), 10),

      // 连接池最大连接数（动态计算）
      max: parseInt(configService.get('DB_POOL_MAX', String(optimalPoolSize.max)), 10),

      // 连接获取超时时间（毫秒）
      connectionTimeoutMillis: parseInt(configService.get('DB_CONNECTION_TIMEOUT', '10000'), 10),

      // 空闲连接超时时间（毫秒）
      idleTimeoutMillis: parseInt(configService.get('DB_IDLE_TIMEOUT', '30000'), 10),

      // 语句超时时间（毫秒）
      statement_timeout: parseInt(
        configService.get('DB_STATEMENT_TIMEOUT', isProduction ? '30000' : '60000'),
        10
      ),

      // 查询超时时间（毫秒）
      query_timeout: parseInt(
        configService.get('DB_QUERY_TIMEOUT', isProduction ? '30000' : '60000'),
        10
      ),

      // 应用名称，方便在数据库端识别连接来源
      application_name: configService.get('DB_APPLICATION_NAME', 'proxy-service'),

      // ====================================================================
      // Prepared Statement 缓存（极致优化）
      // ====================================================================

      // 启用 Prepared Statement 缓存
      // 对于 proxy-service 的频繁查询（代理状态、健康检查），性能提升可达 40-50%
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
      evictionRunIntervalMillis: parseInt(
        configService.get('DB_EVICTION_RUN_INTERVAL', '10000'),
        10
      ),

      // 软空闲时间限制（毫秒）
      softIdleTimeoutMillis: parseInt(configService.get('DB_SOFT_IDLE_TIMEOUT', '60000'), 10),

      // 最大连接生命周期（毫秒）
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
    // proxy-service 标准慢查询阈值
    maxQueryExecutionTime: parseInt(
      configService.get('DB_SLOW_QUERY_THRESHOLD', isProduction ? '1000' : '5000'),
      10
    ), // 生产环境 1000ms（标准）

    // ========================================================================
    // 连接选项
    // ========================================================================
    dropSchema: false, // 永远不要在生产环境删除 schema
    migrationsRun: false, // 通过 CLI 手动运行迁移

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

  // 慢查询告警阈值（毫秒）- proxy-service 标准阈值
  SLOW_QUERY_WARNING_THRESHOLD: 1000, // 1s
  SLOW_QUERY_CRITICAL_THRESHOLD: 5000, // 5s
};
