import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SagaOrchestratorService, EventBusService, SagaStatus } from '@cloudphone/shared';
import { PurchasePlanSagaV2 } from './purchase-plan-v2.saga';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { Plan, PlanType, BillingCycle } from '../billing/entities/plan.entity';

describe('PurchasePlanSagaV2', () => {
  let saga: PurchasePlanSagaV2;
  let sagaOrchestrator: jest.Mocked<SagaOrchestratorService>;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let planRepository: jest.Mocked<Repository<Plan>>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockPlan = {
    id: 'plan-123',
    name: 'Basic Plan',
    price: 99.99,
    isActive: true,
    description: 'Basic cloud phone plan',
    type: PlanType.BASIC,
    billingCycle: BillingCycle.MONTHLY,
    deviceQuota: 1,
    storageQuotaGB: 10,
    trafficQuotaGB: 100,
    features: [],
    metadata: {},
    isPublic: true,
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Plan;

  const mockOrder: Order = {
    id: 'order-456',
    userId: 'user-789',
    planId: 'plan-123',
    orderNumber: 'ORD1234567890',
    amount: 99.99,
    finalAmount: 99.99,
    status: OrderStatus.PENDING,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Order;

  beforeEach(async () => {
    const mockSagaOrchestrator = {
      executeSaga: jest.fn(),
      getSagaState: jest.fn(),
    };

    const mockOrderRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockPlanRepository = {
      findOne: jest.fn(),
    };

    const mockEventBus = {
      publishBillingEvent: jest.fn(),
      publishDeviceEvent: jest.fn(),
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasePlanSagaV2,
        {
          provide: SagaOrchestratorService,
          useValue: mockSagaOrchestrator,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Plan),
          useValue: mockPlanRepository,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    saga = module.get<PurchasePlanSagaV2>(PurchasePlanSagaV2);
    sagaOrchestrator = module.get(SagaOrchestratorService);
    orderRepository = module.get(getRepositoryToken(Order));
    planRepository = module.get(getRepositoryToken(Plan));
    eventBus = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startPurchase', () => {
    it('should start a new purchase saga and return saga ID', async () => {
      const userId = 'user-789';
      const planId = 'plan-123';
      const amount = 99.99;
      const expectedSagaId = 'payment_purchase-abc-123';

      sagaOrchestrator.executeSaga.mockResolvedValue(expectedSagaId);

      const result = await saga.startPurchase(userId, planId, amount);

      expect(result).toBe(expectedSagaId);
      expect(sagaOrchestrator.executeSaga).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PAYMENT_PURCHASE',
          timeoutMs: 5 * 60 * 1000,
          maxRetries: 3,
          steps: expect.arrayContaining([
            expect.objectContaining({ name: 'VALIDATE_PLAN' }),
            expect.objectContaining({ name: 'CREATE_ORDER' }),
            expect.objectContaining({ name: 'ALLOCATE_DEVICE' }),
            expect.objectContaining({ name: 'PROCESS_PAYMENT' }),
            expect.objectContaining({ name: 'ACTIVATE_ORDER' }),
          ]),
        }),
        expect.objectContaining({
          userId,
          planId,
          amount,
          startTime: expect.any(Date),
          attempts: {},
        })
      );
    });
  });

  describe('getSagaStatus', () => {
    it('should return saga state from orchestrator', async () => {
      const sagaId = 'payment_purchase-abc-123';
      const mockState = {
        sagaId,
        sagaType: 'PAYMENT_PURCHASE' as any,
        currentStep: 'CREATE_ORDER',
        stepIndex: 1,
        state: { userId: 'user-789' },
        status: SagaStatus.RUNNING,
        retryCount: 0,
        maxRetries: 3,
        startedAt: new Date(),
      };

      sagaOrchestrator.getSagaState.mockResolvedValue(mockState as any);

      const result = await saga.getSagaStatus(sagaId);

      expect(result).toEqual(mockState);
      expect(sagaOrchestrator.getSagaState).toHaveBeenCalledWith(sagaId);
    });
  });

  describe('Saga Steps - validatePlan', () => {
    it('should validate plan successfully', async () => {
      planRepository.findOne.mockResolvedValue(mockPlan);

      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        startTime: new Date(),
        attempts: {},
      };

      // Access private method for testing via any cast
      const result = await (saga as any).validatePlan(state);

      expect(result).toEqual({});
      expect(planRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'plan-123', isActive: true },
      });
    });

    it('should throw error if plan not found', async () => {
      planRepository.findOne.mockResolvedValue(null);

      const state = {
        userId: 'user-789',
        planId: 'plan-999',
        amount: 99.99,
        startTime: new Date(),
        attempts: {},
      };

      await expect((saga as any).validatePlan(state)).rejects.toThrow(
        'Plan plan-999 not found or inactive'
      );
    });

    it('should throw error if price mismatch', async () => {
      planRepository.findOne.mockResolvedValue(mockPlan);

      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 199.99, // Wrong price
        startTime: new Date(),
        attempts: {},
      };

      await expect((saga as any).validatePlan(state)).rejects.toThrow(
        'Price mismatch: expected 99.99, got 199.99'
      );
    });
  });

  describe('Saga Steps - createOrder', () => {
    it('should create order successfully', async () => {
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);

      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        startTime: new Date(),
        attempts: {},
      };

      const result = await (saga as any).createOrder(state);

      expect(result).toEqual({ orderId: 'order-456' });
      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-789',
          planId: 'plan-123',
          amount: 99.99,
          finalAmount: 99.99,
          status: OrderStatus.PENDING,
        })
      );
      expect(orderRepository.save).toHaveBeenCalled();
    });
  });

  describe('Saga Steps - cancelOrder (compensation)', () => {
    it('should cancel order and publish event', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        startTime: new Date(),
        attempts: {},
      };

      orderRepository.update.mockResolvedValue({} as any);
      eventBus.publishBillingEvent.mockResolvedValue();

      await (saga as any).cancelOrder(state);

      expect(orderRepository.update).toHaveBeenCalledWith('order-456', {
        status: OrderStatus.CANCELLED,
        cancelReason: 'Saga compensation',
        cancelledAt: expect.any(Date),
      });

      expect(eventBus.publishBillingEvent).toHaveBeenCalledWith(
        'order.cancelled',
        expect.objectContaining({
          orderId: 'order-456',
          userId: 'user-789',
          reason: 'Saga compensation',
        })
      );
    });

    it('should do nothing if orderId is missing', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        startTime: new Date(),
        attempts: {},
      };

      await (saga as any).cancelOrder(state);

      expect(orderRepository.update).not.toHaveBeenCalled();
      expect(eventBus.publishBillingEvent).not.toHaveBeenCalled();
    });
  });

  describe('Saga Steps - allocateDevice', () => {
    it('should allocate device successfully', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        startTime: new Date(),
        attempts: {},
      };

      eventBus.publishDeviceEvent.mockResolvedValue();
      orderRepository.update.mockResolvedValue({} as any);

      // Mock waitForDeviceAllocation to return a device ID
      jest.spyOn(saga as any, 'waitForDeviceAllocation').mockResolvedValue('device-123');

      const result = await (saga as any).allocateDevice(state);

      expect(result).toEqual({ deviceId: 'device-123' });
      expect(eventBus.publishDeviceEvent).toHaveBeenCalledWith(
        'allocate.requested',
        expect.objectContaining({
          orderId: 'order-456',
          userId: 'user-789',
          planId: 'plan-123',
        })
      );
      expect(orderRepository.update).toHaveBeenCalledWith('order-456', {
        deviceId: 'device-123',
      });
    });

    it('should throw error if device allocation fails', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        startTime: new Date(),
        attempts: {},
      };

      eventBus.publishDeviceEvent.mockResolvedValue();
      jest.spyOn(saga as any, 'waitForDeviceAllocation').mockResolvedValue(null);

      await expect((saga as any).allocateDevice(state)).rejects.toThrow('Device allocation failed');
    });
  });

  describe('Saga Steps - releaseDevice (compensation)', () => {
    it('should release device and publish event', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        deviceId: 'device-123',
        startTime: new Date(),
        attempts: {},
      };

      eventBus.publishDeviceEvent.mockResolvedValue();

      await (saga as any).releaseDevice(state);

      expect(eventBus.publishDeviceEvent).toHaveBeenCalledWith('release', {
        deviceId: 'device-123',
        userId: 'user-789',
        reason: 'Saga compensation',
        timestamp: expect.any(String),
      });
    });

    it('should do nothing if deviceId is missing', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        startTime: new Date(),
        attempts: {},
      };

      await (saga as any).releaseDevice(state);

      expect(eventBus.publishDeviceEvent).not.toHaveBeenCalled();
    });
  });

  describe('Saga Steps - processPayment', () => {
    it('should process payment successfully', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        deviceId: 'device-123',
        startTime: new Date(),
        attempts: {},
      };

      orderRepository.update.mockResolvedValue({} as any);

      const result = await (saga as any).processPayment(state);

      expect(result).toEqual({ paymentId: expect.stringContaining('PAY') });
      expect(orderRepository.update).toHaveBeenCalledWith('order-456', {
        status: OrderStatus.PAID,
        paidAt: expect.any(Date),
      });
    });
  });

  describe('Saga Steps - refundPayment (compensation)', () => {
    it('should refund payment successfully', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        deviceId: 'device-123',
        paymentId: 'PAY123456',
        startTime: new Date(),
        attempts: {},
      };

      orderRepository.update.mockResolvedValue({} as any);

      await (saga as any).refundPayment(state);

      expect(orderRepository.update).toHaveBeenCalledWith('order-456', {
        status: OrderStatus.REFUNDED,
        refundedAt: expect.any(Date),
      });
    });

    it('should do nothing if paymentId is missing', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        deviceId: 'device-123',
        startTime: new Date(),
        attempts: {},
      };

      await (saga as any).refundPayment(state);

      expect(orderRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Saga Steps - activateOrder', () => {
    it('should activate order and send notifications', async () => {
      const state = {
        userId: 'user-789',
        planId: 'plan-123',
        amount: 99.99,
        orderId: 'order-456',
        deviceId: 'device-123',
        paymentId: 'PAY123456',
        startTime: new Date(),
        attempts: {},
      };

      orderRepository.update.mockResolvedValue({} as any);
      eventBus.publishBillingEvent.mockResolvedValue();
      eventBus.publish.mockResolvedValue();

      const result = await (saga as any).activateOrder(state);

      expect(result).toEqual({});
      expect(orderRepository.update).toHaveBeenCalledWith('order-456', {
        status: OrderStatus.PAID,
        paidAt: expect.any(Date),
      });

      expect(eventBus.publishBillingEvent).toHaveBeenCalledWith(
        'order.completed',
        expect.objectContaining({
          orderId: 'order-456',
          userId: 'user-789',
          deviceId: 'device-123',
          amount: 99.99,
        })
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'notification.send',
        expect.objectContaining({
          userId: 'user-789',
          type: 'order_completed',
        })
      );
    });
  });
});
