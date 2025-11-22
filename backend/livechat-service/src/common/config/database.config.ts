import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_DATABASE', 'cloudphone_livechat'),
  entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
  // 连接池优化
  extra: {
    max: 20, // 最大连接数
    min: 5, // 最小连接数
    idleTimeoutMillis: 30000, // 空闲超时
    connectionTimeoutMillis: 10000, // 连接超时
    statement_timeout: 30000, // 查询超时
  },
  retryAttempts: 3,
  retryDelay: 3000,
});
