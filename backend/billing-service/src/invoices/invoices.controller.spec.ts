import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InvoiceStatus, InvoiceType } from './entities/invoice.entity';

describe('InvoicesController', () => {
  let app: INestApplication;
  let service: InvoicesService;

  const mockInvoicesService = {
    createInvoice: jest.fn(),
    getInvoice: jest.fn(),
    getUserInvoices: jest.fn(),
    publishInvoice: jest.fn(),
    payInvoice: jest.fn(),
    cancelInvoice: jest.fn(),
    getInvoiceStatistics: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockInvoice = {
    id: 'invoice-123',
    invoiceNo: 'INV202501060001',
    userId: 'user-123',
    type: InvoiceType.MONTHLY,
    status: InvoiceStatus.DRAFT,
    amount: 10000, // 100.00 CNY
    currency: 'CNY',
    dueDate: new Date('2025-02-01'),
    items: [
      {
        description: 'Device usage for January',
        quantity: 1,
        unitPrice: 10000,
        amount: 10000,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<InvoicesService>(InvoicesService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * ✅ 响应格式验证测试
   *
   * ⚠️  注意：此控制器直接返回服务层数据,没有 { success: true, ... } 包装
   * - 与 payments.controller 的响应格式不一致
   * - 建议统一为标准格式
   */
  describe('Response Format Validation', () => {
    describe('POST /invoices - createInvoice', () => {
      it('should return created invoice', async () => {
        // Arrange
        mockInvoicesService.createInvoice.mockResolvedValue(mockInvoice);

        // Act
        const response = await request(app.getHttpServer())
          .post('/invoices')
          .send({
            userId: 'user-123',
            type: InvoiceType.MONTHLY,
            amount: 10000,
            currency: 'CNY',
            dueDate: '2025-02-01',
            items: [
              {
                description: 'Device usage',
                quantity: 1,
                unitPrice: 10000,
              },
            ],
          })
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('invoiceNo');
        expect(response.body).toHaveProperty('userId');
        expect(response.body).toHaveProperty('type');
        expect(response.body).toHaveProperty('status');
      });
    });

    describe('GET /invoices/:id - getInvoice', () => {
      it('should return single invoice', async () => {
        // Arrange
        mockInvoicesService.getInvoice.mockResolvedValue(mockInvoice);

        // Act
        const response = await request(app.getHttpServer())
          .get('/invoices/invoice-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toBe('invoice-123');
        expect(response.body).toHaveProperty('invoiceNo');
      });
    });

    describe('GET /invoices/user/:userId - getUserInvoices', () => {
      it('should return user invoices array', async () => {
        // Arrange
        mockInvoicesService.getUserInvoices.mockResolvedValue([
          mockInvoice,
          { ...mockInvoice, id: 'invoice-456' },
        ]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/invoices/user/user-123')
          .expect(200);

        // Assert
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toHaveProperty('id');
      });

      it('should support status filtering', async () => {
        // Arrange
        mockInvoicesService.getUserInvoices.mockResolvedValue([mockInvoice]);

        // Act
        await request(app.getHttpServer())
          .get('/invoices/user/user-123?status=published')
          .expect(200);

        // Assert
        expect(service.getUserInvoices).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            status: 'published',
          })
        );
      });

      it('should support type filtering', async () => {
        // Arrange
        mockInvoicesService.getUserInvoices.mockResolvedValue([mockInvoice]);

        // Act
        await request(app.getHttpServer())
          .get('/invoices/user/user-123?type=device_usage')
          .expect(200);

        // Assert
        expect(service.getUserInvoices).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            type: 'device_usage',
          })
        );
      });

      it('should support date range filtering', async () => {
        // Arrange
        mockInvoicesService.getUserInvoices.mockResolvedValue([mockInvoice]);

        // Act
        await request(app.getHttpServer())
          .get('/invoices/user/user-123?startDate=2025-01-01&endDate=2025-01-31')
          .expect(200);

        // Assert
        expect(service.getUserInvoices).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          })
        );
      });

      it('should support pagination', async () => {
        // Arrange
        mockInvoicesService.getUserInvoices.mockResolvedValue([mockInvoice]);

        // Act
        await request(app.getHttpServer())
          .get('/invoices/user/user-123?limit=20&offset=40')
          .expect(200);

        // Assert
        expect(service.getUserInvoices).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            limit: 20,
            offset: 40,
          })
        );
      });
    });

    describe('PUT /invoices/:id/publish - publishInvoice', () => {
      it('should return published invoice', async () => {
        // Arrange
        mockInvoicesService.publishInvoice.mockResolvedValue({
          ...mockInvoice,
          status: InvoiceStatus.PUBLISHED,
        });

        // Act
        const response = await request(app.getHttpServer())
          .put('/invoices/invoice-123/publish')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe(InvoiceStatus.PUBLISHED);
      });
    });

    describe('POST /invoices/:id/pay - payInvoice', () => {
      it('should return payment confirmation', async () => {
        // Arrange
        mockInvoicesService.payInvoice.mockResolvedValue({
          ...mockInvoice,
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymentId: 'payment-123',
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/invoices/invoice-123/pay')
          .send({
            paymentId: 'payment-123',
            paymentMethod: 'wechat',
          })
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe(InvoiceStatus.PAID);
        expect(response.body).toHaveProperty('paymentId');
      });

      it('should pass payment details to service', async () => {
        // Arrange
        mockInvoicesService.payInvoice.mockResolvedValue(mockInvoice);

        // Act
        await request(app.getHttpServer())
          .post('/invoices/invoice-123/pay')
          .send({
            paymentId: 'payment-456',
            paymentMethod: 'alipay',
          })
          .expect(200);

        // Assert
        expect(service.payInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice-123',
          paymentId: 'payment-456',
          paymentMethod: 'alipay',
        });
      });
    });

    describe('PUT /invoices/:id/cancel - cancelInvoice', () => {
      it('should return cancelled invoice', async () => {
        // Arrange
        mockInvoicesService.cancelInvoice.mockResolvedValue({
          ...mockInvoice,
          status: InvoiceStatus.CANCELLED,
          cancelReason: 'User request',
        });

        // Act
        const response = await request(app.getHttpServer())
          .put('/invoices/invoice-123/cancel')
          .send({ reason: 'User request' })
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe(InvoiceStatus.CANCELLED);
        expect(response.body).toHaveProperty('cancelReason');
      });

      it('should pass cancellation reason to service', async () => {
        // Arrange
        mockInvoicesService.cancelInvoice.mockResolvedValue(mockInvoice);

        // Act
        await request(app.getHttpServer())
          .put('/invoices/invoice-123/cancel')
          .send({ reason: 'Service not needed' })
          .expect(200);

        // Assert
        expect(service.cancelInvoice).toHaveBeenCalledWith(
          'invoice-123',
          'Service not needed'
        );
      });
    });

    describe('GET /invoices/statistics/:userId - getInvoiceStatistics', () => {
      it('should return invoice statistics', async () => {
        // Arrange
        mockInvoicesService.getInvoiceStatistics.mockResolvedValue({
          totalInvoices: 50,
          totalAmount: 500000, // 5000.00 CNY
          paidInvoices: 40,
          paidAmount: 400000,
          unpaidInvoices: 8,
          unpaidAmount: 80000,
          overdueInvoices: 2,
          overdueAmount: 20000,
          averageInvoiceAmount: 10000,
          averagePaymentTime: 3.5, // days
          byType: {
            device_usage: 30,
            app_purchase: 15,
            subscription: 5,
          },
          byMonth: {
            '2025-01': 150000,
            '2024-12': 120000,
          },
        });

        // Act
        const response = await request(app.getHttpServer())
          .get('/invoices/statistics/user-123')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('totalInvoices');
        expect(response.body).toHaveProperty('totalAmount');
        expect(response.body).toHaveProperty('paidInvoices');
        expect(response.body).toHaveProperty('unpaidInvoices');
        expect(response.body).toHaveProperty('overdueInvoices');
        expect(response.body).toHaveProperty('averageInvoiceAmount');
        expect(response.body).toHaveProperty('byType');
        expect(response.body).toHaveProperty('byMonth');
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('should call service with correct parameters', async () => {
      // Arrange
      mockInvoicesService.createInvoice.mockResolvedValue(mockInvoice);

      // Act
      await request(app.getHttpServer())
        .post('/invoices')
        .send({
          userId: 'user-123',
          type: InvoiceType.MONTHLY,
          amount: 10000,
        })
        .expect(201);

      // Assert
      expect(service.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: InvoiceType.MONTHLY,
          amount: 10000,
        })
      );
    });

    it('should convert date strings to Date objects', async () => {
      // Arrange
      mockInvoicesService.getUserInvoices.mockResolvedValue([]);

      // Act
      await request(app.getHttpServer())
        .get('/invoices/user/user-123?startDate=2025-01-01&endDate=2025-01-31')
        .expect(200);

      // Assert
      expect(service.getUserInvoices).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Invoice service unavailable');
      mockInvoicesService.getUserInvoices.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/invoices/user/user-123')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
