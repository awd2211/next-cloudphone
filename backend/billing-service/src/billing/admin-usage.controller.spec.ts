import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminUsageController } from './admin-usage.controller';
import { AdminUsageService } from './admin-usage.service';

describe('AdminUsageController', () => {
  let controller: AdminUsageController;
  let adminUsageService: any;

  const mockAdminUsageService = {
    getUsageRecords: jest.fn(),
    getUsageStats: jest.fn(),
    exportUsageRecords: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsageController],
      providers: [
        {
          provide: AdminUsageService,
          useValue: mockAdminUsageService,
        },
      ],
    }).compile();

    controller = module.get<AdminUsageController>(AdminUsageController);
    adminUsageService = module.get(AdminUsageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsageRecords', () => {
    it('should return usage records without filters', async () => {
      const query: any = {};
      const mockRecords = {
        data: [
          { id: 'record-1', userId: 'user-1', resourceType: 'device', quantity: 5, cost: 100 },
          { id: 'record-2', userId: 'user-2', resourceType: 'storage', quantity: 100, cost: 50 },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      adminUsageService.getUsageRecords.mockResolvedValue(mockRecords);

      const result = await controller.getUsageRecords(query);

      expect(result).toEqual(mockRecords);
      expect(result.data).toHaveLength(2);
      expect(adminUsageService.getUsageRecords).toHaveBeenCalledWith(query);
    });

    it('should return usage records with date range filter', async () => {
      const query: any = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockRecords = {
        data: [{ id: 'record-1', userId: 'user-1', resourceType: 'device', quantity: 3, cost: 60 }],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      adminUsageService.getUsageRecords.mockResolvedValue(mockRecords);

      const result = await controller.getUsageRecords(query);

      expect(result).toEqual(mockRecords);
      expect(adminUsageService.getUsageRecords).toHaveBeenCalledWith(query);
    });

    it('should return usage records with userId filter', async () => {
      const query: any = {
        userId: 'user-123',
      };

      const mockRecords = {
        data: [
          { id: 'record-1', userId: 'user-123', resourceType: 'device', quantity: 5, cost: 100 },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      adminUsageService.getUsageRecords.mockResolvedValue(mockRecords);

      const result = await controller.getUsageRecords(query);

      expect(result).toEqual(mockRecords);
      expect(result.data[0].userId).toBe('user-123');
    });

    it('should return usage records with pagination', async () => {
      const query: any = {
        page: 2,
        pageSize: 10,
      };

      const mockRecords = {
        data: [
          { id: 'record-11', userId: 'user-3', resourceType: 'bandwidth', quantity: 50, cost: 25 },
        ],
        total: 15,
        page: 2,
        pageSize: 10,
      };

      adminUsageService.getUsageRecords.mockResolvedValue(mockRecords);

      const result = await controller.getUsageRecords(query);

      expect(result).toEqual(mockRecords);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should throw error when startDate is after endDate', async () => {
      const query: any = {
        startDate: '2025-01-31',
        endDate: '2025-01-01',
      };

      await expect(controller.getUsageRecords(query)).rejects.toThrow(BadRequestException);
      await expect(controller.getUsageRecords(query)).rejects.toThrow('开始日期不能大于结束日期');

      expect(adminUsageService.getUsageRecords).not.toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const query: any = {
        userId: 'nonexistent-user',
      };

      const mockRecords = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };

      adminUsageService.getUsageRecords.mockResolvedValue(mockRecords);

      const result = await controller.getUsageRecords(query);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return usage records with resourceType filter', async () => {
      const query: any = {
        resourceType: 'device',
      };

      const mockRecords = {
        data: [
          { id: 'record-1', userId: 'user-1', resourceType: 'device', quantity: 5, cost: 100 },
          { id: 'record-2', userId: 'user-2', resourceType: 'device', quantity: 3, cost: 60 },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      adminUsageService.getUsageRecords.mockResolvedValue(mockRecords);

      const result = await controller.getUsageRecords(query);

      expect(result).toEqual(mockRecords);
      expect(result.data.every((r: any) => r.resourceType === 'device')).toBe(true);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics without filters', async () => {
      const query: any = {};
      const mockStats = {
        totalUsers: 100,
        totalRecords: 1500,
        totalCost: 75000,
        byResourceType: {
          device: { count: 800, cost: 40000 },
          storage: { count: 500, cost: 25000 },
          bandwidth: { count: 200, cost: 10000 },
        },
        byUser: [
          { userId: 'user-1', totalCost: 5000, recordCount: 50 },
          { userId: 'user-2', totalCost: 3000, recordCount: 30 },
        ],
      };

      adminUsageService.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats(query);

      expect(result).toEqual(mockStats);
      expect(result.totalUsers).toBe(100);
      expect(result.totalCost).toBe(75000);
      expect(adminUsageService.getUsageStats).toHaveBeenCalledWith(query);
    });

    it('should return usage statistics with date range', async () => {
      const query: any = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockStats = {
        totalUsers: 50,
        totalRecords: 750,
        totalCost: 37500,
        period: { start: '2025-01-01', end: '2025-01-31' },
        byResourceType: {
          device: { count: 400, cost: 20000 },
        },
      };

      adminUsageService.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats(query);

      expect(result).toEqual(mockStats);
      expect(result.period).toBeDefined();
      expect(result.totalRecords).toBe(750);
    });

    it('should throw error when startDate is after endDate', async () => {
      const query: any = {
        startDate: '2025-12-31',
        endDate: '2025-01-01',
      };

      await expect(controller.getUsageStats(query)).rejects.toThrow(BadRequestException);
      await expect(controller.getUsageStats(query)).rejects.toThrow('开始日期不能大于结束日期');

      expect(adminUsageService.getUsageStats).not.toHaveBeenCalled();
    });

    it('should return usage statistics with userId filter', async () => {
      const query: any = {
        userId: 'user-123',
      };

      const mockStats = {
        totalUsers: 1,
        totalRecords: 25,
        totalCost: 1250,
        byResourceType: {
          device: { count: 15, cost: 750 },
          storage: { count: 10, cost: 500 },
        },
      };

      adminUsageService.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats(query);

      expect(result).toEqual(mockStats);
      expect(result.totalUsers).toBe(1);
    });

    it('should return statistics with zero values', async () => {
      const query: any = {
        userId: 'inactive-user',
      };

      const mockStats = {
        totalUsers: 0,
        totalRecords: 0,
        totalCost: 0,
        byResourceType: {},
        byUser: [],
      };

      adminUsageService.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats(query);

      expect(result.totalRecords).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  describe('exportUsageRecords', () => {
    it('should export usage records as CSV by default', async () => {
      const query: any = {
        format: 'csv',
      };

      const mockExportResult = {
        data: 'id,userId,resourceType,quantity,cost\nrecord-1,user-1,device,5,100',
      };

      adminUsageService.exportUsageRecords.mockResolvedValue(mockExportResult);

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportUsageRecords(query, mockRes);

      expect(adminUsageService.exportUsageRecords).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="usage-records-'),
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv"'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockExportResult.data);
    });

    it('should export usage records as Excel', async () => {
      const query: any = {
        format: 'excel',
      };

      const mockExportResult = {
        data: Buffer.from('excel-binary-data'),
      };

      adminUsageService.exportUsageRecords.mockResolvedValue(mockExportResult);

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportUsageRecords(query, mockRes);

      expect(adminUsageService.exportUsageRecords).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.xlsx"'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockExportResult.data);
    });

    it('should export usage records as JSON', async () => {
      const query: any = {
        format: 'json',
      };

      const mockExportResult = {
        data: JSON.stringify([
          { id: 'record-1', userId: 'user-1', resourceType: 'device' },
        ]),
      };

      adminUsageService.exportUsageRecords.mockResolvedValue(mockExportResult);

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportUsageRecords(query, mockRes);

      expect(adminUsageService.exportUsageRecords).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.json"'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockExportResult.data);
    });

    it('should throw error when startDate is after endDate during export', async () => {
      const query: any = {
        format: 'csv',
        startDate: '2025-06-01',
        endDate: '2025-01-01',
      };

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await expect(controller.exportUsageRecords(query, mockRes)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.exportUsageRecords(query, mockRes)).rejects.toThrow(
        '开始日期不能大于结束日期',
      );

      expect(adminUsageService.exportUsageRecords).not.toHaveBeenCalled();
    });

    it('should handle export errors gracefully', async () => {
      const query: any = {
        format: 'csv',
      };

      adminUsageService.exportUsageRecords.mockRejectedValue(new Error('Export service failed'));

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await expect(controller.exportUsageRecords(query, mockRes)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.exportUsageRecords(query, mockRes)).rejects.toThrow(
        '导出失败: Export service failed',
      );
    });

    it('should export with date range filter', async () => {
      const query: any = {
        format: 'excel',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockExportResult = {
        data: Buffer.from('excel-data'),
      };

      adminUsageService.exportUsageRecords.mockResolvedValue(mockExportResult);

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportUsageRecords(query, mockRes);

      expect(adminUsageService.exportUsageRecords).toHaveBeenCalledWith(query);
      expect(mockRes.send).toHaveBeenCalledWith(mockExportResult.data);
    });

    it('should export with userId filter', async () => {
      const query: any = {
        format: 'csv',
        userId: 'user-456',
      };

      const mockExportResult = {
        data: 'id,userId,resourceType\nrecord-1,user-456,device',
      };

      adminUsageService.exportUsageRecords.mockResolvedValue(mockExportResult);

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportUsageRecords(query, mockRes);

      expect(adminUsageService.exportUsageRecords).toHaveBeenCalledWith(query);
      expect(mockRes.send).toHaveBeenCalledWith(mockExportResult.data);
    });
  });
});
