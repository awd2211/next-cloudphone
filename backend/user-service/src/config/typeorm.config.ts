import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { join } from 'path';

// 加载环境变量(用于 CLI)
dotenv.config();

/**
 * 创建 TypeORM 配置
 * 用于 NestJS 模块
 */
export const createTypeOrmConfig = (configService: ConfigService): DataSourceOptions => {
  return {
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
    migrationsTableName: 'migrations_history',
    migrationsRun: false, // 不自动运行,手动控制
    synchronize: false, // 生产环境必须为 false
    logging:
      configService.get('NODE_ENV') === 'development' ? ['error', 'warn', 'migration'] : ['error'],
    logger: 'advanced-console',
  };
};

/**
 * DataSource 配置
 * 用于 TypeORM CLI 命令
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'cloudphone_user',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations_history',
  logging: ['error', 'warn', 'migration'],
  logger: 'advanced-console',
});
