import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// 全局测试配置
beforeAll(() => {
  console.log('🚀 Starting integration tests...');
  console.log(`📦 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`📦 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  console.log(`📦 RabbitMQ: ${process.env.RABBITMQ_URL?.split('@')[1]}`);
});

afterAll(() => {
  console.log('✅ Integration tests completed');
});

// 增加Jest超时时间
jest.setTimeout(30000);
