import { Test, TestingModule } from '@nestjs/testing';
import { ProxyUsageReportController } from './proxy-usage-report.controller';
import { ProxyUsageReportService } from '../services/proxy-usage-report.service';
import {
  CreateReportDto,
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
  QueryReportDto,
  BatchExportDto,
} from '../dto';

describe('ProxyUsageReportController', () => {
  let controller: ProxyUsageReportController;
  let reportService: any;

  const mockReportService = {
    createReport: jest.fn(),
    queryReports: jest.fn(),
    getReport: jest.fn(),
    deleteReport: jest.fn(),
    batchExport: jest.fn(),
    createScheduledReport: jest.fn(),
    getUserScheduledReports: jest.fn(),
    updateScheduledReport: jest.fn(),
    getReportStatistics: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 'user-123',
    },
  };

  const mockReport = {
    id: 'report-123',
    userId: 'user-123',
    reportName: 'Monthly Usage Report',
    reportType: 'usage_summary',
    reportPeriod: 'monthly',
    status: 'pending',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    exportFormat: 'pdf',
    createdAt: new Date('2025-01-06T00:00:00.000Z'),
    updatedAt: new Date('2025-01-06T00:00:00.000Z'),
  };

  const mockReportDetails = {
    id: 'report-123',
    reportName: 'Monthly Usage Report',
    reportType: 'usage_summary',
    reportPeriod: 'monthly',
    status: 'completed',
    exportFormat: 'pdf',
    dataSummary: {
      totalUsage: 1000000,
      totalCost: 1500.5,
      deviceCount: 50,
      avgSuccessRate: 98.5,
    },
    generatedAt: new Date('2025-01-06T00:00:00.000Z'),
    fileSize: 2048576,
    downloadUrl: 'https://storage.example.com/reports/report-123.pdf',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyUsageReportController],
      providers: [
        {
          provide: ProxyUsageReportService,
          useValue: mockReportService,
        },
      ],
    }).compile();

    controller = module.get<ProxyUsageReportController>(
      ProxyUsageReportController,
    );
    reportService = module.get(ProxyUsageReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a new report', async () => {
      const dto: CreateReportDto = {
        reportName: 'Monthly Usage Report',
        reportType: 'usage_summary',
        reportPeriod: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        exportFormat: 'pdf',
        includeCharts: true,
      };

      mockReportService.createReport.mockResolvedValue(mockReport);

      const result = await controller.createReport(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
      expect(result.message).toBe('Report task created. Generation in progress');
      expect(reportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          reportName: dto.reportName,
          reportType: dto.reportType,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        }),
      );
    });

    it('should create report with filters', async () => {
      const dto: CreateReportDto = {
        reportName: 'Filtered Report',
        reportType: 'cost_analysis',
        reportPeriod: 'custom',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        dataScope: 'device',
        filters: {
          deviceIds: ['device-1', 'device-2'],
          minCost: 10,
          maxCost: 100,
        },
        includedMetrics: ['cost', 'usage', 'success_rate'],
      };

      mockReportService.createReport.mockResolvedValue({
        ...mockReport,
        ...dto,
      });

      const result = await controller.createReport(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(reportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: dto.filters,
          includedMetrics: dto.includedMetrics,
        }),
      );
    });

    it('should handle different report types', async () => {
      const reportTypes = [
        'usage_summary',
        'cost_analysis',
        'quality_report',
        'failover_analysis',
        'provider_comparison',
      ];

      for (const reportType of reportTypes) {
        const dto: CreateReportDto = {
          reportName: `${reportType} Report`,
          reportType,
          reportPeriod: 'monthly',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        };

        mockReportService.createReport.mockResolvedValue({
          ...mockReport,
          reportType,
        });

        const result = await controller.createReport(mockRequest, dto);

        expect(result.data.reportType).toBe(reportType);
      }
    });
  });

  describe('queryReports', () => {
    it('should query reports with pagination', async () => {
      const query: QueryReportDto = {
        page: 1,
        limit: 20,
      };

      const mockResult = {
        reports: [mockReport, { ...mockReport, id: 'report-456' }],
        total: 2,
      };

      mockReportService.queryReports.mockResolvedValue(mockResult);

      const result = await controller.queryReports(mockRequest, query);

      expect(result.success).toBe(true);
      expect(result.data.reports).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(reportService.queryReports).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          page: 1,
          limit: 20,
        }),
      );
    });

    it('should query reports with filters', async () => {
      const query: QueryReportDto = {
        reportType: 'usage_summary',
        reportPeriod: 'monthly',
        status: 'completed',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        page: 1,
        limit: 10,
      };

      const mockResult = {
        reports: [mockReport],
        total: 1,
      };

      mockReportService.queryReports.mockResolvedValue(mockResult);

      const result = await controller.queryReports(mockRequest, query);

      expect(result.data.reports).toHaveLength(1);
      expect(reportService.queryReports).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'usage_summary',
          reportPeriod: 'monthly',
          status: 'completed',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        }),
      );
    });

    it('should handle empty results', async () => {
      const query: QueryReportDto = {};

      mockReportService.queryReports.mockResolvedValue({
        reports: [],
        total: 0,
      });

      const result = await controller.queryReports(mockRequest, query);

      expect(result.data.reports).toHaveLength(0);
      expect(result.data.total).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should return report details', async () => {
      const reportId = 'report-123';

      mockReportService.getReport.mockResolvedValue(mockReportDetails);

      const result = await controller.getReport(reportId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReportDetails);
      expect(result.data.dataSummary).toBeDefined();
      expect(result.data.dataSummary.totalUsage).toBe(1000000);
      expect(reportService.getReport).toHaveBeenCalledWith(reportId);
    });

    it('should return report with different statuses', async () => {
      const statuses = ['pending', 'generating', 'completed', 'failed'];

      for (const status of statuses) {
        mockReportService.getReport.mockResolvedValue({
          ...mockReportDetails,
          status,
        });

        const result = await controller.getReport('report-test');

        expect(result.data.status).toBe(status);
      }
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const reportId = 'report-123';

      mockReportService.deleteReport.mockResolvedValue(undefined);

      await controller.deleteReport(reportId);

      expect(reportService.deleteReport).toHaveBeenCalledWith(reportId);
    });

    it('should delete multiple reports', async () => {
      const reportIds = ['report-1', 'report-2', 'report-3'];

      mockReportService.deleteReport.mockResolvedValue(undefined);

      for (const id of reportIds) {
        await controller.deleteReport(id);
      }

      expect(reportService.deleteReport).toHaveBeenCalledTimes(3);
    });
  });

  describe('batchExport', () => {
    it('should batch export reports', async () => {
      const dto: BatchExportDto = {
        reportIds: ['report-1', 'report-2', 'report-3'],
        exportFormat: 'excel',
        zipArchive: true,
      };

      const mockResult = {
        downloadUrl: 'https://storage.example.com/exports/batch-123.zip',
        fileSize: 5242880,
        reportCount: 3,
      };

      mockReportService.batchExport.mockResolvedValue(mockResult);

      const result = await controller.batchExport(dto);

      expect(result.success).toBe(true);
      expect(result.data.reportCount).toBe(3);
      expect(result.data.downloadUrl).toContain('.zip');
      expect(result.message).toBe('Batch export completed');
      expect(reportService.batchExport).toHaveBeenCalledWith({
        reportIds: dto.reportIds,
        exportFormat: dto.exportFormat,
        zipArchive: dto.zipArchive,
      });
    });

    it('should export without zip archive', async () => {
      const dto: BatchExportDto = {
        reportIds: ['report-1'],
        exportFormat: 'pdf',
        zipArchive: false,
      };

      const mockResult = {
        downloadUrl: 'https://storage.example.com/exports/report-1.pdf',
        fileSize: 2048576,
        reportCount: 1,
      };

      mockReportService.batchExport.mockResolvedValue(mockResult);

      const result = await controller.batchExport(dto);

      expect(result.data.reportCount).toBe(1);
    });

    it('should handle different export formats', async () => {
      const formats = ['pdf', 'excel', 'csv', 'json'];

      for (const format of formats) {
        const dto: BatchExportDto = {
          reportIds: ['report-1'],
          exportFormat: format,
        };

        mockReportService.batchExport.mockResolvedValue({
          downloadUrl: `https://example.com/export.${format}`,
          fileSize: 1024,
          reportCount: 1,
        });

        const result = await controller.batchExport(dto);

        expect(result.success).toBe(true);
      }
    });
  });

  describe('createScheduledReport', () => {
    it('should create a scheduled report', async () => {
      const dto: CreateScheduledReportDto = {
        reportName: 'Weekly Usage Report',
        reportType: 'usage_summary',
        reportPeriod: 'weekly',
        cronExpression: '0 0 9 * * 1',
        recipients: ['admin@example.com', 'manager@example.com'],
        autoSend: true,
      };

      const mockScheduled = {
        id: 'scheduled-123',
        userId: 'user-123',
        ...dto,
        isEnabled: true,
        nextExecutionAt: new Date('2025-01-13T09:00:00.000Z'),
      };

      mockReportService.createScheduledReport.mockResolvedValue(mockScheduled);

      const result = await controller.createScheduledReport(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockScheduled);
      expect(result.message).toBe('Scheduled report created');
      expect(reportService.createScheduledReport).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          reportName: dto.reportName,
          cronExpression: dto.cronExpression,
        }),
      );
    });

    it('should create scheduled report with optional fields', async () => {
      const dto: CreateScheduledReportDto = {
        reportName: 'Daily Cost Report',
        reportType: 'cost_analysis',
        reportPeriod: 'daily',
        cronExpression: '0 0 8 * * *',
        dataScope: 'all',
        exportFormat: 'excel',
      };

      mockReportService.createScheduledReport.mockResolvedValue({
        id: 'scheduled-456',
        ...dto,
      });

      const result = await controller.createScheduledReport(mockRequest, dto);

      expect(result.success).toBe(true);
    });
  });

  describe('getScheduledReports', () => {
    it('should return user scheduled reports', async () => {
      const mockScheduledReports = [
        {
          id: 'scheduled-1',
          reportName: 'Weekly Report',
          cronExpression: '0 0 9 * * 1',
          isEnabled: true,
        },
        {
          id: 'scheduled-2',
          reportName: 'Monthly Report',
          cronExpression: '0 0 9 1 * *',
          isEnabled: true,
        },
      ];

      mockReportService.getUserScheduledReports.mockResolvedValue(
        mockScheduledReports,
      );

      const result = await controller.getScheduledReports(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(reportService.getUserScheduledReports).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should return empty array for no scheduled reports', async () => {
      mockReportService.getUserScheduledReports.mockResolvedValue([]);

      const result = await controller.getScheduledReports(mockRequest);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('updateScheduledReport', () => {
    it('should update scheduled report', async () => {
      const reportId = 'scheduled-123';
      const dto: UpdateScheduledReportDto = {
        reportName: 'Updated Weekly Report',
        cronExpression: '0 0 10 * * 1',
        recipients: ['new-admin@example.com'],
      };

      const mockUpdated = {
        id: reportId,
        ...dto,
        isEnabled: true,
      };

      mockReportService.updateScheduledReport.mockResolvedValue(mockUpdated);

      const result = await controller.updateScheduledReport(reportId, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdated);
      expect(result.message).toBe('Scheduled report updated');
      expect(reportService.updateScheduledReport).toHaveBeenCalledWith(
        reportId,
        dto,
      );
    });

    it('should enable/disable scheduled report', async () => {
      const reportId = 'scheduled-123';
      const dto: UpdateScheduledReportDto = {
        isEnabled: false,
      };

      mockReportService.updateScheduledReport.mockResolvedValue({
        id: reportId,
        isEnabled: false,
      });

      const result = await controller.updateScheduledReport(reportId, dto);

      expect(result.data.isEnabled).toBe(false);
    });

    it('should update export format', async () => {
      const reportId = 'scheduled-123';
      const dto: UpdateScheduledReportDto = {
        exportFormat: 'csv',
      };

      mockReportService.updateScheduledReport.mockResolvedValue({
        id: reportId,
        exportFormat: 'csv',
      });

      const result = await controller.updateScheduledReport(reportId, dto);

      expect(result.data.exportFormat).toBe('csv');
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete scheduled report', async () => {
      const reportId = 'scheduled-123';

      mockReportService.deleteReport.mockResolvedValue(undefined);

      await controller.deleteScheduledReport(reportId);

      expect(reportService.deleteReport).toHaveBeenCalledWith(reportId);
    });
  });

  describe('executeScheduledReport', () => {
    it('should trigger scheduled report execution', async () => {
      const reportId = 'scheduled-123';

      const result = await controller.executeScheduledReport(reportId);

      expect(result.success).toBe(true);
      expect(result.data.reportId).toBe(reportId);
      expect(result.data.message).toBe('Execution triggered');
      expect(result.message).toBe('Scheduled report execution started');
    });

    it('should execute multiple times', async () => {
      const reportId = 'scheduled-123';

      await controller.executeScheduledReport(reportId);
      await controller.executeScheduledReport(reportId);
      await controller.executeScheduledReport(reportId);

      // Each execution should succeed
      const result = await controller.executeScheduledReport(reportId);
      expect(result.success).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return report statistics', async () => {
      const mockStats = {
        totalReports: 150,
        pendingReports: 5,
        completedReports: 140,
        failedReports: 5,
        byType: {
          usage_summary: 60,
          cost_analysis: 40,
          quality_report: 30,
          failover_analysis: 10,
          provider_comparison: 10,
        },
        byFormat: {
          pdf: 80,
          excel: 50,
          csv: 15,
          json: 5,
        },
        recentTrend: [
          { date: '2025-01-01', count: 5 },
          { date: '2025-01-02', count: 7 },
          { date: '2025-01-03', count: 6 },
        ],
      };

      mockReportService.getReportStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.totalReports).toBe(150);
      expect(result.data.byType).toBeDefined();
      expect(result.data.byFormat).toBeDefined();
      expect(result.data.recentTrend).toHaveLength(3);
      expect(reportService.getReportStatistics).toHaveBeenCalledWith(
        'user-123',
        30,
      );
    });

    it('should accept custom days parameter', async () => {
      const mockStats = {
        totalReports: 50,
        pendingReports: 2,
        completedReports: 45,
        failedReports: 3,
        byType: {
          usage_summary: 25,
          cost_analysis: 15,
          quality_report: 10,
          failover_analysis: 0,
          provider_comparison: 0,
        },
        byFormat: {
          pdf: 30,
          excel: 15,
          csv: 5,
          json: 0,
        },
        recentTrend: [],
      };

      mockReportService.getReportStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(mockRequest, 7);

      expect(reportService.getReportStatistics).toHaveBeenCalledWith(
        'user-123',
        7,
      );
    });

    it('should handle zero reports', async () => {
      const mockStats = {
        totalReports: 0,
        pendingReports: 0,
        completedReports: 0,
        failedReports: 0,
        byType: {
          usage_summary: 0,
          cost_analysis: 0,
          quality_report: 0,
          failover_analysis: 0,
          provider_comparison: 0,
        },
        byFormat: {
          pdf: 0,
          excel: 0,
          csv: 0,
          json: 0,
        },
        recentTrend: [],
      };

      mockReportService.getReportStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(mockRequest);

      expect(result.data.totalReports).toBe(0);
    });
  });

  describe('downloadReport', () => {
    it('should return download information for completed report', async () => {
      const reportId = 'report-123';

      mockReportService.getReport.mockResolvedValue(mockReportDetails);

      const result = await controller.downloadReport(reportId);

      expect(result.success).toBe(true);
      expect(result.data.downloadUrl).toBe(mockReportDetails.downloadUrl);
      expect(result.data.fileName).toBe(
        `${mockReportDetails.reportName}.${mockReportDetails.exportFormat}`,
      );
      expect(result.data.fileSize).toBe(mockReportDetails.fileSize);
      expect(result.data.expiresAt).toBeDefined();
      expect(reportService.getReport).toHaveBeenCalledWith(reportId);
    });

    it('should throw error for non-completed report', async () => {
      const reportId = 'report-pending';

      mockReportService.getReport.mockResolvedValue({
        ...mockReportDetails,
        status: 'pending',
      });

      await expect(controller.downloadReport(reportId)).rejects.toThrow(
        'Report is not ready for download',
      );
    });

    it('should set expiry time 24 hours from now', async () => {
      mockReportService.getReport.mockResolvedValue(mockReportDetails);

      const result = await controller.downloadReport('report-123');

      const now = new Date();
      const expiresAt = new Date(result.data.expiresAt);
      const hoursDiff =
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThanOrEqual(24);
    });
  });

  describe('Response Format', () => {
    it('should return ProxyApiResponse for all endpoints', async () => {
      mockReportService.createReport.mockResolvedValue(mockReport);
      mockReportService.queryReports.mockResolvedValue({
        reports: [],
        total: 0,
      });
      mockReportService.getReport.mockResolvedValue(mockReportDetails);
      mockReportService.batchExport.mockResolvedValue({
        downloadUrl: 'url',
        fileSize: 1024,
        reportCount: 1,
      });
      mockReportService.createScheduledReport.mockResolvedValue({});
      mockReportService.getUserScheduledReports.mockResolvedValue([]);
      mockReportService.updateScheduledReport.mockResolvedValue({});
      mockReportService.getReportStatistics.mockResolvedValue({
        totalReports: 0,
        byType: {},
        byFormat: {},
        recentTrend: [],
      });

      const createResult = await controller.createReport(mockRequest, {
        reportName: 'Test',
        reportType: 'usage_summary',
        reportPeriod: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      const queryResult = await controller.queryReports(mockRequest, {});
      const getResult = await controller.getReport('report-1');
      const batchResult = await controller.batchExport({
        reportIds: ['report-1'],
        exportFormat: 'pdf',
      });
      const scheduledResult = await controller.createScheduledReport(
        mockRequest,
        {
          reportName: 'Test',
          reportType: 'usage_summary',
          reportPeriod: 'weekly',
          cronExpression: '0 0 9 * * 1',
        },
      );
      const scheduledListResult =
        await controller.getScheduledReports(mockRequest);
      const updateResult = await controller.updateScheduledReport('sched-1', {
        reportName: 'Updated',
      });
      const executeResult =
        await controller.executeScheduledReport('sched-1');
      const statsResult = await controller.getStatistics(mockRequest);
      const downloadResult = await controller.downloadReport('report-1');

      expect(createResult.success).toBe(true);
      expect(queryResult.success).toBe(true);
      expect(getResult.success).toBe(true);
      expect(batchResult.success).toBe(true);
      expect(scheduledResult.success).toBe(true);
      expect(scheduledListResult.success).toBe(true);
      expect(updateResult.success).toBe(true);
      expect(executeResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
      expect(downloadResult.success).toBe(true);
    });

    it('should include messages for mutation endpoints', async () => {
      mockReportService.createReport.mockResolvedValue(mockReport);
      mockReportService.batchExport.mockResolvedValue({
        downloadUrl: 'url',
        fileSize: 1024,
        reportCount: 1,
      });
      mockReportService.createScheduledReport.mockResolvedValue({});
      mockReportService.updateScheduledReport.mockResolvedValue({});

      const createResult = await controller.createReport(mockRequest, {
        reportName: 'Test',
        reportType: 'usage_summary',
        reportPeriod: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      const batchResult = await controller.batchExport({
        reportIds: ['report-1'],
        exportFormat: 'pdf',
      });
      const scheduledResult = await controller.createScheduledReport(
        mockRequest,
        {
          reportName: 'Test',
          reportType: 'usage_summary',
          reportPeriod: 'weekly',
          cronExpression: '0 0 9 * * 1',
        },
      );
      const updateResult = await controller.updateScheduledReport('sched-1', {
        reportName: 'Updated',
      });

      expect(createResult.message).toBeDefined();
      expect(batchResult.message).toBeDefined();
      expect(scheduledResult.message).toBeDefined();
      expect(updateResult.message).toBeDefined();
    });
  });
});
