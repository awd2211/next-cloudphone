import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitMiddleware, IPBlacklistMiddleware, AutoBanMiddleware } from '../rate-limit.middleware';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let mockRedis: jest.Mocked<Redis>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    // 创建 Mock Redis 实例
    mockRedis = {
      pipeline: jest.fn(() => ({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 0],
          [null, 5], // 当前计数
          [null, 1],
        ]),
      })),
      ttl: jest.fn().mockResolvedValue(60),
      zcard: jest.fn().mockResolvedValue(5),
      on: jest.fn(),
      quit: jest.fn(),
    } as any;

    (Redis as any).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                RATE_LIMIT_ENABLED: true,
                RATE_LIMIT_DEFAULT: 100,
                RATE_LIMIT_WINDOW: 60,
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);

    // Mock Request
    mockRequest = {
      ip: '127.0.0.1',
      path: '/api/devices',
      headers: {},
    } as any;

    // Mock Response
    mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常流量', () => {
    it('应该允许低于限制的请求通过', async () => {
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });

    it('应该正确设置速率限制头', async () => {
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });
  });

  describe('超过限制', () => {
    beforeEach(() => {
      // Mock 超过限制的情况
      mockRedis.pipeline = jest.fn(() => ({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 0],
          [null, 101], // 超过限制
          [null, 1],
        ]),
      })) as any;
    });

    it('应该拒绝超过限制的请求', async () => {
      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
      ).rejects.toThrow(HttpException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 429 状态码', async () => {
      try {
        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('应该设置 Retry-After 头', async () => {
      try {
        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      }
    });
  });

  describe('IP 识别', () => {
    it('应该从 X-Forwarded-For 头获取 IP', async () => {
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1',
      };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证使用了正确的 IP (第一个)
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('应该从 X-Real-IP 头获取 IP', async () => {
      mockRequest.headers = {
        'x-real-ip': '203.0.113.1',
      };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('应该回退到 req.ip', async () => {
      mockRequest.ip = '127.0.0.1';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('路径标准化', () => {
    it('应该将 UUID 替换为 :id', async () => {
      mockRequest.path = '/api/devices/123e4567-e89b-12d3-a456-426614174000';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // 路径应该被标准化为 /api/devices/:id
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该将数字 ID 替换为 :id', async () => {
      mockRequest.path = '/api/devices/12345';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该移除查询字符串', async () => {
      mockRequest.path = '/api/devices?page=1&limit=10';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Redis 错误处理', () => {
    it('应该在 Redis 错误时允许请求通过', async () => {
      mockRedis.pipeline = jest.fn(() => {
        throw new Error('Redis connection error');
      }) as any;

      // 不应该抛出异常
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('IPBlacklistMiddleware', () => {
  let middleware: IPBlacklistMiddleware;
  let mockRedis: jest.Mocked<Redis>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    mockRedis = {
      sismember: jest.fn().mockResolvedValue(0), // 默认不在黑名单
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      quit: jest.fn(),
    } as any;

    (Redis as any).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IPBlacklistMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                IP_BLACKLIST_ENABLED: true,
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<IPBlacklistMiddleware>(IPBlacklistMiddleware);

    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    } as any;

    mockResponse = {} as any;
    mockNext = jest.fn();
  });

  it('应该允许未被封禁的 IP 通过', async () => {
    await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedis.sismember).toHaveBeenCalledWith('ips', '127.0.0.1');
  });

  it('应该阻止被封禁的 IP', async () => {
    mockRedis.sismember = jest.fn().mockResolvedValue(1); // 在黑名单中

    await expect(
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
    ).rejects.toThrow(HttpException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('应该能够添加 IP 到黑名单', async () => {
    await middleware.addToBlacklist('203.0.113.1');

    expect(mockRedis.sadd).toHaveBeenCalledWith('ips', '203.0.113.1');
  });

  it('应该能够从黑名单移除 IP', async () => {
    await middleware.removeFromBlacklist('203.0.113.1');

    expect(mockRedis.srem).toHaveBeenCalledWith('ips', '203.0.113.1');
  });

  it('应该在 Redis 错误时允许请求通过', async () => {
    mockRedis.sismember = jest.fn().mockRejectedValue(new Error('Redis error'));

    await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('AutoBanMiddleware', () => {
  let middleware: AutoBanMiddleware;
  let mockRedis: jest.Mocked<Redis>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    mockRedis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      quit: jest.fn(),
    } as any;

    (Redis as any).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoBanMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                AUTO_BAN_ENABLED: true,
                AUTO_BAN_MAX_FAILURES: 10,
                AUTO_BAN_DURATION: 3600,
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<AutoBanMiddleware>(AutoBanMiddleware);

    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    } as any;

    mockResponse = {
      send: jest.fn(),
      statusCode: 200,
    } as any;

    mockNext = jest.fn();
  });

  it('应该允许正常请求通过', async () => {
    await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('应该记录失败请求', async () => {
    mockResponse.statusCode = 401;

    await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // 触发响应
    (mockResponse.send as jest.Mock).mock.calls[0][0];

    // 等待异步操作
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockRedis.incr).toHaveBeenCalled();
  });

  it('应该在达到阈值时自动封禁', async () => {
    mockRedis.incr = jest.fn().mockResolvedValue(10); // 达到阈值
    mockResponse.statusCode = 401;

    await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // 触发响应
    (mockResponse.send as jest.Mock).mock.calls[0][0];

    // 等待异步操作
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockRedis.sadd).toHaveBeenCalledWith('banned', '127.0.0.1');
  });
});
