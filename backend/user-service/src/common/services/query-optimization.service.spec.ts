import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { QueryOptimizationService } from './query-optimization.service';

describe('QueryOptimizationService', () => {
  let service: QueryOptimizationService;
  let mockDataSource: any;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryOptimizationService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<QueryOptimizationService>(QueryOptimizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshAllMaterializedViews', () => {
    it('应该刷新所有物化视图', async () => {
      // Arrange
      const mockResults = [
        { view_name: 'mv_user_stats', refresh_time: '100ms', rows_affected: '1000' },
        { view_name: 'mv_user_activity', refresh_time: '200ms', rows_affected: '5000' },
      ];
      mockDataSource.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.refreshAllMaterializedViews();

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM refresh_all_materialized_views()',
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        viewName: 'mv_user_stats',
        refreshTime: '100ms',
        rowsAffected: 1000,
      });
      expect(result[1]).toEqual({
        viewName: 'mv_user_activity',
        refreshTime: '200ms',
        rowsAffected: 5000,
      });
    });

    it('应该在刷新失败时抛出错误', async () => {
      // Arrange
      mockDataSource.query.mockRejectedValue(new Error('Refresh failed'));

      // Act & Assert
      await expect(service.refreshAllMaterializedViews()).rejects.toThrow(
        'Refresh failed',
      );
    });
  });

  describe('refreshMaterializedView', () => {
    it('应该刷新指定的物化视图', async () => {
      // Arrange
      const viewName = 'mv_user_stats';
      mockDataSource.query.mockResolvedValue(null);

      // Act
      await service.refreshMaterializedView(viewName);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT refresh_materialized_view($1)',
        [viewName],
      );
    });

    it('应该在刷新失败时抛出错误', async () => {
      // Arrange
      const viewName = 'mv_user_stats';
      mockDataSource.query.mockRejectedValue(new Error('View not found'));

      // Act & Assert
      await expect(service.refreshMaterializedView(viewName)).rejects.toThrow(
        'View not found',
      );
    });
  });

  describe('getMaterializedViewStatus', () => {
    it('应该获取所有物化视图状态', async () => {
      // Arrange
      const mockResults = [
        {
          view_name: 'mv_user_stats',
          last_refreshed: '2025-10-30T10:00:00Z',
          is_stale: false,
          row_count: '1000',
          size: '10 MB',
        },
        {
          view_name: 'mv_user_activity',
          last_refreshed: '2025-10-29T10:00:00Z',
          is_stale: true,
          row_count: '5000',
          size: '50 MB',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.getMaterializedViewStatus();

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM get_materialized_view_status()',
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        viewName: 'mv_user_stats',
        isStale: false,
        rowCount: 1000,
        size: '10 MB',
      });
      expect(result[1]).toMatchObject({
        viewName: 'mv_user_activity',
        isStale: true,
        rowCount: 5000,
        size: '50 MB',
      });
    });

    it('应该在查询失败时抛出错误', async () => {
      // Arrange
      mockDataSource.query.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(service.getMaterializedViewStatus()).rejects.toThrow(
        'Query failed',
      );
    });
  });

  describe('getUserStats', () => {
    it('应该获取用户统计信息', async () => {
      // Arrange
      const mockResult = [
        {
          total_users: '1000',
          active_users: '800',
          inactive_users: '150',
          suspended_users: '30',
          locked_users: '20',
          super_admin_count: '5',
          active_last_7_days: '600',
          active_last_30_days: '850',
          new_users_last_7_days: '50',
          new_users_last_30_days: '200',
          last_refreshed: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      // Act
      const result = await service.getUserStats();

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM mv_user_stats LIMIT 1',
      );
      expect(result).toMatchObject({
        totalUsers: 1000,
        activeUsers: 800,
        inactiveUsers: 150,
        suspendedUsers: 30,
        lockedUsers: 20,
        superAdminCount: 5,
        activeLast7Days: 600,
        activeLast30Days: 850,
        newUsersLast7Days: 50,
        newUsersLast30Days: 200,
      });
      expect(result.lastRefreshed).toBeInstanceOf(Date);
    });

    it('应该在视图为空时抛出错误', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getUserStats()).rejects.toThrow(
        '用户统计物化视图为空',
      );
    });
  });

  describe('getUserStatsByTenant', () => {
    it('应该获取指定租户的统计', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const mockResult = [
        {
          tenant_id: tenantId,
          total_users: '100',
          active_users: '80',
          inactive_users: '15',
          suspended_users: '3',
          locked_users: '2',
          active_last_7_days: '60',
          active_last_30_days: '85',
          last_activity: '2025-10-30T10:00:00Z',
          first_user_created_at: '2025-01-01T00:00:00Z',
          last_user_created_at: '2025-10-30T09:00:00Z',
          last_refreshed: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      // Act
      const result = await service.getUserStatsByTenant(tenantId);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM mv_user_stats_by_tenant WHERE tenant_id = $1',
        [tenantId],
      );
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe(tenantId);
      expect(result[0].totalUsers).toBe(100);
    });

    it('应该获取所有租户统计（不指定tenant）', async () => {
      // Arrange
      const mockResults = [
        {
          tenant_id: 'tenant-1',
          total_users: '100',
          active_users: '80',
          inactive_users: '15',
          suspended_users: '3',
          locked_users: '2',
          active_last_7_days: '60',
          active_last_30_days: '85',
          last_activity: null,
          first_user_created_at: '2025-01-01T00:00:00Z',
          last_user_created_at: '2025-10-30T09:00:00Z',
          last_refreshed: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.getUserStatsByTenant();

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM mv_user_stats_by_tenant ORDER BY total_users DESC',
        [],
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getUserEventStats', () => {
    it('应该获取用户事件统计', async () => {
      // Arrange
      const mockResults = [
        {
          event_date: '2025-10-30',
          event_type: 'user_login',
          event_count: '150',
          unique_users: '100',
          last_refreshed: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.getUserEventStats();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('user_login');
      expect(result[0].eventCount).toBe(150);
      expect(result[0].uniqueUsers).toBe(100);
    });

    it('应该使用日期范围过滤', async () => {
      // Arrange
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-30');
      mockDataSource.query.mockResolvedValue([]);

      // Act
      await service.getUserEventStats(startDate, endDate);

      // Assert
      const query = mockDataSource.query.mock.calls[0][0];
      expect(query).toContain('event_date >= $1');
      expect(query).toContain('event_date <= $2');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [startDate, endDate],
      );
    });
  });

  describe('getUserActivity', () => {
    it('应该获取用户活跃度', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResult = [
        {
          user_id: userId,
          total_events: '500',
          first_event_at: '2025-01-01T00:00:00Z',
          last_event_at: '2025-10-30T10:00:00Z',
          unique_event_types: '10',
          events_last_7_days: '50',
          events_last_30_days: '200',
          last_refreshed: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      // Act
      const result = await service.getUserActivity(userId);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM mv_user_activity WHERE user_id = $1',
        [userId],
      );
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.totalEvents).toBe(500);
      expect(result?.uniqueEventTypes).toBe(10);
    });

    it('应该在用户无活动时返回null', async () => {
      // Arrange
      const userId = 'user-123';
      mockDataSource.query.mockResolvedValue([]);

      // Act
      const result = await service.getUserActivity(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getDailyUserStats', () => {
    it('应该获取每日用户统计', async () => {
      // Arrange
      const mockResults = [
        {
          stat_date: '2025-10-30',
          total_users: '1000',
          new_users: '10',
          active_users: '800',
          deleted_users: '5',
          active_users_7d: '850',
          active_users_30d: '900',
          login_count: '500',
          created_at: '2025-10-30T00:00:00Z',
          updated_at: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.getDailyUserStats(30);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalUsers).toBe(1000);
      expect(result[0].newUsers).toBe(10);
      expect(result[0].activeUsers).toBe(800);
    });

    it('应该使用默认天数30天', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      await service.getDailyUserStats();

      // Assert
      const query = mockDataSource.query.mock.calls[0][0];
      expect(query).toContain("INTERVAL '30 days'");
    });
  });

  describe('getHourlyEventStats', () => {
    it('应该获取每小时事件统计', async () => {
      // Arrange
      const mockResults = [
        {
          stat_hour: '2025-10-30T10:00:00Z',
          event_type: 'user_login',
          event_count: '50',
          unique_users: '40',
          created_at: '2025-10-30T10:00:00Z',
          updated_at: '2025-10-30T10:05:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResults);

      // Act
      const result = await service.getHourlyEventStats(24);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('user_login');
      expect(result[0].eventCount).toBe(50);
      expect(result[0].uniqueUsers).toBe(40);
    });
  });

  describe('getTenantQuotaStats', () => {
    it('应该获取指定租户的配额统计', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const mockResult = [
        {
          tenant_id: tenantId,
          total_users: '100',
          total_devices: '50',
          total_storage_bytes: '10737418240',
          last_activity_at: '2025-10-30T10:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-10-30T10:00:00Z',
        },
      ];
      mockDataSource.query.mockResolvedValue(mockResult);

      // Act
      const result = await service.getTenantQuotaStats(tenantId);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM tenant_quota_stats WHERE tenant_id = $1',
        [tenantId],
      );
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe(tenantId);
      expect(result[0].totalUsers).toBe(100);
      expect(result[0].totalDevices).toBe(50);
    });

    it('应该获取所有租户配额统计', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      await service.getTenantQuotaStats();

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM tenant_quota_stats ORDER BY total_users DESC',
        [],
      );
    });
  });

  describe('getOptimizationSummary', () => {
    it('应该获取查询优化总览', async () => {
      // Arrange
      const mockMVStatus = [
        {
          view_name: 'mv_user_stats',
          last_refreshed: new Date(),
          is_stale: false,
          row_count: 1000,
          size: '10 MB',
        },
        {
          view_name: 'mv_user_activity',
          last_refreshed: new Date(),
          is_stale: true,
          row_count: 5000,
          size: '50 MB',
        },
      ];

      mockDataSource.query
        .mockResolvedValueOnce(
          mockMVStatus.map((v) => ({
            view_name: v.view_name,
            last_refreshed: v.last_refreshed,
            is_stale: v.is_stale,
            row_count: String(v.row_count),
            size: v.size,
          })),
        )
        .mockResolvedValueOnce([{ count: '100' }]) // daily stats
        .mockResolvedValueOnce([{ count: '200' }]) // hourly stats
        .mockResolvedValueOnce([{ count: '50' }]); // tenant stats

      // Act
      const result = await service.getOptimizationSummary();

      // Assert
      expect(result.materializedViews).toMatchObject({
        total: 2,
        stale: 1,
        upToDate: 1,
      });
      expect(result.preComputedTables).toEqual({
        dailyStats: 100,
        hourlyStats: 200,
        tenantStats: 50,
      });
    });
  });

  describe('onModuleInit', () => {
    it('应该在启动时检查并刷新过期视图', async () => {
      // Arrange
      const mockMVStatus = [
        {
          view_name: 'mv_user_stats',
          last_refreshed: new Date(),
          is_stale: false,
          row_count: 1000,
          size: '10 MB',
        },
        {
          view_name: 'mv_user_activity',
          last_refreshed: new Date(),
          is_stale: true,
          row_count: 5000,
          size: '50 MB',
        },
      ];

      mockDataSource.query
        .mockResolvedValueOnce(
          mockMVStatus.map((v) => ({
            view_name: v.view_name,
            last_refreshed: v.last_refreshed,
            is_stale: v.is_stale,
            row_count: String(v.row_count),
            size: v.size,
          })),
        )
        .mockResolvedValueOnce([
          { view_name: 'mv_user_activity', refresh_time: '200ms', rows_affected: '5000' },
        ])
        .mockResolvedValueOnce(
          mockMVStatus.map((v) => ({
            view_name: v.view_name,
            last_refreshed: v.last_refreshed,
            is_stale: false,
            row_count: String(v.row_count),
            size: v.size,
          })),
        )
        .mockResolvedValueOnce([{ count: '100' }])
        .mockResolvedValueOnce([{ count: '200' }])
        .mockResolvedValueOnce([{ count: '50' }]);

      // Act
      await service.onModuleInit();

      // Assert
      // 应该调用 getMaterializedViewStatus
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM get_materialized_view_status()',
      );
      // 应该调用 refreshAllMaterializedViews（因为有过期视图）
      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SELECT * FROM refresh_all_materialized_views()',
      );
    });

    it('应该在初始化失败时不抛出错误', async () => {
      // Arrange
      mockDataSource.query.mockRejectedValue(new Error('Init failed'));

      // Act & Assert - 不应该抛出错误
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });
});
