import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsAdminService } from './payments-admin.service';
import { PaymentStatus, PaymentMethod } from '../entities/payment.entity';

describe('PaymentsAdminController', () => {
  let controller: PaymentsAdminController;
  let paymentsAdminService: any;

  const mockPaymentsAdminService = {
    getPaymentStatistics: jest.fn(),
    getPaymentMethodsStatistics: jest.fn(),
    getDailyStatistics: jest.fn(),
    findAllWithPagination: jest.fn(),
    findOneWithRelations: jest.fn(),
    manualRefund: jest.fn(),
    getPendingRefunds: jest.fn(),
    approveRefund: jest.fn(),
    rejectRefund: jest.fn(),
    getExceptionPayments: jest.fn(),
    syncPaymentStatus: jest.fn(),
    exportPaymentsToExcel: jest.fn(),
    getPaymentConfig: jest.fn(),
    updatePaymentConfig: jest.fn(),
    testProviderConnection: jest.fn(),
    getWebhookLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsAdminController],
      providers: [
        {
          provide: PaymentsAdminService,
          useValue: mockPaymentsAdminService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsAdminController>(PaymentsAdminController);
    paymentsAdminService = module.get(PaymentsAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatistics', () => {
    it('should return payment statistics without date filter', async () => {
      const mockStats = {
        totalAmount: 100000,
        totalCount: 500,
        successAmount: 95000,
        successCount: 480,
        failedCount: 20,
        averageAmount: 200,
      };

      paymentsAdminService.getPaymentStatistics.mockResolvedValue(mockStats);

      const result: any = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.message).toBe('获取统计数据成功');
      expect(paymentsAdminService.getPaymentStatistics).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return payment statistics with date filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const mockStats = {
        totalAmount: 50000,
        totalCount: 250,
        period: { start: startDate, end: endDate },
      };

      paymentsAdminService.getPaymentStatistics.mockResolvedValue(mockStats);

      const result: any = await controller.getStatistics(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(paymentsAdminService.getPaymentStatistics).toHaveBeenCalledWith(startDate, endDate);
    });
  });

  describe('getPaymentMethodsStats', () => {
    it('should return payment methods statistics', async () => {
      const mockStats = {
        alipay: { count: 200, amount: 40000, percentage: 40 },
        wechat: { count: 180, amount: 36000, percentage: 36 },
        card: { count: 120, amount: 24000, percentage: 24 },
      };

      paymentsAdminService.getPaymentMethodsStatistics.mockResolvedValue(mockStats);

      const result: any = await controller.getPaymentMethodsStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.message).toBe('获取支付方式统计成功');
    });
  });

  describe('getDailyStatistics', () => {
    it('should return daily statistics for default 30 days', async () => {
      const mockStats = [
        { date: '2025-01-01', amount: 3000, count: 15 },
        { date: '2025-01-02', amount: 3500, count: 18 },
      ];

      paymentsAdminService.getDailyStatistics.mockResolvedValue(mockStats);

      const result: any = await controller.getDailyStatistics(30);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.message).toBe('获取每日统计成功');
      expect(paymentsAdminService.getDailyStatistics).toHaveBeenCalledWith(30);
    });

    it('should return daily statistics for custom days', async () => {
      const mockStats = [{ date: '2025-01-01', amount: 1500, count: 8 }];

      paymentsAdminService.getDailyStatistics.mockResolvedValue(mockStats);

      const result: any = await controller.getDailyStatistics(7);

      expect(result.data).toEqual(mockStats);
      expect(paymentsAdminService.getDailyStatistics).toHaveBeenCalledWith(7);
    });
  });

  describe('findAll', () => {
    it('should return paginated payment list without filters', async () => {
      const mockResult = {
        items: [
          { id: 'payment-1', amount: 100, status: PaymentStatus.SUCCESS },
          { id: 'payment-2', amount: 200, status: PaymentStatus.PENDING },
        ],
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      };

      paymentsAdminService.findAllWithPagination.mockResolvedValue(mockResult);

      const result: any = await controller.findAll(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.items);
      expect(result.pagination.total).toBe(2);
      expect(paymentsAdminService.findAllWithPagination).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        method: undefined,
        userId: undefined,
        startDate: undefined,
        endDate: undefined,
        search: undefined,
      });
    });

    it('should return payment list with status filter', async () => {
      const mockResult = {
        items: [{ id: 'payment-1', amount: 100, status: PaymentStatus.SUCCESS }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };

      paymentsAdminService.findAllWithPagination.mockResolvedValue(mockResult);

      const result: any = await controller.findAll(1, 20, PaymentStatus.SUCCESS);

      expect(result.data[0].status).toBe(PaymentStatus.SUCCESS);
    });
  });

  describe('findOne', () => {
    it('should return payment detail with relations', async () => {
      const mockPayment = {
        id: 'payment-123',
        amount: 500,
        status: PaymentStatus.SUCCESS,
        user: { id: 'user-123', name: 'Test User' },
        order: { id: 'order-456', items: [] },
      };

      paymentsAdminService.findOneWithRelations.mockResolvedValue(mockPayment);

      const result: any = await controller.findOne('payment-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayment);
      expect(result.message).toBe('获取支付详情成功');
      expect(paymentsAdminService.findOneWithRelations).toHaveBeenCalledWith('payment-123');
    });
  });

  describe('manualRefund', () => {
    it('should process manual refund successfully', async () => {
      const body = {
        amount: 100,
        reason: 'Customer request',
        adminNote: 'Approved by admin',
      };

      const mockResult = {
        id: 'refund-123',
        paymentId: 'payment-123',
        amount: 100,
        status: 'processing',
      };

      paymentsAdminService.manualRefund.mockResolvedValue(mockResult);

      const result: any = await controller.manualRefund('payment-123', body);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('退款处理成功');
      expect(paymentsAdminService.manualRefund).toHaveBeenCalledWith(
        'payment-123',
        100,
        'Customer request',
        'Approved by admin',
      );
    });

    it('should process partial refund', async () => {
      const body = {
        amount: 50,
        reason: 'Partial refund',
      };

      const mockResult = {
        id: 'refund-456',
        paymentId: 'payment-456',
        amount: 50,
        status: 'processing',
      };

      paymentsAdminService.manualRefund.mockResolvedValue(mockResult);

      const result: any = await controller.manualRefund('payment-456', body);

      expect(result.data.amount).toBe(50);
    });
  });

  describe('getPendingRefunds', () => {
    it('should return pending refunds list', async () => {
      const mockRefunds = [
        { id: 'refund-1', amount: 100, status: 'pending', createdAt: new Date() },
        { id: 'refund-2', amount: 200, status: 'pending', createdAt: new Date() },
      ];

      paymentsAdminService.getPendingRefunds.mockResolvedValue(mockRefunds);

      const result: any = await controller.getPendingRefunds();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefunds);
      expect(result.message).toBe('获取待审核退款成功');
    });
  });

  describe('approveRefund', () => {
    it('should approve refund successfully', async () => {
      const body = { adminNote: 'Approved' };
      const mockResult = {
        id: 'refund-123',
        status: 'approved',
        approvedBy: 'admin-123',
      };

      paymentsAdminService.approveRefund.mockResolvedValue(mockResult);

      const result: any = await controller.approveRefund('refund-123', body);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('退款已批准');
      expect(paymentsAdminService.approveRefund).toHaveBeenCalledWith('refund-123', 'Approved');
    });
  });

  describe('rejectRefund', () => {
    it('should reject refund successfully', async () => {
      const body = {
        reason: 'Invalid request',
        adminNote: 'Rejected',
      };

      paymentsAdminService.rejectRefund.mockResolvedValue(undefined);

      const result: any = await controller.rejectRefund('refund-123', body);

      expect(result.success).toBe(true);
      expect(result.message).toBe('退款已拒绝');
      expect(paymentsAdminService.rejectRefund).toHaveBeenCalledWith(
        'refund-123',
        'Invalid request',
        'Rejected',
      );
    });
  });

  describe('getExceptions', () => {
    it('should return exception payments list', async () => {
      const mockResult = {
        items: [
          { id: 'payment-1', status: 'failed', errorMessage: 'Payment timeout' },
          { id: 'payment-2', status: 'exception', errorMessage: 'Unknown error' },
        ],
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      };

      paymentsAdminService.getExceptionPayments.mockResolvedValue(mockResult);

      const result: any = await controller.getExceptions(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.items);
      expect(result.message).toBe('获取异常支付成功');
    });
  });

  describe('syncPaymentStatus', () => {
    it('should sync payment status successfully', async () => {
      const mockResult = {
        id: 'payment-123',
        oldStatus: 'pending',
        newStatus: 'success',
        syncedAt: new Date(),
      };

      paymentsAdminService.syncPaymentStatus.mockResolvedValue(mockResult);

      const result: any = await controller.syncPaymentStatus('payment-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('同步成功');
      expect(paymentsAdminService.syncPaymentStatus).toHaveBeenCalledWith('payment-123');
    });
  });

  describe('exportToExcel', () => {
    it('should export payments to Excel', async () => {
      const mockBuffer = Buffer.from('excel-data');

      paymentsAdminService.exportPaymentsToExcel.mockResolvedValue(mockBuffer);

      const result: any = await controller.exportToExcel();

      expect(result.success).toBe(true);
      expect(result.data.buffer).toBe(mockBuffer.toString('base64'));
      expect(result.data.filename).toMatch(/^payments_\d{4}-\d{2}-\d{2}\.xlsx$/);
      expect(result.message).toBe('导出成功');
    });

    it('should export with filters', async () => {
      const mockBuffer = Buffer.from('filtered-data');

      paymentsAdminService.exportPaymentsToExcel.mockResolvedValue(mockBuffer);

      const result: any = await controller.exportToExcel(
        '2025-01-01',
        '2025-01-31',
        PaymentStatus.SUCCESS,
        PaymentMethod.ALIPAY,
      );

      expect(result.success).toBe(true);
      expect(paymentsAdminService.exportPaymentsToExcel).toHaveBeenCalledWith({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: PaymentStatus.SUCCESS,
        method: PaymentMethod.ALIPAY,
      });
    });
  });

  describe('getPaymentConfig', () => {
    it('should return payment configuration', async () => {
      const mockConfig = {
        enabledMethods: [PaymentMethod.ALIPAY, PaymentMethod.WECHAT_PAY],
        enabledCurrencies: ['CNY', 'USD'],
        settings: {
          minAmount: 1,
          maxAmount: 100000,
        },
      };

      paymentsAdminService.getPaymentConfig.mockResolvedValue(mockConfig);

      const result: any = await controller.getPaymentConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(result.message).toBe('获取配置成功');
    });
  });

  describe('updatePaymentConfig', () => {
    it('should update payment configuration', async () => {
      const config = {
        enabledMethods: [PaymentMethod.ALIPAY],
        enabledCurrencies: ['CNY'],
        settings: { minAmount: 10 },
      };

      const mockResult = {
        ...config,
        updatedAt: new Date(),
      };

      paymentsAdminService.updatePaymentConfig.mockResolvedValue(mockResult);

      const result: any = await controller.updatePaymentConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('配置更新成功');
      expect(paymentsAdminService.updatePaymentConfig).toHaveBeenCalledWith(config);
    });
  });

  describe('testProvider', () => {
    it('should test provider connection successfully', async () => {
      const mockResult = {
        success: true,
        provider: PaymentMethod.ALIPAY,
        message: 'Connection successful',
        responseTime: 150,
      };

      paymentsAdminService.testProviderConnection.mockResolvedValue(mockResult);

      const result: any = await controller.testProvider(PaymentMethod.ALIPAY);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('连接测试成功');
      expect(paymentsAdminService.testProviderConnection).toHaveBeenCalledWith(PaymentMethod.ALIPAY);
    });

    it('should handle failed provider connection', async () => {
      const mockResult = {
        success: false,
        provider: PaymentMethod.WECHAT_PAY,
        message: 'Connection failed',
        error: 'Timeout',
      };

      paymentsAdminService.testProviderConnection.mockResolvedValue(mockResult);

      const result: any = await controller.testProvider(PaymentMethod.WECHAT_PAY);

      expect(result.success).toBe(false);
      expect(result.message).toBe('连接测试失败');
    });
  });

  describe('getWebhookLogs', () => {
    it('should return webhook logs', async () => {
      const mockResult = {
        items: [
          { id: 'log-1', provider: PaymentMethod.ALIPAY, status: 'success', createdAt: new Date() },
          { id: 'log-2', provider: PaymentMethod.WECHAT_PAY, status: 'failed', createdAt: new Date() },
        ],
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      };

      paymentsAdminService.getWebhookLogs.mockResolvedValue(mockResult);

      const result: any = await controller.getWebhookLogs(1, 50);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.items);
      expect(result.message).toBe('获取日志成功');
      expect(paymentsAdminService.getWebhookLogs).toHaveBeenCalledWith(1, 50, undefined);
    });

    it('should filter webhook logs by provider', async () => {
      const mockResult = {
        items: [{ id: 'log-1', provider: PaymentMethod.ALIPAY, status: 'success' }],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      };

      paymentsAdminService.getWebhookLogs.mockResolvedValue(mockResult);

      const result: any = await controller.getWebhookLogs(1, 50, PaymentMethod.ALIPAY);

      expect(result.data[0].provider).toBe(PaymentMethod.ALIPAY);
      expect(paymentsAdminService.getWebhookLogs).toHaveBeenCalledWith(1, 50, PaymentMethod.ALIPAY);
    });
  });
});
