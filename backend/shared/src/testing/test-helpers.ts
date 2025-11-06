/**
 * Cloud Phone Platform - Test Helpers
 *
 * 统一的测试辅助函数库,用于简化测试编写
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { MockJwtStrategy } from './mock-jwt-strategy';

/**
 * 创建测试应用实例
 *
 * @param moduleMetadata - NestJS 模块元数据
 * @param options - 可选配置
 * @returns 配置好的 NestApplication
 */
export async function createTestApp(
  moduleMetadata: any,
  options?: {
    disableAuth?: boolean; // 是否禁用认证（默认启用 mock 认证）
    mockGuards?: boolean; // 是否 mock 所有 guards（默认 true）
  }
): Promise<INestApplication> {
  // 自动添加 PassportModule, JwtModule 和 MockJwtStrategy
  const imports = moduleMetadata.imports || [];
  const providers = moduleMetadata.providers || [];

  // 如果没有禁用认证，自动添加认证相关模块
  if (!options?.disableAuth) {
    // 添加 PassportModule
    if (!imports.some((m: any) => m === PassportModule || m?.module === PassportModule)) {
      imports.push(PassportModule.register({ defaultStrategy: 'jwt' }));
    }

    // 添加 JwtModule
    if (!imports.some((m: any) => m?.module?.name === 'JwtModule')) {
      imports.push(
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        })
      );
    }

    // 添加 MockJwtStrategy
    if (!providers.some((p: any) => p === MockJwtStrategy || p?.useClass === MockJwtStrategy)) {
      providers.push(MockJwtStrategy);
    }
  }

  const testingModuleBuilder = Test.createTestingModule({
    ...moduleMetadata,
    imports,
    providers,
  });

  // Mock common guards if enabled (默认启用)
  const shouldMockGuards = options?.mockGuards !== false;
  if (shouldMockGuards) {
    // 尝试 override 常见的 guards
    // 注意：只有当这些 guards 在模块中存在时才会生效
    const mockGuardValue = { canActivate: jest.fn(() => true) };

    // 尝试查找并 override 各种可能的 guard 类名
    const guardClassNames = [
      'PermissionsGuard',
      'RolesGuard',
      'DataScopeGuard',
      'ThrottlerGuard',
      'EnhancedPermissionsGuard',
    ];

    // 由于我们无法在这里直接访问 guard 类，我们将在 compile 后进行 override
    // 这里只是记录需要 override 的 guard 名称
  }

  const moduleFixture: TestingModule = await testingModuleBuilder.compile();

  const app = moduleFixture.createNestApplication();

  // 全局配置 ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  await app.init();

  return app;
}

/**
 * 生成测试用 JWT Token
 *
 * @param payload - JWT 载荷
 * @param secret - JWT 密钥 (默认: test-secret)
 * @returns JWT Token 字符串
 */
export function generateTestJwt(
  payload: {
    sub: string;
    username: string;
    email: string;
    roles?: string[];
    permissions?: string[];
    tenantId?: string;
  },
  secret: string = 'test-secret'
): string {
  const jwtService = new JwtService({ secret });
  return jwtService.sign(payload);
}

/**
 * 创建认证 Token (简化版，用于快速生成测试token)
 *
 * @param roles - 角色列表 (可选)
 * @param permissions - 权限列表 (可选)
 * @returns JWT Token 字符串
 */
export function createAuthToken(roles: string[] = [], permissions: string[] = []): string {
  return generateTestJwt({
    sub: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    roles,
    permissions,
    tenantId: 'test-tenant-id',
  });
}

/**
 * Mock 认证守卫 (允许所有请求通过)
 * 注意: 仅在测试环境中使用
 */
export const createMockAuthGuard = () => {
  if (typeof jest === 'undefined') {
    throw new Error('createMockAuthGuard() can only be used in test environment with Jest');
  }
  return {
    canActivate: jest.fn(() => true),
  };
};

/**
 * Mock 角色守卫 (允许所有请求通过)
 * 注意: 仅在测试环境中使用
 */
export const createMockRolesGuard = () => {
  if (typeof jest === 'undefined') {
    throw new Error('createMockRolesGuard() can only be used in test environment with Jest');
  }
  return {
    canActivate: jest.fn(() => true),
  };
};

/**
 * @deprecated Use createMockAuthGuard() instead
 * This export is kept for backward compatibility but should not be used
 */
export const mockAuthGuard =
  typeof jest !== 'undefined'
    ? {
        canActivate: jest.fn(() => true),
      }
    : {
        canActivate: () => true,
      };

/**
 * @deprecated Use createMockRolesGuard() instead
 * This export is kept for backward compatibility but should not be used
 */
export const mockRolesGuard =
  typeof jest !== 'undefined'
    ? {
        canActivate: jest.fn(() => true),
      }
    : {
        canActivate: () => true,
      };

/**
 * 生成服务间认证 Token
 *
 * @param serviceName - 服务名称
 * @param secret - Service JWT 密钥
 * @returns Service JWT Token
 */
export function generateServiceToken(
  serviceName: string,
  secret: string = 'test-service-secret'
): string {
  const jwtService = new JwtService({ secret });
  return jwtService.sign(
    {
      service: serviceName,
      type: 'service',
    },
    { expiresIn: '1h' }
  );
}

/**
 * 创建带认证的请求
 *
 * @param app - NestApplication
 * @param method - HTTP 方法
 * @param path - 请求路径
 * @param token - JWT Token
 * @returns SuperTest Request
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string
) {
  const server = app.getHttpServer();
  const req = request(server);

  let testRequest;
  switch (method) {
    case 'get':
      testRequest = req.get(path);
      break;
    case 'post':
      testRequest = req.post(path);
      break;
    case 'put':
      testRequest = req.put(path);
      break;
    case 'patch':
      testRequest = req.patch(path);
      break;
    case 'delete':
      testRequest = req.delete(path);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return testRequest.set('Authorization', `Bearer ${token}`);
}

/**
 * 断言 HTTP 响应结构
 */
export const assertHttpResponse = {
  /**
   * 断言成功响应
   */
  success(response: any, statusCode: number = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toBeDefined();
  },

  /**
   * 断言错误响应
   */
  error(response: any, statusCode: number, message?: string) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('message');
    if (message) {
      expect(response.body.message).toContain(message);
    }
  },

  /**
   * 断言分页响应
   */
  paginated(response: any) {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(Array.isArray(response.body.data)).toBe(true);
  },

  /**
   * 断言创建成功响应
   */
  created(response: any, idKey: string = 'id') {
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(idKey);
    expect(response.body[idKey]).toBeDefined();
  },
};

/**
 * 等待指定时间 (用于异步操作测试)
 *
 * @param ms - 毫秒数
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 重试函数 (用于测试最终一致性场景)
 *
 * @param fn - 要重试的函数
 * @param maxAttempts - 最大尝试次数
 * @param delay - 重试间隔 (毫秒)
 */
export async function retryUntil(
  fn: () => Promise<boolean>,
  maxAttempts: number = 10,
  delay: number = 100
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await fn()) {
      return;
    }
    await sleep(delay);
  }
  throw new Error('Retry timeout: condition not met');
}

/**
 * 清理数据库表数据 (用于测试前清理)
 *
 * @param repository - TypeORM Repository
 */
export async function clearRepository(repository: any): Promise<void> {
  await repository.query(
    `TRUNCATE TABLE "${repository.metadata.tableName}" RESTART IDENTITY CASCADE`
  );
}

/**
 * 模拟 RabbitMQ 消息
 */
export function mockRabbitMQMessage<T>(payload: T) {
  return {
    fields: {
      consumerTag: 'test-consumer',
      deliveryTag: 1,
      redelivered: false,
      exchange: 'cloudphone.events',
      routingKey: 'test.event',
    },
    properties: {
      contentType: 'application/json',
      contentEncoding: 'utf-8',
      headers: {},
      deliveryMode: 2,
      priority: 0,
      correlationId: null,
      replyTo: null,
      expiration: null,
      messageId: null,
      timestamp: Date.now(),
      type: null,
      userId: null,
      appId: null,
    },
    content: Buffer.from(JSON.stringify(payload)),
  };
}

/**
 * 断言事件已发布
 *
 * @param eventBusMock - EventBusService 的 Mock
 * @param eventType - 事件类型
 * @param expectedPayload - 期望的载荷 (可选)
 */
export function assertEventPublished(eventBusMock: any, eventType: string, expectedPayload?: any) {
  expect(eventBusMock.publish).toHaveBeenCalled();

  const calls = eventBusMock.publish.mock.calls;
  const matchingCall = calls.find((call: any) => call[1] === eventType);

  expect(matchingCall).toBeDefined();

  if (expectedPayload) {
    expect(matchingCall[2]).toMatchObject(expectedPayload);
  }
}

/**
 * 创建分页查询参数
 */
export function createPaginationParams(
  page: number = 1,
  limit: number = 10,
  additionalParams?: Record<string, any>
) {
  return {
    page,
    limit,
    ...additionalParams,
  };
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

/**
 * 生成随机 UUID (v4 格式)
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成随机邮箱
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

/**
 * 时间匹配器 (Jest matcher)
 * 检查时间是否在指定范围内 (±5秒)
 */
export function toBeRecentDate(received: Date | string) {
  const receivedDate = new Date(received);
  const now = new Date();
  const diff = Math.abs(now.getTime() - receivedDate.getTime());
  const maxDiff = 5000; // 5 seconds

  return {
    pass: diff < maxDiff,
    message: () => `Expected date to be recent (within ${maxDiff}ms), but difference was ${diff}ms`,
  };
}

// 扩展 Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeRecentDate(): R;
    }
  }
}

/**
 * 数据库连接测试辅助
 */
export class DatabaseTestHelper {
  /**
   * 等待数据库连接就绪
   */
  static async waitForConnection(dataSource: any, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await dataSource.query('SELECT 1');
        return;
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await sleep(500);
      }
    }
  }

  /**
   * 清理所有表数据 (用于集成测试)
   */
  static async clearAllTables(dataSource: any): Promise<void> {
    const tables = await dataSource.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const { tablename } of tables) {
      if (tablename !== 'migrations') {
        await dataSource.query(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`);
      }
    }
  }
}

/**
 * Redis 测试辅助
 */
export class RedisTestHelper {
  /**
   * 清理 Redis 测试键
   */
  static async clearTestKeys(redis: any, pattern: string = 'test:*'): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * 等待 Redis 键存在
   */
  static async waitForKey(redis: any, key: string, maxAttempts: number = 10): Promise<void> {
    await retryUntil(async () => {
      const exists = await redis.exists(key);
      return exists === 1;
    }, maxAttempts);
  }
}
