import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Response } from 'express';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: any;

  const mockReportsService = {
    generateUserBillReport: jest.fn(),
    generateRevenueReport: jest.fn(),
    generateUsageTrendReport: jest.fn(),
    exportToCSV: jest.fn(),
    exportToExcel: jest.fn(),
    getPlanStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserBillReport', () => {
    it('should generate user bill report for date range', async () => {
      const userId = 'user-123';
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const mockReport = {
        userId: 'user-123',
        period: { start: new Date(startDate), end: new Date(endDate) },
        totalAmount: 1500,
        orders: [
          { id: 'order-1', amount: 500, status: 'paid' },
          { id: 'order-2', amount: 1000, status: 'paid' },
        ],
      };

      reportsService.generateUserBillReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUserBillReport(userId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
      expect(result.data.totalAmount).toBe(1500);
      expect(reportsService.generateUserBillReport).toHaveBeenCalledWith(
        userId,
        new Date(startDate),
        new Date(endDate),
      );
    });

    it('should generate bill report for different date range', async () => {
      const userId = 'user-456';
      const startDate = '2024-12-01';
      const endDate = '2024-12-31';

      const mockReport = {
        userId: 'user-456',
        period: { start: new Date(startDate), end: new Date(endDate) },
        totalAmount: 2500,
        orders: [{ id: 'order-3', amount: 2500, status: 'paid' }],
      };

      reportsService.generateUserBillReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUserBillReport(userId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data.orders).toHaveLength(1);
      expect(result.data.totalAmount).toBe(2500);
    });

    it('should handle report with no orders', async () => {
      const userId = 'user-789';
      const startDate = '2025-02-01';
      const endDate = '2025-02-28';

      const mockReport = {
        userId: 'user-789',
        period: { start: new Date(startDate), end: new Date(endDate) },
        totalAmount: 0,
        orders: [],
      };

      reportsService.generateUserBillReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUserBillReport(userId, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data.orders).toHaveLength(0);
      expect(result.data.totalAmount).toBe(0);
    });
  });

  describe('getRevenueReport', () => {
    it('should generate revenue report without tenant filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        totalRevenue: 50000,
        revenueByDay: [
          { date: '2025-01-01', revenue: 1500 },
          { date: '2025-01-02', revenue: 1800 },
        ],
        orderCount: 150,
      };

      reportsService.generateRevenueReport.mockResolvedValue(mockReport);

      const result: any = await controller.getRevenueReport(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
      expect(result.data.totalRevenue).toBe(50000);
      expect(reportsService.generateRevenueReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        undefined,
      );
    });

    it('should generate revenue report with tenant filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const tenantId = 'tenant-123';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        tenantId: 'tenant-123',
        totalRevenue: 15000,
        revenueByDay: [{ date: '2025-01-01', revenue: 500 }],
        orderCount: 45,
      };

      reportsService.generateRevenueReport.mockResolvedValue(mockReport);

      const result: any = await controller.getRevenueReport(startDate, endDate, tenantId);

      expect(result.success).toBe(true);
      expect(result.data.tenantId).toBe('tenant-123');
      expect(result.data.totalRevenue).toBe(15000);
      expect(reportsService.generateRevenueReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        tenantId,
      );
    });

    it('should handle report with zero revenue', async () => {
      const startDate = '2025-03-01';
      const endDate = '2025-03-31';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        totalRevenue: 0,
        revenueByDay: [],
        orderCount: 0,
      };

      reportsService.generateRevenueReport.mockResolvedValue(mockReport);

      const result: any = await controller.getRevenueReport(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data.totalRevenue).toBe(0);
      expect(result.data.orderCount).toBe(0);
    });
  });

  describe('getUsageTrendReport', () => {
    it('should generate usage trend report without filters', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        trends: [
          { date: '2025-01-01', deviceCount: 100, storageGB: 500 },
          { date: '2025-01-02', deviceCount: 105, storageGB: 520 },
        ],
        averageDeviceCount: 102.5,
        averageStorageGB: 510,
      };

      reportsService.generateUsageTrendReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUsageTrendReport(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
      expect(result.data.trends).toHaveLength(2);
      expect(reportsService.generateUsageTrendReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        undefined,
        undefined,
      );
    });

    it('should generate usage trend report with user filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const userId = 'user-123';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        userId: 'user-123',
        trends: [{ date: '2025-01-01', deviceCount: 10, storageGB: 50 }],
        averageDeviceCount: 10,
        averageStorageGB: 50,
      };

      reportsService.generateUsageTrendReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUsageTrendReport(startDate, endDate, userId);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('user-123');
      expect(reportsService.generateUsageTrendReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        userId,
        undefined,
      );
    });

    it('should generate usage trend report with tenant filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const tenantId = 'tenant-456';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        tenantId: 'tenant-456',
        trends: [{ date: '2025-01-01', deviceCount: 50, storageGB: 250 }],
        averageDeviceCount: 50,
        averageStorageGB: 250,
      };

      reportsService.generateUsageTrendReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUsageTrendReport(
        startDate,
        endDate,
        undefined,
        tenantId,
      );

      expect(result.success).toBe(true);
      expect(result.data.tenantId).toBe('tenant-456');
      expect(reportsService.generateUsageTrendReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        undefined,
        tenantId,
      );
    });

    it('should generate usage trend report with both user and tenant filters', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const userId = 'user-789';
      const tenantId = 'tenant-789';

      const mockReport = {
        period: { start: new Date(startDate), end: new Date(endDate) },
        userId: 'user-789',
        tenantId: 'tenant-789',
        trends: [{ date: '2025-01-01', deviceCount: 5, storageGB: 25 }],
        averageDeviceCount: 5,
        averageStorageGB: 25,
      };

      reportsService.generateUsageTrendReport.mockResolvedValue(mockReport);

      const result: any = await controller.getUsageTrendReport(
        startDate,
        endDate,
        userId,
        tenantId,
      );

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('user-789');
      expect(result.data.tenantId).toBe('tenant-789');
    });
  });

  describe('exportUserBill', () => {
    it('should export user bill as Excel by default', async () => {
      const userId = 'user-123';
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const mockReport = {
        userId: 'user-123',
        orders: [{ id: 'order-1', amount: 500 }],
      };

      const mockFilePath = '/tmp/bill_user-123_2025-01-01_2025-01-31.xlsx';

      reportsService.generateUserBillReport.mockResolvedValue(mockReport);
      reportsService.exportToExcel.mockResolvedValue(mockFilePath);

      const mockRes: any = {
        download: jest.fn(),
      };

      await controller.exportUserBill(userId, startDate, endDate, 'excel', mockRes);

      expect(reportsService.generateUserBillReport).toHaveBeenCalledWith(
        userId,
        new Date(startDate),
        new Date(endDate),
      );
      expect(reportsService.exportToExcel).toHaveBeenCalledWith(
        mockReport,
        'bill_user-123_2025-01-01_2025-01-31',
      );
      expect(mockRes.download).toHaveBeenCalledWith(mockFilePath);
    });

    it('should export user bill as CSV when format is csv', async () => {
      const userId = 'user-456';
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const mockReport = {
        userId: 'user-456',
        orders: [
          { id: 'order-1', amount: 500, status: 'paid', createdAt: new Date(), paidAt: new Date() },
        ],
      };

      const mockFilePath = '/tmp/bill_user-456_2025-01-01_2025-01-31.csv';

      reportsService.generateUserBillReport.mockResolvedValue(mockReport);
      reportsService.exportToCSV.mockResolvedValue(mockFilePath);

      const mockRes: any = {
        download: jest.fn(),
      };

      await controller.exportUserBill(userId, startDate, endDate, 'csv', mockRes);

      expect(reportsService.generateUserBillReport).toHaveBeenCalled();
      expect(reportsService.exportToCSV).toHaveBeenCalledWith(
        mockReport.orders,
        'bill_user-456_2025-01-01_2025-01-31',
        expect.arrayContaining([
          { id: 'id', title: 'Order ID' },
          { id: 'amount', title: 'Amount' },
          { id: 'status', title: 'Status' },
          { id: 'createdAt', title: 'Created At' },
          { id: 'paidAt', title: 'Paid At' },
        ]),
      );
      expect(mockRes.download).toHaveBeenCalledWith(mockFilePath);
    });

    it('should handle export with different date range', async () => {
      const userId = 'user-789';
      const startDate = '2024-12-01';
      const endDate = '2024-12-31';

      const mockReport = {
        userId: 'user-789',
        orders: [],
      };

      const mockFilePath = '/tmp/bill_user-789_2024-12-01_2024-12-31.xlsx';

      reportsService.generateUserBillReport.mockResolvedValue(mockReport);
      reportsService.exportToExcel.mockResolvedValue(mockFilePath);

      const mockRes: any = {
        download: jest.fn(),
      };

      await controller.exportUserBill(userId, startDate, endDate, 'excel', mockRes);

      expect(reportsService.exportToExcel).toHaveBeenCalledWith(
        mockReport,
        'bill_user-789_2024-12-01_2024-12-31',
      );
      expect(mockRes.download).toHaveBeenCalledWith(mockFilePath);
    });
  });

  describe('exportRevenueReport', () => {
    it('should export revenue report without tenant filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const mockReport = {
        totalRevenue: 50000,
        revenueByDay: [],
      };

      const mockFilePath = '/tmp/revenue_2025-01-01_2025-01-31.xlsx';

      reportsService.generateRevenueReport.mockResolvedValue(mockReport);
      reportsService.exportToExcel.mockResolvedValue(mockFilePath);

      const mockRes: any = {
        download: jest.fn(),
      };

      await controller.exportRevenueReport(startDate, endDate, undefined, mockRes);

      expect(reportsService.generateRevenueReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        undefined,
      );
      expect(reportsService.exportToExcel).toHaveBeenCalledWith(
        mockReport,
        'revenue_2025-01-01_2025-01-31',
      );
      expect(mockRes.download).toHaveBeenCalledWith(mockFilePath);
    });

    it('should export revenue report with tenant filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const tenantId = 'tenant-123';

      const mockReport = {
        tenantId: 'tenant-123',
        totalRevenue: 15000,
        revenueByDay: [],
      };

      const mockFilePath = '/tmp/revenue_2025-01-01_2025-01-31.xlsx';

      reportsService.generateRevenueReport.mockResolvedValue(mockReport);
      reportsService.exportToExcel.mockResolvedValue(mockFilePath);

      const mockRes: any = {
        download: jest.fn(),
      };

      await controller.exportRevenueReport(startDate, endDate, tenantId, mockRes);

      expect(reportsService.generateRevenueReport).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        tenantId,
      );
      expect(mockRes.download).toHaveBeenCalledWith(mockFilePath);
    });
  });

  describe('getPlanStats', () => {
    it('should return plan statistics', async () => {
      const mockStats = [
        {
          planId: 'plan-1',
          planName: 'Basic Plan',
          orderCount: 50,
          revenue: 5000,
          activeSubscriptions: 45,
        },
        {
          planId: 'plan-2',
          planName: 'Premium Plan',
          orderCount: 30,
          revenue: 9000,
          activeSubscriptions: 28,
        },
      ];

      reportsService.getPlanStats.mockResolvedValue(mockStats);

      const result: any = await controller.getPlanStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].planName).toBe('Basic Plan');
      expect(reportsService.getPlanStats).toHaveBeenCalled();
    });

    it('should return plan stats with detailed metrics', async () => {
      const mockStats = [
        {
          planId: 'plan-3',
          planName: 'Enterprise Plan',
          orderCount: 10,
          revenue: 20000,
          activeSubscriptions: 10,
          averageRevenuePerUser: 2000,
          conversionRate: 85,
        },
      ];

      reportsService.getPlanStats.mockResolvedValue(mockStats);

      const result: any = await controller.getPlanStats();

      expect(result.success).toBe(true);
      expect(result.data[0].averageRevenuePerUser).toBe(2000);
      expect(result.data[0].conversionRate).toBe(85);
    });

    it('should handle empty plan stats', async () => {
      reportsService.getPlanStats.mockResolvedValue([]);

      const result: any = await controller.getPlanStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    });
  });
});
