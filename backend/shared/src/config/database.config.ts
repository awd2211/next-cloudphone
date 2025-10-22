import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

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
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
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
      logging: options.logging ?? (configService.get<string>('NODE_ENV') === 'development'),
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
      },
    }),
    inject: [ConfigService],
  };
}
