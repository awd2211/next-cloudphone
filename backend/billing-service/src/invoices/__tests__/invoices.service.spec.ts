import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoicesService, CreateInvoiceDto } from '../invoices.service';
import { Invoice, InvoiceStatus, InvoiceType, InvoiceItem } from '../entities/invoice.entity';
import { createMockInvoice } from '../../__tests__/helpers/mock-factories';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepository: jest.Mocked<Repository<Invoice>>;

  const mockInvoiceItems: InvoiceItem[] = [
    {
      id: 'item-1',
      description: '云手机设备使用费',
      quantity: 10,
      unitPrice: 9.99,
      amount: 99.9,
    },
    {
      id: 'item-2',
      description: '流量费用',
      quantity: 5,
      unitPrice: 2.0,
      amount: 10.0,
    },
  ];

  const mockInvoice: Invoice = createMockInvoice({
    id: 'invoice-123',
    invoiceNumber: 'INV-202510-000001',
    userId: 'user-123',
    type: InvoiceType.MONTHLY,
    status: InvoiceStatus.DRAFT,
    subtotal: 109.9,
    tax: 10.99,
    discount: 5.0,
    total: 115.89,
    items: mockInvoiceItems,
    dueDate: new Date('2025-11-15'),
    notes: 'Test invoice',
    metadata: { test: true } as any,
  });

  beforeEach(async () => {
    const mockInvoiceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getMany: jest.fn(),
        getOne: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    invoiceRepository = module.get(getRepositoryToken(Invoice));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Invoice Creation', () => {
    it('should create an invoice successfully', async () => {
      const createDto: CreateInvoiceDto = {
        userId: 'user-123',
        type: InvoiceType.MONTHLY,
        items: mockInvoiceItems,
        billingPeriodStart: new Date('2025-10-01'),
        billingPeriodEnd: new Date('2025-10-31'),
        dueDate: new Date('2025-11-15'),
        tax: 10.99,
        discount: 5.0,
        notes: 'Test invoice',
      };

      const createdInvoice = createMockInvoice(mockInvoice);

      // Mock query builder for generateInvoiceNumber
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      invoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      invoiceRepository.create.mockReturnValue(createdInvoice);
      invoiceRepository.save.mockResolvedValue(createdInvoice);

      const result = await service.createInvoice(createDto);

      expect(result).toBeDefined();
      expect(createdInvoice.calculateTotal).toHaveBeenCalled();
      expect(invoiceRepository.save).toHaveBeenCalled();
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: InvoiceType.MONTHLY,
          status: InvoiceStatus.DRAFT,
        })
      );
    });

    it('should generate unique invoice number', async () => {
      const createDto: CreateInvoiceDto = {
        userId: 'user-123',
        type: InvoiceType.MONTHLY,
        items: mockInvoiceItems,
        billingPeriodStart: new Date('2025-10-01'),
        billingPeriodEnd: new Date('2025-10-31'),
        dueDate: new Date('2025-11-15'),
      };

      const lastInvoice = {
        invoiceNumber: 'INV-202510-000005',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(lastInvoice),
      };

      invoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const createdInvoice = createMockInvoice({
        ...mockInvoice,
        invoiceNumber: 'INV-202510-000006',
      });

      invoiceRepository.create.mockReturnValue(createdInvoice);
      invoiceRepository.save.mockResolvedValue(createdInvoice);

      const result = await service.createInvoice(createDto);

      expect(result.invoiceNumber).toMatch(/^INV-\d{6}-\d{6}$/);
    });
  });

  describe('Invoice Retrieval', () => {
    it('should get invoice by id', async () => {
      invoiceRepository.findOne.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('invoice-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('invoice-123');
      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(service.getInvoice('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getInvoice('non-existent')).rejects.toThrow('账单 non-existent 未找到');
    });

    it('should update invoice to OVERDUE if past due date', async () => {
      const overdueInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.PENDING,
        dueDate: new Date('2025-09-01'), // Past date
        isOverdue: jest.fn().mockReturnValue(true),
      });

      invoiceRepository.findOne.mockResolvedValue(overdueInvoice);
      invoiceRepository.save.mockResolvedValue(
        createMockInvoice({
          ...overdueInvoice,
          status: InvoiceStatus.OVERDUE,
        })
      );

      const result = await service.getInvoice('invoice-123');

      expect(result.status).toBe(InvoiceStatus.OVERDUE);
      expect(invoiceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InvoiceStatus.OVERDUE,
        })
      );
    });

    it('should get user invoices with filters', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue([mockInvoice]),
      };

      invoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUserInvoices('user-123', {
        status: InvoiceStatus.PENDING,
        limit: 10,
        offset: 0,
      });

      expect(result.invoices).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('Invoice Status Updates', () => {
    it('should publish invoice from DRAFT to PENDING', async () => {
      const draftInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.DRAFT,
      });

      invoiceRepository.findOne.mockResolvedValue(draftInvoice);
      invoiceRepository.save.mockResolvedValue(
        createMockInvoice({
          ...draftInvoice,
          status: InvoiceStatus.PENDING,
        })
      );

      const result = await service.publishInvoice('invoice-123');

      expect(result.status).toBe(InvoiceStatus.PENDING);
      expect(invoiceRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when publishing non-draft invoice', async () => {
      const pendingInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.PENDING,
      });

      invoiceRepository.findOne.mockResolvedValue(pendingInvoice);

      await expect(service.publishInvoice('invoice-123')).rejects.toThrow(BadRequestException);
      await expect(service.publishInvoice('invoice-123')).rejects.toThrow('只能发布草稿账单');
    });

    it('should pay invoice successfully', async () => {
      const pendingInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.PENDING,
      });

      invoiceRepository.findOne.mockResolvedValue(pendingInvoice);
      invoiceRepository.save.mockResolvedValue(
        createMockInvoice({
          ...pendingInvoice,
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymentId: 'payment-123',
          paymentMethod: 'wechat' as any,
        })
      );

      const result = await service.payInvoice({
        invoiceId: 'invoice-123',
        paymentId: 'payment-123',
        paymentMethod: 'wechat',
      });

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paymentId).toBe('payment-123');
      expect(result.paidAt).toBeDefined();
    });

    it('should throw BadRequestException when paying non-pending invoice', async () => {
      const paidInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      });

      invoiceRepository.findOne.mockResolvedValue(paidInvoice);

      await expect(
        service.payInvoice({
          invoiceId: 'invoice-123',
          paymentId: 'payment-123',
          paymentMethod: 'wechat',
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.payInvoice({
          invoiceId: 'invoice-123',
          paymentId: 'payment-123',
          paymentMethod: 'wechat',
        })
      ).rejects.toThrow('只能支付待支付状态的账单');
    });

    it('should cancel invoice successfully', async () => {
      const cancelableInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.DRAFT,
        canCancel: jest.fn().mockReturnValue(true),
      });

      invoiceRepository.findOne.mockResolvedValue(cancelableInvoice);
      invoiceRepository.save.mockResolvedValue(
        createMockInvoice({
          ...cancelableInvoice,
          status: InvoiceStatus.CANCELLED,
          notes: '取消原因: User request',
        })
      );

      const result = await service.cancelInvoice('invoice-123', 'User request');

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(result.notes).toContain('取消原因: User request');
    });

    it('should throw BadRequestException when canceling non-cancelable invoice', async () => {
      const paidInvoice = createMockInvoice({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
        canCancel: jest.fn().mockReturnValue(false),
      });

      invoiceRepository.findOne.mockResolvedValue(paidInvoice);

      await expect(service.cancelInvoice('invoice-123', 'Test')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelInvoice('invoice-123', 'Test')).rejects.toThrow('该账单无法取消');
    });
  });

  describe('Invoice Statistics', () => {
    it('should return invoice statistics for user', async () => {
      const invoices = [
        { ...mockInvoice, status: InvoiceStatus.PENDING, total: 100 },
        { ...mockInvoice, status: InvoiceStatus.PAID, total: 200 },
        { ...mockInvoice, status: InvoiceStatus.OVERDUE, total: 50 },
      ];

      invoiceRepository.count
        .mockResolvedValueOnce(3) // totalInvoices
        .mockResolvedValueOnce(1) // pendingInvoices
        .mockResolvedValueOnce(1) // paidInvoices
        .mockResolvedValueOnce(1); // overdueInvoices

      invoiceRepository.find.mockResolvedValue(invoices as any);

      const result = await service.getInvoiceStatistics('user-123');

      expect(result.totalInvoices).toBe(3);
      expect(result.pendingInvoices).toBe(1);
      expect(result.paidInvoices).toBe(1);
      expect(result.overdueInvoices).toBe(1);
      expect(result.totalAmount).toBe(350);
      expect(result.pendingAmount).toBe(100);
      expect(result.paidAmount).toBe(200);
    });
  });

  describe('Scheduled Tasks', () => {
    it('should check overdue invoices', async () => {
      const overdueInvoices = [
        {
          ...mockInvoice,
          status: InvoiceStatus.PENDING,
          dueDate: new Date('2025-09-01'),
        },
        {
          ...mockInvoice,
          id: 'invoice-456',
          status: InvoiceStatus.PENDING,
          dueDate: new Date('2025-09-15'),
        },
      ];

      invoiceRepository.find.mockResolvedValue(overdueInvoices as any);
      invoiceRepository.save.mockImplementation((invoice: any) => Promise.resolve(invoice as any));

      await service.checkOverdueInvoices();

      expect(invoiceRepository.find).toHaveBeenCalledWith({
        where: {
          status: InvoiceStatus.PENDING,
          dueDate: Between(new Date('1970-01-01'), expect.any(Date)),
        },
      });
      expect(invoiceRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
