import {
  createLoggerConfig,
  createAppLogger,
  shouldSampleLog,
} from './logger.config';

describe('Logger Config', () => {
  // Save original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createLoggerConfig', () => {
    it('应该创建基本的日志配置', () => {
      // Arrange
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config).toBeDefined();
      expect(config.pinoHttp).toBeDefined();
      expect(config.pinoHttp.level).toBeDefined();
    });

    it('应该在生产环境使用 info 级别', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.level).toBe('info');
    });

    it('应该在开发环境使用 debug 级别', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.level).toBe('debug');
    });

    it('应该使用自定义 LOG_LEVEL 环境变量', () => {
      // Arrange
      process.env.LOG_LEVEL = 'warn';
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.level).toBe('warn');
    });

    it('应该在开发环境配置 pino-pretty transport', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.transport).toBeDefined();
      expect(config.pinoHttp.transport.target).toBe('pino-pretty');
      expect(config.pinoHttp.transport.options).toMatchObject({
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      });
    });

    it('应该在生产环境不使用 transport', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.transport).toBeUndefined();
    });

    it('应该配置请求序列化器', () => {
      // Arrange
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.serializers).toBeDefined();
      expect(config.pinoHttp.serializers.req).toBeInstanceOf(Function);
      expect(config.pinoHttp.serializers.res).toBeInstanceOf(Function);
      expect(config.pinoHttp.serializers.err).toBeInstanceOf(Function);
    });

    it('应该脱敏请求中的敏感字段', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = {
        id: 'req-123',
        method: 'POST',
        url: '/api/users',
        query: {
          password: 'secret123',
          username: 'john',
        },
        params: {},
        headers: {
          host: 'localhost',
          authorization: 'Bearer token123',
        },
      };

      // Act
      const serialized = config.pinoHttp.serializers.req(mockReq);

      // Assert
      expect(serialized.query.password).toContain('***'); // Password redacted
      expect(serialized.query.username).toBe('john'); // Username not redacted
      expect(serialized.headers.authorization).toBe('Bearer ***'); // Token redacted
    });

    it('应该配置响应序列化器', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockRes = {
        statusCode: 200,
        getHeader: jest.fn((name) => {
          if (name === 'content-type') return 'application/json';
          if (name === 'content-length') return '1234';
          return undefined;
        }),
      };

      // Act
      const serialized = config.pinoHttp.serializers.res(mockRes);

      // Assert
      expect(serialized.statusCode).toBe(200);
      expect(serialized.headers['content-type']).toBe('application/json');
      expect(serialized.headers['content-length']).toBe('1234');
    });

    it('应该配置错误序列化器', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockError = new Error('Test error');
      mockError.stack = 'Error stack trace...';

      // Act
      const serialized = config.pinoHttp.serializers.err(mockError);

      // Assert
      expect(serialized.message).toBe('Test error');
      expect(serialized.stack).toBe('Error stack trace...'); // Included in dev
    });

    it('应该在生产环境隐藏错误堆栈', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockError = new Error('Test error');
      mockError.stack = 'Error stack trace...';

      // Act
      const serialized = config.pinoHttp.serializers.err(mockError);

      // Assert
      expect(serialized.message).toBe('Test error');
      expect(serialized.stack).toBeUndefined(); // Hidden in production
    });

    it('应该添加自定义属性到每条日志', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = {
        id: 'req-123',
        headers: {
          'x-tenant-id': 'tenant-456',
        },
        user: {
          id: 'user-789',
          role: 'admin',
        },
      };

      // Act
      const customProps = config.pinoHttp.customProps(mockReq);

      // Assert
      expect(customProps.service).toBe('test-service');
      expect(customProps.environment).toBeDefined();
      expect(customProps.requestId).toBeDefined();
      expect(customProps.userId).toBe('user-789');
      expect(customProps.userRole).toBe('admin');
      expect(customProps.tenantId).toBe('tenant-456');
    });

    it('应该根据状态码返回正确的日志级别', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      // Act & Assert
      expect(config.pinoHttp.customLogLevel({}, { statusCode: 200 }, null)).toBe('info');
      expect(config.pinoHttp.customLogLevel({}, { statusCode: 404 }, null)).toBe('warn');
      expect(config.pinoHttp.customLogLevel({}, { statusCode: 500 }, null)).toBe('error');
      expect(config.pinoHttp.customLogLevel({}, { statusCode: 200 }, new Error())).toBe('error');
    });

    it('应该自定义成功消息格式', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = { method: 'GET', url: '/api/users' };
      const mockRes = { statusCode: 200 };

      // Act
      const message = config.pinoHttp.customSuccessMessage(mockReq, mockRes);

      // Assert
      expect(message).toBe('GET /api/users 200');
    });

    it('应该自定义错误消息格式', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = { method: 'POST', url: '/api/users' };
      const mockRes = { statusCode: 500 };
      const mockErr = { message: 'Internal error' };

      // Act
      const message = config.pinoHttp.customErrorMessage(mockReq, mockRes, mockErr);

      // Assert
      expect(message).toBe('POST /api/users 500 - Internal error');
    });

    it('应该忽略健康检查端点', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      // Act
      const shouldIgnoreHealth = config.pinoHttp.autoLogging.ignore({ url: '/health' });
      const shouldIgnoreMetrics = config.pinoHttp.autoLogging.ignore({ url: '/metrics' });
      const shouldNotIgnoreApi = config.pinoHttp.autoLogging.ignore({ url: '/api/users' });

      // Assert
      expect(shouldIgnoreHealth).toBe(true);
      expect(shouldIgnoreMetrics).toBe(true);
      expect(shouldNotIgnoreApi).toBe(false);
    });

    it('应该在生产环境配置 redact 路径', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.redact).toBeDefined();
      expect(config.pinoHttp.redact.paths).toContain('req.headers.authorization');
      expect(config.pinoHttp.redact.paths).toContain('req.headers.cookie');
      expect(config.pinoHttp.redact.censor).toBe('***REDACTED***');
    });

    it('应该配置自定义属性键', () => {
      // Arrange
      const serviceName = 'test-service';

      // Act
      const config = createLoggerConfig(serviceName);

      // Assert
      expect(config.pinoHttp.customAttributeKeys).toMatchObject({
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration',
      });
    });
  });

  describe('createAppLogger', () => {
    it('应该创建应用日志记录器', () => {
      // Arrange
      const serviceName = 'test-service';

      // Act
      const logger = createAppLogger(serviceName);

      // Assert
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('应该在生产环境使用 JSON 格式', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const serviceName = 'test-service';

      // Act
      const logger = createAppLogger(serviceName);

      // Assert
      expect(logger).toBeDefined();
      // In production, transport should not be configured
    });
  });

  describe('shouldSampleLog', () => {
    it('应该在开发环境始终返回 true', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act & Assert
      expect(shouldSampleLog(0.1)).toBe(true);
      expect(shouldSampleLog(0.5)).toBe(true);
      expect(shouldSampleLog(0.9)).toBe(true);
    });

    it('应该在生产环境但未启用采样时返回 true', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.LOG_SAMPLING = 'false';

      // Act & Assert
      expect(shouldSampleLog(0.1)).toBe(true);
    });

    it('应该在生产环境且启用采样时按概率返回', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.LOG_SAMPLING = 'true';

      // Mock Math.random
      const mockMath = Object.create(global.Math);
      mockMath.random = jest.fn();
      global.Math = mockMath;

      // Act - Test sampling rate 0.5
      mockMath.random.mockReturnValue(0.3); // < 0.5
      expect(shouldSampleLog(0.5)).toBe(true);

      mockMath.random.mockReturnValue(0.7); // > 0.5
      expect(shouldSampleLog(0.5)).toBe(false);
    });
  });

  describe('敏感信息脱敏', () => {
    it('应该脱敏密码字段', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = {
        id: 'req-123',
        method: 'POST',
        url: '/api/auth/login',
        query: {
          password: 'super-secret-password-123',
          email: 'user@example.com',
        },
        params: {},
        headers: {},
      };

      // Act
      const serialized = config.pinoHttp.serializers.req(mockReq);

      // Assert
      expect(serialized.query.password).toMatch(/sup\*\*\*/);
      expect(serialized.query.email).toBe('user@example.com');
    });

    it('应该脱敏 token 字段', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = {
        id: 'req-123',
        method: 'GET',
        url: '/api/users',
        query: {
          accessToken: 'abc123def456ghi789',
          userId: '123',
        },
        params: {},
        headers: {},
      };

      // Act
      const serialized = config.pinoHttp.serializers.req(mockReq);

      // Assert
      expect(serialized.query.accessToken).toMatch(/abc\*\*\*/);
      expect(serialized.query.userId).toBe('123');
    });

    it('应该脱敏 Authorization 头', () => {
      // Arrange
      const serviceName = 'test-service';
      const config = createLoggerConfig(serviceName);

      const mockReq = {
        id: 'req-123',
        method: 'GET',
        url: '/api/users',
        query: {},
        params: {},
        headers: {
          host: 'localhost',
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      };

      // Act
      const serialized = config.pinoHttp.serializers.req(mockReq);

      // Assert
      expect(serialized.headers.authorization).toBe('Bearer ***');
    });
  });
});
