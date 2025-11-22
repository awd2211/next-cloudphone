import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import * as os from 'os';

/**
 * 计算最佳连接池大小
 * 基于 HikariCP 公式: connections = ((core_count * 2) + effective_spindle_count)
 * 对于 SSD，effective_spindle_count 通常为 1
 */
function calculateOptimalPoolSize(): { min: number; max: number } {
  const cpuCores = os.cpus().length;
  // HikariCP 推荐公式
  const optimalMax = Math.min(cpuCores * 2 + 1, 30); // 最大 30 连接
  const optimalMin = Math.max(2, Math.floor(cpuCores / 2));
  return { min: optimalMin, max: optimalMax };
}

/**
 * Create TypeORM database configuration
 *
 * @param databaseName Database name, e.g., 'cloudphone_device'
 * @returns TypeORM async configuration object
 *
 * @example
 * ```typescript
 * // Use in service AppModule
 * TypeOrmModule.forRootAsync(createDatabaseConfig('cloudphone_device'))
 * ```
 */
export function createDatabaseConfig(databaseName: string): TypeOrmModuleAsyncOptions {
  return {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres' as const,
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: +configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', 'postgres'),
      database: configService.get<string>('DB_DATABASE', databaseName),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: configService.get<string>('NODE_ENV') === 'development',
      extra: {
        // 动态计算连接池大小
        ...calculateOptimalPoolSize(),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        // Prepared Statement 缓存（提升 30-50% 性能）
        preparedStatementCacheQueries: 256,
      },
    }),
    inject: [ConfigService],
  };
}

/**
 * Create custom database configuration (advanced usage)
 *
 * @param options Custom configuration options
 * @returns TypeORM async configuration object
 *
 * @example
 * ```typescript
 * TypeOrmModule.forRootAsync(createCustomDatabaseConfig({
 *   databaseName: 'cloudphone_custom',
 *   synchronize: true,
 *   entities: ['src/entities/*.entity.ts']
 * }))
 * ```
 */
export function createCustomDatabaseConfig(options: {
  databaseName: string;
  synchronize?: boolean;
  entities?: string[];
  logging?: boolean;
}): TypeOrmModuleAsyncOptions {
  return {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres' as const,
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: +configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', 'postgres'),
      database: configService.get<string>('DB_DATABASE', options.databaseName),
      entities: options.entities || [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: options.synchronize ?? false,
      logging: options.logging ?? configService.get<string>('NODE_ENV') === 'development',
      extra: {
        // 动态计算连接池大小
        ...calculateOptimalPoolSize(),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        // Prepared Statement 缓存
        preparedStatementCacheQueries: 256,
      },
    }),
    inject: [ConfigService],
  };
}
