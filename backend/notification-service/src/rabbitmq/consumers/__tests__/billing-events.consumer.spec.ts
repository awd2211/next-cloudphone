import { Test, TestingModule } from '@nestjs/testing';
import { BillingEventsConsumer } from '../billing-events.consumer';
import { NotificationsService } from '../../../notifications/notifications.service';
import { EmailService } from '../../../email/email.service';
import { TemplatesService } from '../../../templates/templates.service';
import {
  LowBalanceEvent,
  PaymentSuccessEvent,
  InvoiceGeneratedEvent,
} from '../../../types/events';

describe('BillingEventsConsumer', () => {
  let consumer: BillingEventsConsumer;
  let notificationsService: jest.Mocked<NotificationsService>;
  let emailService: jest.Mocked<EmailService>;
  let templatesService: jest.Mocked<TemplatesService>;

  const mockMsg = {
    fields: { routingKey: 'billing.low_balance' },
    properties: {},
    content: Buffer.from(''),
  } as any;

  beforeEach(async () => {
    const mockNotificationsService = {
      createRoleBasedNotification: jest.fn().mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        type: 'billing.low_balance',
        channels: ['websocket', 'email'],
      }),
    };

    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const mockTemplatesService = {
      render: jest.fn(),
      renderWithRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingEventsConsumer,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    consumer = module.get<BillingEventsConsumer>(BillingEventsConsumer);
    notificationsService = module.get(NotificationsService);
    emailService = module.get(EmailService);
    templatesService = module.get(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLowBalance', () => {
    it('should create role-based notification for low balance alert', async () => {
      const event: LowBalanceEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-001',
        eventType: 'billing.low_balance',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'user@example.com',
          currentBalance: 50.0,
          threshold: 100.0,
          daysRemaining: 5,
          detectedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleLowBalance(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'billing.low_balance',
        expect.objectContaining({
          username: 'testuser',
          balance: 50.0,
          threshold: 100.0,
          daysRemaining: 5,
          detectedAt: '2025-11-06T12:00:00Z',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should use default daysRemaining when not provided', async () => {
      const event: LowBalanceEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-002',
        eventType: 'billing.low_balance',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'user@example.com',
          currentBalance: 50.0,
          threshold: 100.0,
          detectedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleLowBalance(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'billing.low_balance',
        expect.objectContaining({
          daysRemaining: 3,
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: LowBalanceEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-003',
        eventType: 'billing.low_balance',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'user@example.com',
          currentBalance: 50.0,
          threshold: 100.0,
          detectedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      await expect(consumer.handleLowBalance(event, mockMsg)).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should create role-based notification for payment success', async () => {
      const event: PaymentSuccessEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-004',
        eventType: 'billing.payment_success',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'user@example.com',
          amount: 500.0,
          orderId: 'ORD-123456',
          paymentId: 'PAY-789012',
          paymentMethod: 'alipay',
          paidAt: '2025-11-06T12:00:00Z',
          newBalance: 1500.0,
        },
      };

      await consumer.handlePaymentSuccess(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'billing.payment_success',
        expect.objectContaining({
          username: 'testuser',
          amount: 500.0,
          orderId: 'ORD-123456',
          paymentId: 'PAY-789012',
          paymentMethod: 'alipay',
          paidAt: '2025-11-06T12:00:00Z',
          newBalance: 1500.0,
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should use default values for optional fields', async () => {
      const event: PaymentSuccessEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-005',
        eventType: 'billing.payment_success',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'admin',
          username: 'adminuser',
          userEmail: 'admin@example.com',
          amount: 1000.0,
          paymentId: 'PAY-789012',
          paymentMethod: 'Alipay',
          paidAt: '2025-11-06T12:00:00Z',
          newBalance: 2000.0,
        },
      };

      await consumer.handlePaymentSuccess(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'admin',
        'billing.payment_success',
        expect.objectContaining({
          orderId: expect.stringMatching(/^ORD-\d+$/),
          paymentMethod: 'Alipay',
          paidAt: '2025-11-06T12:00:00Z',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: PaymentSuccessEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-006',
        eventType: 'billing.payment_success',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          userEmail: 'user@example.com',
          amount: 500.0,
          paymentId: 'PAY-789012',
          paymentMethod: 'WeChat',
          paidAt: '2025-11-06T12:00:00Z',
          newBalance: 1500.0,
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(consumer.handlePaymentSuccess(event, mockMsg)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('handleInvoiceGenerated', () => {
    it('should create role-based notification for invoice generation', async () => {
      const event: InvoiceGeneratedEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-007',
        eventType: 'billing.invoice_generated',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'user@example.com',
          invoiceId: 'INV-202511-001',
          amount: 1200.0,
          month: '2025年11月',
          dueDate: '2025-11-30',
          generatedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleInvoiceGenerated(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'billing.invoice_generated',
        expect.objectContaining({
          username: 'testuser',
          month: '2025年11月',
          totalAmount: 1200.0,
          invoiceId: 'INV-202511-001',
          dueDate: '2025-11-30',
          generatedAt: '2025-11-06T12:00:00Z',
        }),
        expect.objectContaining({
          userEmail: 'user@example.com',
        })
      );
    });

    it('should generate default month when not provided', async () => {
      const event: InvoiceGeneratedEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-008',
        eventType: 'billing.invoice_generated',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'user@example.com',
          invoiceId: 'INV-202511-002',
          amount: 800.0,
          dueDate: '2025-11-30',
          generatedAt: '2025-11-06T12:00:00Z',
        },
      };

      await consumer.handleInvoiceGenerated(event, mockMsg);

      expect(notificationsService.createRoleBasedNotification).toHaveBeenCalledWith(
        'user-123',
        'user',
        'billing.invoice_generated',
        expect.objectContaining({
          month: expect.stringMatching(/\d{4}年\d{1,2}月/),
        }),
        expect.any(Object)
      );
    });

    it('should throw error when notification creation fails', async () => {
      const event: InvoiceGeneratedEvent = {
        version: '1.0',
        source: 'billing-service',
        eventId: 'event-009',
        eventType: 'billing.invoice_generated',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-123',
          userRole: 'user',
          username: 'testuser',
          email: 'user@example.com',
          invoiceId: 'INV-202511-003',
          amount: 1500.0,
          dueDate: '2025-11-30',
          generatedAt: '2025-11-06T12:00:00Z',
        },
      };

      notificationsService.createRoleBasedNotification.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(consumer.handleInvoiceGenerated(event, mockMsg)).rejects.toThrow(
        'Network error'
      );
    });
  });
});
