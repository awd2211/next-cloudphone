import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// 加载环境变量 - 明确指定 .env 文件路径
config({ path: join(__dirname, '../../.env'), override: true });

/**
 * TypeORM CLI 配置
 * 用于运行迁移命令: migration:generate, migration:run 等
 */
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'cloudphone_app',

  // Entity 路径
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],

  // 迁移文件路径
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],

  // 迁移历史表名
  migrationsTableName: 'typeorm_migrations',

  // 不自动运行迁移
  migrationsRun: false,

  // 禁用自动同步(生产环境必须)
  synchronize: false,

  // 日志级别
  logging: ['error', 'warn', 'migration'],
};

// 导出 DataSource 实例
const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
