import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  SqlInjectionGuard,
  StrictSqlInjectionGuard,
  SqlInjectionSeverity,
} from '../sql-injection-guard';

describe('SqlInjectionGuard', () => {
  let guard: SqlInjectionGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new SqlInjectionGuard(reflector);

    mockRequest = {
      method: 'POST',
      url: '/api/users',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      query: {},
      body: {},
      params: {},
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as Request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  });

  describe('正常输入', () => {
    it('应该允许干净的查询参数通过', () => {
      mockRequest.query = { name: 'John', age: '25' };

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('应该允许干净的请求体通过', () => {
      mockRequest.body = {
        username: 'john_doe',
        email: 'john@example.com',
        description: 'I am a developer',
      };

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('应该允许包含单引号的正常文本', () => {
      mockRequest.body = { name: "O'Brien" };

      // 单引号本身不应触发严重警告（低风险）
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('SQL DML 语句检测', () => {
    it('应该检测 SELECT 语句', () => {
      mockRequest.query = { search: 'SELECT * FROM users' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 INSERT 语句', () => {
      mockRequest.body = { data: "INSERT INTO users VALUES ('admin', 'password')" };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 UPDATE 语句', () => {
      mockRequest.body = { query: 'UPDATE users SET role = admin WHERE id = 1' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 DELETE 语句', () => {
      mockRequest.body = { cmd: 'DELETE FROM users WHERE id = 1' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('SQL DDL 语句检测', () => {
    it('应该检测 DROP TABLE', () => {
      mockRequest.body = { query: 'DROP TABLE users' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 CREATE TABLE', () => {
      mockRequest.body = { query: 'CREATE TABLE hackers (id INT)' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 ALTER TABLE', () => {
      mockRequest.body = { query: 'ALTER TABLE users ADD COLUMN hacked INT' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('UNION 注入检测', () => {
    it('应该检测 UNION SELECT 攻击', () => {
      mockRequest.query = { id: '1 UNION SELECT password FROM admin' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('布尔盲注检测', () => {
    it('应该检测 OR 1=1 模式', () => {
      mockRequest.body = { username: "admin' OR 1=1--" };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 AND 1=1 模式', () => {
      mockRequest.body = { username: "admin' AND 1=1--" };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('时间盲注检测', () => {
    it('应该检测 SLEEP 函数', () => {
      mockRequest.body = { query: 'SELECT * FROM users WHERE id = 1 AND SLEEP(5)' };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 BENCHMARK 函数', () => {
      mockRequest.body = {
        query: "SELECT * FROM users WHERE id = 1 AND BENCHMARK(1000000, MD5('test'))",
      };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('SQL 注释检测', () => {
    it('应该检测 -- 注释', () => {
      mockRequest.body = { username: "admin'--" };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测 /* */ 注释', () => {
      mockRequest.body = { username: "admin' /* comment */ OR 1=1" };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('存储过程检测', () => {
    it('应该检测 xp_ 存储过程', () => {
      mockRequest.body = { cmd: "xp_cmdshell('dir')" };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('严重程度级别', () => {
    it('应该在 HIGH 级别拒绝可疑请求', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(SqlInjectionSeverity.HIGH);
      mockRequest.body = { query: 'SELECT * FROM users' };

      expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
    });

    it('应该在 MEDIUM 级别标记但允许通过', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(SqlInjectionSeverity.MEDIUM);
      mockRequest.body = { query: 'SELECT * FROM users' };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect((mockRequest as any).sqlInjectionWarning).toBeDefined();
    });

    it('应该在 LOW 级别仅记录日志', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(SqlInjectionSeverity.LOW);
      mockRequest.body = { query: 'SELECT * FROM users' };

      const spy = jest.spyOn(guard['logger'], 'log');
      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('嵌套输入检测', () => {
    it('应该检测嵌套对象中的 SQL 注入', () => {
      mockRequest.body = {
        user: {
          profile: {
            bio: 'DROP TABLE users',
          },
        },
      };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测数组中的 SQL 注入', () => {
      mockRequest.body = {
        tags: ['normal', 'SELECT * FROM passwords', 'another'],
      };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('风险评分', () => {
    it('应该为高危查询分配高风险评分', () => {
      mockRequest.body = { query: 'DROP TABLE users; DELETE FROM admin' };

      const inputs = guard['extractAllInputs'](mockRequest as Request);
      const result = guard['detectSqlInjection'](inputs);

      expect(result.riskScore).toBeGreaterThan(70);
    });

    it('应该为低风险查询分配低风险评分', () => {
      mockRequest.body = { name: "O'Brien" };

      const inputs = guard['extractAllInputs'](mockRequest as Request);
      const result = guard['detectSqlInjection'](inputs);

      expect(result.riskScore).toBeLessThan(20);
    });
  });

  describe('Header 检测', () => {
    it('应该检测可疑的 User-Agent', () => {
      mockRequest.headers = {
        'user-agent': 'sqlmap/1.0 (http://sqlmap.org) SELECT * FROM users',
      };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });

    it('应该检测可疑的 X-Forwarded-For', () => {
      mockRequest.headers = {
        'x-forwarded-for': "127.0.0.1' OR 1=1--",
      };

      const spy = jest.spyOn(guard['logger'], 'warn');
      guard.canActivate(mockContext);

      expect(spy).toHaveBeenCalled();
    });
  });
});

describe('StrictSqlInjectionGuard', () => {
  let guard: StrictSqlInjectionGuard;
  let mockContext: ExecutionContext;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    const reflector = new Reflector();
    guard = new StrictSqlInjectionGuard(reflector);

    mockRequest = {
      method: 'POST',
      url: '/api/users',
      ip: '127.0.0.1',
      headers: {},
      query: {},
      body: {},
      params: {},
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as Request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  });

  it('应该拒绝任何风险评分 >= 20 的请求', () => {
    mockRequest.body = { query: 'SELECT * FROM users' };

    expect(() => guard.canActivate(mockContext)).toThrow(BadRequestException);
  });

  it('应该允许风险评分 < 20 的请求', () => {
    mockRequest.body = { name: 'John Doe' };

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
