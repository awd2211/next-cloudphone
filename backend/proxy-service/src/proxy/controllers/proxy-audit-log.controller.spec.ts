import { Test, TestingModule } from '@nestjs/testing';
import { ProxyAuditLogController } from './proxy-audit-log.controller';
import { ProxyAuditLogService } from '../services/proxy-audit-log.service';
import {
  CreateAuditLogDto,
  QueryAuditLogDto,
  QuerySensitiveAuditLogDto,
  ExportAuditLogDto,
  ApproveSensitiveAccessDto,
} from '../dto';

describe('ProxyAuditLogController', () => {
  let controller: ProxyAuditLogController;
  let auditLogService: any;

  const mockAuditLogService = {
    createAuditLog: jest.fn(),
    queryAuditLogs: jest.fn(),
    getAuditLog: jest.fn(),
    querySensitiveAuditLogs: jest.fn(),
    getSensitiveAuditLogDetails: jest.fn(),
    approveSensitiveAccess: jest.fn(),
    getAuditLogStatistics: jest.fn(),
    analyzeUserActivity: jest.fn(),
    getSystemAuditSummary: jest.fn(),
    exportAuditLogs: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 'user-123',
    },
    ip: '192.168.1.100',
    headers: {
      'user-agent': 'Mozilla/5.0 Test Browser',
    },
  };

  const mockAuditLog = {
    id: 'log-123',
    userId: 'user-123',
    deviceId: 'device-456',
    action: 'proxy.acquire',
    resourceType: 'proxy',
    resourceId: 'proxy-789',
    details: { proxyType: 'residential' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    riskLevel: 'low',
    success: true,
    createdAt: new Date('2025-01-06T00:00:00.000Z'),
  };

  const mockAuditLogDetails = {
    id: 'log-123',
    userId: 'user-123',
    action: 'proxy.acquire',
    resourceType: 'proxy',
    resourceId: 'proxy-789',
    details: { proxyType: 'residential', country: 'US' },
    requestData: { deviceId: 'device-456' },
    responseData: { proxyId: 'proxy-789', status: 'assigned' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Browser',
    riskLevel: 'low',
    success: true,
    createdAt: new Date('2025-01-06T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyAuditLogController],
      providers: [
        {
          provide: ProxyAuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    controller = module.get<ProxyAuditLogController>(
      ProxyAuditLogController,
    );
    auditLogService = module.get(ProxyAuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createAuditLog', () => {
    it('should create an audit log', async () => {
      const dto: CreateAuditLogDto = {
        action: 'proxy.acquire',
        resourceType: 'proxy',
        resourceId: 'proxy-789',
        deviceId: 'device-456',
        details: { proxyType: 'residential' },
        riskLevel: 'low',
      };

      mockAuditLogService.createAuditLog.mockResolvedValue(mockAuditLog);

      const result = await controller.createAuditLog(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuditLog);
      expect(result.message).toBe('Audit log created');
      expect(auditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Browser',
          success: true,
        }),
      );
    });

    it('should create audit log with custom IP and User-Agent', async () => {
      const dto: CreateAuditLogDto = {
        action: 'proxy.release',
        resourceType: 'proxy',
        ipAddress: '10.0.0.1',
        userAgent: 'Custom Agent',
      };

      mockAuditLogService.createAuditLog.mockResolvedValue({
        ...mockAuditLog,
        ipAddress: '10.0.0.1',
        userAgent: 'Custom Agent',
      });

      const result = await controller.createAuditLog(mockRequest, dto);

      expect(auditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.1',
          userAgent: 'Custom Agent',
        }),
      );
    });

    it('should handle different risk levels', async () => {
      const riskLevels = ['low', 'medium', 'high', 'critical'];

      for (const riskLevel of riskLevels) {
        const dto: CreateAuditLogDto = {
          action: 'sensitive.access',
          resourceType: 'config',
          riskLevel: riskLevel as any,
        };

        mockAuditLogService.createAuditLog.mockResolvedValue({
          ...mockAuditLog,
          riskLevel,
        });

        const result = await controller.createAuditLog(mockRequest, dto);

        expect(result.data.riskLevel).toBe(riskLevel);
      }
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with pagination', async () => {
      const query: QueryAuditLogDto = {
        page: 1,
        limit: 50,
      };

      const mockResult = {
        logs: [mockAuditLog, { ...mockAuditLog, id: 'log-456' }],
        total: 2,
      };

      mockAuditLogService.queryAuditLogs.mockResolvedValue(mockResult);

      const result = await controller.queryAuditLogs(mockRequest, query);

      expect(result.success).toBe(true);
      expect(result.data.logs).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    });

    it('should query with filters', async () => {
      const query: QueryAuditLogDto = {
        userId: 'user-123',
        action: 'proxy.acquire',
        resourceType: 'proxy',
        riskLevel: 'low',
        success: true,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      mockAuditLogService.queryAuditLogs.mockResolvedValue({
        logs: [mockAuditLog],
        total: 1,
      });

      const result = await controller.queryAuditLogs(mockRequest, query);

      expect(auditLogService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'proxy.acquire',
          resourceType: 'proxy',
          riskLevel: 'low',
          success: true,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        }),
      );
    });

    it('should handle empty results', async () => {
      const query: QueryAuditLogDto = {};

      mockAuditLogService.queryAuditLogs.mockResolvedValue({
        logs: [],
        total: 0,
      });

      const result = await controller.queryAuditLogs(mockRequest, query);

      expect(result.data.logs).toHaveLength(0);
      expect(result.data.total).toBe(0);
    });
  });

  describe('getAuditLog', () => {
    it('should return audit log details', async () => {
      const logId = 'log-123';

      mockAuditLogService.getAuditLog.mockResolvedValue(mockAuditLogDetails);

      const result = await controller.getAuditLog(logId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuditLogDetails);
      expect(result.data.requestData).toBeDefined();
      expect(result.data.responseData).toBeDefined();
      expect(auditLogService.getAuditLog).toHaveBeenCalledWith(logId);
    });
  });

  describe('querySensitiveLogs', () => {
    it('should query sensitive audit logs', async () => {
      const query: QuerySensitiveAuditLogDto = {
        dataType: 'credentials',
        requiresApproval: true,
        approvalStatus: 'pending',
        page: 1,
        limit: 50,
      };

      const mockSensitiveLogs = {
        logs: [
          {
            id: 'sensitive-log-1',
            userId: 'user-123',
            action: 'sensitive.access',
            dataType: 'credentials',
            requiresApproval: true,
            approvalStatus: 'pending',
          },
        ],
        total: 1,
      };

      mockAuditLogService.querySensitiveAuditLogs.mockResolvedValue(
        mockSensitiveLogs,
      );

      const result = await controller.querySensitiveLogs(mockRequest, query);

      expect(result.success).toBe(true);
      expect(result.data.logs).toHaveLength(1);
      expect(auditLogService.querySensitiveAuditLogs).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          dataType: 'credentials',
          requiresApproval: true,
          approvalStatus: 'pending',
        }),
      );
    });

    it('should handle different data types', async () => {
      const dataTypes = ['credentials', 'payment', 'personal', 'config'];

      for (const dataType of dataTypes) {
        const query: QuerySensitiveAuditLogDto = {
          dataType: dataType as any,
        };

        mockAuditLogService.querySensitiveAuditLogs.mockResolvedValue({
          logs: [{ dataType }],
          total: 1,
        });

        const result = await controller.querySensitiveLogs(mockRequest, query);

        expect(result.data.logs[0].dataType).toBe(dataType);
      }
    });
  });

  describe('getSensitiveLogDetails', () => {
    it('should return sensitive log details with decrypted data', async () => {
      const logId = 'sensitive-log-123';
      const mockSensitiveDetails = {
        id: logId,
        userId: 'user-123',
        action: 'credentials.access',
        dataType: 'credentials',
        decryptedData: {
          username: 'admin',
          passwordHash: 'hashed',
        },
        approvalStatus: 'approved',
      };

      mockAuditLogService.getSensitiveAuditLogDetails.mockResolvedValue(
        mockSensitiveDetails,
      );

      const result = await controller.getSensitiveLogDetails(
        mockRequest,
        logId,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSensitiveDetails);
      expect(result.data.decryptedData).toBeDefined();
      expect(auditLogService.getSensitiveAuditLogDetails).toHaveBeenCalledWith(
        'user-123',
        logId,
      );
    });
  });

  describe('approveSensitiveAccess', () => {
    it('should approve sensitive access', async () => {
      const logId = 'sensitive-log-123';
      const dto: ApproveSensitiveAccessDto = {
        decision: 'approve',
        approvalNote: 'Authorized for maintenance',
      };

      const mockApprovedLog = {
        id: logId,
        approvalStatus: 'approved',
        approverId: 'user-123',
        approvalNote: dto.approvalNote,
        approvedAt: new Date('2025-01-06T01:00:00.000Z'),
      };

      mockAuditLogService.approveSensitiveAccess.mockResolvedValue(
        mockApprovedLog,
      );

      const result = await controller.approveSensitiveAccess(
        mockRequest,
        logId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApprovedLog);
      expect(result.message).toBe('Sensitive access approved');
      expect(auditLogService.approveSensitiveAccess).toHaveBeenCalledWith(
        'user-123',
        logId,
        'approve',
        dto.approvalNote,
      );
    });

    it('should reject sensitive access', async () => {
      const logId = 'sensitive-log-456';
      const dto: ApproveSensitiveAccessDto = {
        decision: 'reject',
        approvalNote: 'Insufficient justification',
      };

      const mockRejectedLog = {
        id: logId,
        approvalStatus: 'rejected',
        approverId: 'user-123',
        approvalNote: dto.approvalNote,
      };

      mockAuditLogService.approveSensitiveAccess.mockResolvedValue(
        mockRejectedLog,
      );

      const result = await controller.approveSensitiveAccess(
        mockRequest,
        logId,
        dto,
      );

      expect(result.message).toBe('Sensitive access rejectd');
      expect(auditLogService.approveSensitiveAccess).toHaveBeenCalledWith(
        'user-123',
        logId,
        'reject',
        dto.approvalNote,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return audit log statistics', async () => {
      const mockStats = {
        totalLogs: 10000,
        todayLogs: 150,
        byAction: {
          'proxy.acquire': 5000,
          'proxy.release': 4500,
          'config.update': 500,
        },
        byResourceType: {
          proxy: 9500,
          config: 500,
        },
        byRiskLevel: {
          low: 8000,
          medium: 1500,
          high: 400,
          critical: 100,
        },
        failedOperations: 250,
        successRate: 97.5,
        recentTrend: [
          { date: '2025-01-01', count: 1400, failedCount: 35 },
          { date: '2025-01-02', count: 1500, failedCount: 40 },
        ],
        highRiskUsers: [
          { userId: 'user-999', riskScore: 85, recentHighRiskActions: 10 },
        ],
      };

      mockAuditLogService.getAuditLogStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalLogs).toBe(10000);
      expect(result.data.byAction).toBeDefined();
      expect(result.data.byRiskLevel).toBeDefined();
      expect(result.data.recentTrend).toHaveLength(2);
      expect(result.data.highRiskUsers).toHaveLength(1);
      expect(auditLogService.getAuditLogStatistics).toHaveBeenCalledWith(
        undefined,
        7,
      );
    });

    it('should accept custom days parameter', async () => {
      const mockStats = {
        totalLogs: 5000,
        todayLogs: 75,
        byAction: {},
        byResourceType: {},
        byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
        failedOperations: 100,
        successRate: 98.0,
        recentTrend: [],
        highRiskUsers: [],
      };

      mockAuditLogService.getAuditLogStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(undefined, 30);

      expect(auditLogService.getAuditLogStatistics).toHaveBeenCalledWith(
        undefined,
        30,
      );
    });

    it('should filter by userId', async () => {
      const mockStats = {
        totalLogs: 500,
        todayLogs: 10,
        byAction: { 'proxy.acquire': 300 },
        byResourceType: { proxy: 300 },
        byRiskLevel: { low: 400, medium: 80, high: 20, critical: 0 },
        failedOperations: 10,
        successRate: 98.0,
        recentTrend: [],
        highRiskUsers: [],
      };

      mockAuditLogService.getAuditLogStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics('user-123', 7);

      expect(auditLogService.getAuditLogStatistics).toHaveBeenCalledWith(
        'user-123',
        7,
      );
    });
  });

  describe('analyzeUserActivity', () => {
    it('should analyze user activity', async () => {
      const userId = 'user-123';
      const mockAnalysis = {
        userId,
        totalActions: 1500,
        lastActiveAt: new Date('2025-01-06T00:00:00.000Z'),
        topActions: [
          { action: 'proxy.acquire', count: 800, percentage: 53.3 },
          { action: 'proxy.release', count: 700, percentage: 46.7 },
        ],
        riskScore: 35.5,
        anomalies: [
          {
            type: 'unusual_hours',
            description: 'Activity detected at 3 AM',
            detectedAt: new Date('2025-01-05T03:00:00.000Z'),
            severity: 'medium',
          },
        ],
        activityDistribution: {
          byHour: { 9: 150, 10: 200, 14: 180 },
          byDayOfWeek: { Monday: 300, Tuesday: 280 },
        },
      };

      mockAuditLogService.analyzeUserActivity.mockResolvedValue(mockAnalysis);

      const result = await controller.analyzeUserActivity(userId);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(userId);
      expect(result.data.totalActions).toBe(1500);
      expect(result.data.topActions).toHaveLength(2);
      expect(result.data.anomalies).toHaveLength(1);
      expect(result.data.activityDistribution).toBeDefined();
      expect(auditLogService.analyzeUserActivity).toHaveBeenCalledWith(
        userId,
        30,
      );
    });

    it('should accept custom analysis period', async () => {
      const userId = 'user-456';
      const mockAnalysis = {
        userId,
        totalActions: 500,
        lastActiveAt: new Date(),
        topActions: [],
        riskScore: 10,
        anomalies: [],
        activityDistribution: {
          byHour: {},
          byDayOfWeek: {},
        },
      };

      mockAuditLogService.analyzeUserActivity.mockResolvedValue(mockAnalysis);

      const result = await controller.analyzeUserActivity(userId, 90);

      expect(auditLogService.analyzeUserActivity).toHaveBeenCalledWith(
        userId,
        90,
      );
    });
  });

  describe('getSystemSummary', () => {
    it('should return system audit summary', async () => {
      const mockSummary = {
        activeUsers: 150,
        totalOperations: 50000,
        highRiskOperations: 25,
        failedOperations: 100,
        byResourceType: {
          proxy: 40000,
          device: 8000,
          config: 2000,
        },
        byAction: {
          'proxy.acquire': 20000,
          'proxy.release': 19000,
          'device.create': 5000,
        },
        peakHours: [
          { hour: 10, operationCount: 5000 },
          { hour: 14, operationCount: 4800 },
        ],
        complianceMetrics: {
          auditCoverage: 98.5,
          sensitiveDataAccess: 50,
          approvalComplianceRate: 100,
        },
      };

      mockAuditLogService.getSystemAuditSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSystemSummary();

      expect(result.success).toBe(true);
      expect(result.data.activeUsers).toBe(150);
      expect(result.data.totalOperations).toBe(50000);
      expect(result.data.complianceMetrics).toBeDefined();
      expect(result.data.complianceMetrics.auditCoverage).toBe(98.5);
      expect(result.data.peakHours).toHaveLength(2);
      expect(auditLogService.getSystemAuditSummary).toHaveBeenCalledWith(7);
    });

    it('should accept custom days parameter', async () => {
      const mockSummary = {
        activeUsers: 200,
        totalOperations: 100000,
        highRiskOperations: 50,
        failedOperations: 200,
        byResourceType: {},
        byAction: {},
        peakHours: [],
        complianceMetrics: {
          auditCoverage: 99.0,
          sensitiveDataAccess: 100,
          approvalComplianceRate: 99.5,
        },
      };

      mockAuditLogService.getSystemAuditSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSystemSummary(30);

      expect(auditLogService.getSystemAuditSummary).toHaveBeenCalledWith(30);
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs to CSV', async () => {
      const dto: ExportAuditLogDto = {
        exportFormat: 'csv',
        userId: 'user-123',
        action: 'proxy.acquire',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        includeFields: ['action', 'resourceType', 'createdAt'],
      };

      const mockResult = {
        downloadUrl: 'https://storage.example.com/exports/audit-log-123.csv',
        fileSize: 1048576,
        recordCount: 5000,
      };

      mockAuditLogService.exportAuditLogs.mockResolvedValue(mockResult);

      const result = await controller.exportAuditLogs(dto);

      expect(result.success).toBe(true);
      expect(result.data.downloadUrl).toContain('.csv');
      expect(result.data.recordCount).toBe(5000);
      expect(result.message).toBe('Audit logs exported');
      expect(auditLogService.exportAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'proxy.acquire',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          exportFormat: 'csv',
          includeFields: dto.includeFields,
        }),
      );
    });

    it('should handle different export formats', async () => {
      const formats = ['csv', 'json', 'excel'];

      for (const format of formats) {
        const dto: ExportAuditLogDto = {
          exportFormat: format as any,
        };

        mockAuditLogService.exportAuditLogs.mockResolvedValue({
          downloadUrl: `https://example.com/export.${format}`,
          fileSize: 1024,
          recordCount: 100,
        });

        const result = await controller.exportAuditLogs(dto);

        expect(result.success).toBe(true);
      }
    });
  });

  describe('getMyAuditLogs', () => {
    it('should return current user audit logs', async () => {
      const query: QueryAuditLogDto = {
        action: 'proxy.acquire',
        page: 1,
        limit: 50,
      };

      const mockResult = {
        logs: [
          { ...mockAuditLog, userId: 'user-123' },
          { ...mockAuditLog, id: 'log-456', userId: 'user-123' },
        ],
        total: 2,
      };

      mockAuditLogService.queryAuditLogs.mockResolvedValue(mockResult);

      const result = await controller.getMyAuditLogs(mockRequest, query);

      expect(result.success).toBe(true);
      expect(result.data.logs).toHaveLength(2);
      expect(result.data.logs[0].userId).toBe('user-123');
      expect(auditLogService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123', // Forced to current user
          action: 'proxy.acquire',
        }),
      );
    });

    it('should ignore userId from query and use current user', async () => {
      const query: QueryAuditLogDto = {
        userId: 'other-user', // Should be ignored
      };

      mockAuditLogService.queryAuditLogs.mockResolvedValue({
        logs: [mockAuditLog],
        total: 1,
      });

      const result = await controller.getMyAuditLogs(mockRequest, query);

      expect(auditLogService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123', // Uses current user, not query.userId
        }),
      );
    });
  });

  describe('Response Format', () => {
    it('should return ProxyApiResponse for all endpoints', async () => {
      mockAuditLogService.createAuditLog.mockResolvedValue(mockAuditLog);
      mockAuditLogService.queryAuditLogs.mockResolvedValue({
        logs: [],
        total: 0,
      });
      mockAuditLogService.getAuditLog.mockResolvedValue(mockAuditLogDetails);
      mockAuditLogService.querySensitiveAuditLogs.mockResolvedValue({
        logs: [],
        total: 0,
      });
      mockAuditLogService.getSensitiveAuditLogDetails.mockResolvedValue({});
      mockAuditLogService.approveSensitiveAccess.mockResolvedValue({});
      mockAuditLogService.getAuditLogStatistics.mockResolvedValue({
        totalLogs: 0,
        byAction: {},
        byResourceType: {},
        byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
        recentTrend: [],
        highRiskUsers: [],
      });
      mockAuditLogService.analyzeUserActivity.mockResolvedValue({
        userId: 'user-123',
        totalActions: 0,
        topActions: [],
        anomalies: [],
        activityDistribution: { byHour: {}, byDayOfWeek: {} },
      });
      mockAuditLogService.getSystemAuditSummary.mockResolvedValue({
        activeUsers: 0,
        totalOperations: 0,
        byResourceType: {},
        byAction: {},
        peakHours: [],
        complianceMetrics: {
          auditCoverage: 0,
          sensitiveDataAccess: 0,
          approvalComplianceRate: 0,
        },
      });
      mockAuditLogService.exportAuditLogs.mockResolvedValue({
        downloadUrl: 'url',
        fileSize: 0,
        recordCount: 0,
      });

      const createResult = await controller.createAuditLog(mockRequest, {
        action: 'test',
        resourceType: 'test',
      });
      const queryResult = await controller.queryAuditLogs(mockRequest, {});
      const getResult = await controller.getAuditLog('log-1');
      const sensitiveQueryResult = await controller.querySensitiveLogs(
        mockRequest,
        {},
      );
      const sensitiveDetailsResult = await controller.getSensitiveLogDetails(
        mockRequest,
        'log-1',
      );
      const approveResult = await controller.approveSensitiveAccess(
        mockRequest,
        'log-1',
        { decision: 'approve' },
      );
      const statsResult = await controller.getStatistics();
      const activityResult = await controller.analyzeUserActivity('user-1');
      const summaryResult = await controller.getSystemSummary();
      const exportResult = await controller.exportAuditLogs({
        exportFormat: 'csv',
      });
      const myLogsResult = await controller.getMyAuditLogs(mockRequest, {});

      expect(createResult.success).toBe(true);
      expect(queryResult.success).toBe(true);
      expect(getResult.success).toBe(true);
      expect(sensitiveQueryResult.success).toBe(true);
      expect(sensitiveDetailsResult.success).toBe(true);
      expect(approveResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
      expect(activityResult.success).toBe(true);
      expect(summaryResult.success).toBe(true);
      expect(exportResult.success).toBe(true);
      expect(myLogsResult.success).toBe(true);
    });

    it('should include messages for mutation endpoints', async () => {
      mockAuditLogService.createAuditLog.mockResolvedValue(mockAuditLog);
      mockAuditLogService.approveSensitiveAccess.mockResolvedValue({});
      mockAuditLogService.exportAuditLogs.mockResolvedValue({
        downloadUrl: 'url',
        fileSize: 0,
        recordCount: 0,
      });

      const createResult = await controller.createAuditLog(mockRequest, {
        action: 'test',
        resourceType: 'test',
      });
      const approveResult = await controller.approveSensitiveAccess(
        mockRequest,
        'log-1',
        { decision: 'approve' },
      );
      const exportResult = await controller.exportAuditLogs({
        exportFormat: 'csv',
      });

      expect(createResult.message).toBeDefined();
      expect(approveResult.message).toBeDefined();
      expect(exportResult.message).toBeDefined();
    });
  });
});
