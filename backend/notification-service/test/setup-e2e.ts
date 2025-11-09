/**
 * E2E 测试全局设置
 */

// 设置测试超时
jest.setTimeout(30000);

console.log('🚀 Starting E2E tests...');
console.log('📦 Test environment: E2E with real HTTP server');
console.log('📦 Database: PostgreSQL on port 5433');
console.log('📦 Redis: Redis on port 6380');
console.log('📦 RabbitMQ: RabbitMQ on port 5673');

afterAll(() => {
  console.log('✅ E2E tests completed');
});
