import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { createTestApp, generateTestJwt, assertHttpResponse } from '@cloudphone/shared/testing/test-helpers';
import { AuditAction, AuditLevel } from '../entities/audit-log.entity';

describe('AuditLogsController', () => {
  let app: INestApplication;
  let auditLogsService: AuditLogsService;

  const mockAuditLogsService = {
    getUserLogs: jest.fn(),
    getResourceLogs: jest.fn(),
    searchLogs: jest.fn(),
    getStatistics: jest.fn(),
  };

  // 创建审计日志mock数据的辅助函数
  const createMockAuditLog = (overrides = {}) => ({
    id: 'log-' + Math.random().toString(36).substr(2, 9),
    userId: 'user-123',
    action: AuditAction.USER_LOGIN,
    resourceType: 'user',
    resourceId: 'user-123',
    level: AuditLevel.INFO,
    message: 'User logged in successfully',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    success: true,
    metadata: {},
    timestamp: new Date(),
    ...overrides,
  });

  // 生成认证token的辅助函数
  const createAuthToken = (roles: string[] = ['user']) => {
    return generateTestJwt({
      sub: 'test-user-id',
      username: 'testuser',
      roles,
      permissions: ['audit.read'],
    });
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    app = await createTestApp(moduleRef);
    auditLogsService = moduleRef.get<AuditLogsService>(AuditLogsService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /audit-logs/user/:userId', () => {
    it('应该成功获取用户审计日志', async () => {
      // Arrange
      const mockLogs = [
        createMockAuditLog({ action: AuditAction.USER_LOGIN }),
        createMockAuditLog({ action: AuditAction.USER_LOGOUT }),
        createMockAuditLog({ action: AuditAction.USER_UPDATE }),
      ];
      mockAuditLogsService.getUserLogs.mockResolvedValue({
        data: mockLogs,
        total: 3,
        limit: 10,
        offset: 0,
      });
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/user/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(mockAuditLogsService.getUserLogs).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object)
      );
    });

    it('应该支持按操作类型过滤', async () => {
      // Arrange
      const mockLogs = [createMockAuditLog({ action: AuditAction.USER_LOGIN })];
      mockAuditLogsService.getUserLogs.mockResolvedValue({
        data: mockLogs,
        total: 1,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123?action=USER_LOGIN')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.getUserLogs).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          action: AuditAction.USER_LOGIN,
        })
      );
    });

    it('应该支持按资源类型过滤', async () => {
      // Arrange
      mockAuditLogsService.getUserLogs.mockResolvedValue({
        data: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123?resourceType=device')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.getUserLogs).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          resourceType: 'device',
        })
      );
    });

    it('应该支持日期范围过滤', async () => {
      // Arrange
      mockAuditLogsService.getUserLogs.mockResolvedValue({
        data: [],
        total: 0,
      });
      const token = createAuthToken();
      const startDate = '2025-01-01T00:00:00.000Z';
      const endDate = '2025-12-31T23:59:59.999Z';

      // Act
      await request(app.getHttpServer())
        .get(`/audit-logs/user/user-123?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.getUserLogs).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('应该支持分页参数', async () => {
      // Arrange
      mockAuditLogsService.getUserLogs.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 10,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123?limit=20&offset=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.getUserLogs).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          limit: 20,
          offset: 10,
        })
      );
    });

    it('应该在未认证时返回401', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123')
        .expect(401);
    });

    it('应该处理无效的日期格式', async () => {
      // Arrange
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123?startDate=invalid-date')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('应该返回空数组当没有日志时', async () => {
      // Arrange
      mockAuditLogsService.getUserLogs.mockResolvedValue({
        data: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/user/user-999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /audit-logs/resource/:resourceType/:resourceId', () => {
    it('应该成功获取资源审计日志', async () => {
      // Arrange
      const mockLogs = [
        createMockAuditLog({
          resourceType: 'device',
          resourceId: 'device-123',
          action: AuditAction.DEVICE_CREATE,
        }),
        createMockAuditLog({
          resourceType: 'device',
          resourceId: 'device-123',
          action: AuditAction.DEVICE_UPDATE,
        }),
      ];
      mockAuditLogsService.getResourceLogs.mockResolvedValue(mockLogs);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/resource/device/device-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(2);
      expect(mockAuditLogsService.getResourceLogs).toHaveBeenCalledWith(
        'device',
        'device-123',
        50 // 默认limit
      );
    });

    it('应该支持自定义limit参数', async () => {
      // Arrange
      mockAuditLogsService.getResourceLogs.mockResolvedValue([]);
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/resource/device/device-123?limit=100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.getResourceLogs).toHaveBeenCalledWith(
        'device',
        'device-123',
        100
      );
    });

    it('应该处理不同的资源类型', async () => {
      // Arrange
      mockAuditLogsService.getResourceLogs.mockResolvedValue([]);
      const token = createAuthToken();

      const resourceTypes = ['device', 'user', 'role', 'permission', 'quota'];

      // Act & Assert
      for (const resourceType of resourceTypes) {
        await request(app.getHttpServer())
          .get(`/audit-logs/resource/${resourceType}/resource-123`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(mockAuditLogsService.getResourceLogs).toHaveBeenCalledWith(
          resourceType,
          'resource-123',
          expect.any(Number)
        );
      }
    });

    it('应该在未认证时返回401', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/resource/device/device-123')
        .expect(401);
    });

    it('应该返回空数组当资源没有日志时', async () => {
      // Arrange
      mockAuditLogsService.getResourceLogs.mockResolvedValue([]);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/resource/device/nonexistent-device')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /audit-logs/search', () => {
    it('应该允许管理员搜索审计日志', async () => {
      // Arrange
      const mockLogs = [
        createMockAuditLog(),
        createMockAuditLog(),
      ];
      mockAuditLogsService.searchLogs.mockResolvedValue({
        data: mockLogs,
        total: 2,
      });
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/search')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalled();
    });

    it('应该拒绝非管理员用户访问', async () => {
      // Arrange
      const token = createAuthToken(['user']); // 非管理员

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      // Assert
      expect(mockAuditLogsService.searchLogs).not.toHaveBeenCalled();
    });

    it('应该支持按用户ID搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?userId=user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('应该支持按操作类型搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?action=USER_LOGIN')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_LOGIN,
        })
      );
    });

    it('应该支持按日志级别搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?level=ERROR')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          level: AuditLevel.ERROR,
        })
      );
    });

    it('应该支持按IP地址搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?ipAddress=192.168.1.1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
        })
      );
    });

    it('应该支持按成功状态搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?success=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('应该支持组合多个搜索条件', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?userId=user-123&action=USER_LOGIN&level=INFO&success=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: AuditAction.USER_LOGIN,
          level: AuditLevel.INFO,
          success: true,
        })
      );
    });

    it('应该支持日期范围搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);
      const startDate = '2025-01-01T00:00:00.000Z';
      const endDate = '2025-12-31T23:59:59.999Z';

      // Act
      await request(app.getHttpServer())
        .get(`/audit-logs/search?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('应该支持分页搜索', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({
        data: [],
        total: 0,
        limit: 50,
        offset: 100,
      });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?limit=50&offset=100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.searchLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 100,
        })
      );
    });
  });

  describe('GET /audit-logs/statistics', () => {
    it('应该允许管理员获取统计信息', async () => {
      // Arrange
      const mockStats = {
        totalLogs: 1000,
        byAction: {
          USER_LOGIN: 300,
          USER_LOGOUT: 250,
          DEVICE_CREATE: 150,
        },
        byLevel: {
          INFO: 700,
          WARN: 200,
          ERROR: 100,
        },
        successRate: 0.95,
        topUsers: [
          { userId: 'user-1', count: 50 },
          { userId: 'user-2', count: 40 },
        ],
        topIpAddresses: [
          { ipAddress: '192.168.1.1', count: 30 },
        ],
        dailyTrend: [],
      };
      mockAuditLogsService.getStatistics.mockResolvedValue(mockStats);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        totalLogs: 1000,
        byAction: expect.any(Object),
        byLevel: expect.any(Object),
        successRate: 0.95,
      });
      expect(mockAuditLogsService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('应该支持按用户ID获取统计', async () => {
      // Arrange
      const mockStats = {
        totalLogs: 50,
        byAction: { USER_LOGIN: 25, USER_LOGOUT: 25 },
      };
      mockAuditLogsService.getStatistics.mockResolvedValue(mockStats);
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/statistics?userId=user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockAuditLogsService.getStatistics).toHaveBeenCalledWith('user-123');
    });

    it('应该拒绝非管理员用户访问', async () => {
      // Arrange
      const token = createAuthToken(['user']); // 非管理员

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      // Assert
      expect(mockAuditLogsService.getStatistics).not.toHaveBeenCalled();
    });

    it('应该在未认证时返回401', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .expect(401);
    });

    it('应该返回空统计当没有日志时', async () => {
      // Arrange
      const emptyStats = {
        totalLogs: 0,
        byAction: {},
        byLevel: {},
        successRate: 0,
        topUsers: [],
        topIpAddresses: [],
      };
      mockAuditLogsService.getStatistics.mockResolvedValue(emptyStats);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.totalLogs).toBe(0);
    });
  });

  describe('安全性和边界情况', () => {
    it('应该要求所有端点都需要认证', async () => {
      // 测试所有端点都需要token
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123')
        .expect(401);

      await request(app.getHttpServer())
        .get('/audit-logs/resource/device/device-123')
        .expect(401);

      await request(app.getHttpServer())
        .get('/audit-logs/search')
        .expect(401);

      await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .expect(401);
    });

    it('应该强制管理员角色访问受保护的端点', async () => {
      const userToken = createAuthToken(['user']);

      await request(app.getHttpServer())
        .get('/audit-logs/search')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('应该验证userId格式防止路径遍历', async () => {
      // Arrange
      const maliciousUserId = '../../../etc/passwd';
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/audit-logs/user/${maliciousUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('应该处理非常大的分页参数', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?limit=999999&offset=999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('应该处理并发的日志查询请求', async () => {
      // Arrange
      mockAuditLogsService.getUserLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken();

      // Act - 发起多个并发请求
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/audit-logs/user/user-123')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);

      // Assert - 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('应该处理特殊字符在查询参数中', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?ipAddress=192.168.1.1&resourceType=device%2Fspecial')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('应该限制返回的日志数量防止内存溢出', async () => {
      // Arrange
      const token = createAuthToken();

      // Act - 尝试请求过多日志
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123?limit=100000')
        .set('Authorization', `Bearer ${token}`)
        .expect(400); // 应该拒绝过大的limit
    });

    it('应该验证日期范围的合理性', async () => {
      // Arrange
      const token = createAuthToken();
      const startDate = '2025-12-31T23:59:59.999Z';
      const endDate = '2025-01-01T00:00:00.000Z'; // 结束日期早于开始日期

      // Act
      await request(app.getHttpServer())
        .get(`/audit-logs/user/user-123?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('性能和优化', () => {
    it('应该在没有过滤条件时使用默认参数', async () => {
      // Arrange
      mockAuditLogsService.getUserLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/user/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert - 验证使用了默认参数
      expect(mockAuditLogsService.getUserLogs).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          limit: undefined, // 使用服务层默认值
          offset: undefined,
        })
      );
    });

    it('应该正确处理空字符串查询参数', async () => {
      // Arrange
      mockAuditLogsService.searchLogs.mockResolvedValue({ data: [], total: 0 });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get('/audit-logs/search?userId=&action=')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
