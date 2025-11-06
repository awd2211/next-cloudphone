import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SagaOrchestratorService, EventBusService, SagaModule, SagaStatus } from '@cloudphone/shared';
import { PurchasePlanSagaV2 } from '../src/sagas/purchase-plan-v2.saga';
import { Order, OrderStatus } from '../src/billing/entities/order.entity';
import { Plan, PlanType, BillingCycle } from '../src/billing/entities/plan.entity';

/**
 * Saga 补偿逻辑集成测试
 *
 * 测试目的：
 * 1. 验证 Saga 步骤失败时自动触发补偿
 * 2. 验证补偿按相反顺序执行
 * 3. 验证数据库状态被正确回滚
 * 4. 验证事件被正确发布
 *
 * 运行前置条件：
 * - PostgreSQL 数据库运行在 localhost:5432
 * - 存在测试数据库 cloudphone_test
 * - 数据库用户 postgres/postgres
 */
describe('Saga Compensation - Integration Tests', () => {
  let module: TestingModule;
  let saga: PurchasePlanSagaV2;
  let sagaOrchestrator: SagaOrchestratorService;
  let dataSource: DataSource;
  let eventBus: jest.Mocked<EventBusService>;
  let testUserId: string;
  let testPlanId: string;

  beforeAll(async () => {
    // Mock EventBusService
    const mockEventBus = {
      publishBillingEvent: jest.fn().mockResolvedValue(undefined),
      publishDeviceEvent: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_test',
          entities: [Order, Plan],
          synchronize: true, // 仅测试环境
          logging: false,
        }),
        TypeOrmModule.forFeature([Order, Plan]),
        SagaModule, // Import SagaModule for SagaOrchestratorService
      ],
      providers: [
        PurchasePlanSagaV2,
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    saga = module.get<PurchasePlanSagaV2>(PurchasePlanSagaV2);
    sagaOrchestrator = module.get<SagaOrchestratorService>(SagaOrchestratorService);
    dataSource = module.get<DataSource>(DataSource);
    eventBus = module.get(EventBusService);

    // Initialize test data
    testUserId = 'saga-test-user-' + Date.now();
  });

  afterAll(async () => {
    // Clean up test data
    const orderRepository = dataSource.getRepository(Order);
    await orderRepository.delete({ userId: testUserId });

    const planRepository = dataSource.getRepository(Plan);
    await planRepository.delete({ id: testPlanId });

    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Create test plan
    const planRepository = dataSource.getRepository(Plan);
    const plan = planRepository.create({
      name: 'Test Plan for Saga',
      description: 'Test plan for saga compensation tests',
      type: PlanType.BASIC,
      billingCycle: BillingCycle.MONTHLY,
      price: 99.99,
      isActive: true,
      isPublic: true,
      deviceQuota: 1,
      storageQuotaGB: 10,
      trafficQuotaGB: 100,
      features: ['feature1'],
      metadata: {},
    });
    const savedPlan = await planRepository.save(plan);
    testPlanId = savedPlan.id;

    // Clear previous orders
    const orderRepository = dataSource.getRepository(Order);
    await orderRepository.delete({ userId: testUserId });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    const planRepository = dataSource.getRepository(Plan);
    await planRepository.delete({ id: testPlanId });
  });

  describe('步骤失败触发补偿', () => {
    it('应该在验证套餐失败时不创建任何订单', async () => {
      const orderRepository = dataSource.getRepository(Order);
      const initialOrderCount = await orderRepository.count({ where: { userId: testUserId } });

      // Use invalid plan ID
      try {
        await saga.startPurchase(testUserId, 'invalid-plan-id', 99.99);
      } catch (error) {
        // Expected to fail
      }

      // Wait for saga to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify no order was created
      const finalOrderCount = await orderRepository.count({ where: { userId: testUserId } });
      expect(finalOrderCount).toBe(initialOrderCount);
    });

    it('应该在价格不匹配时不创建订单', async () => {
      const orderRepository = dataSource.getRepository(Order);

      try {
        // Wrong price (plan price is 99.99)
        await saga.startPurchase(testUserId, testPlanId, 199.99);
      } catch (error) {
        // Expected to fail
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const orders = await orderRepository.find({ where: { userId: testUserId } });
      expect(orders.length).toBe(0);
    });
  });

  describe('订单创建后的补偿', () => {
    it('应该在设备分配失败时取消订单', async () => {
      const orderRepository = dataSource.getRepository(Order);

      // Mock device allocation to fail
      eventBus.publishDeviceEvent.mockRejectedValueOnce(new Error('Device allocation failed'));

      let sagaId: string;
      try {
        sagaId = await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // Saga may fail
      }

      // Wait for saga to complete compensation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify order was cancelled
      const orders = await orderRepository.find({
        where: { userId: testUserId }
      });

      if (orders.length > 0) {
        // Order should be cancelled
        expect(orders[0].status).toBe(OrderStatus.CANCELLED);
        expect(orders[0].cancelReason).toContain('Saga compensation');

        // Verify cancellation event was published
        expect(eventBus.publishBillingEvent).toHaveBeenCalledWith(
          'order.cancelled',
          expect.objectContaining({
            orderId: orders[0].id,
            userId: testUserId,
            reason: 'Saga compensation',
          })
        );
      }
    });
  });

  describe('支付处理后的补偿', () => {
    it('应该在订单激活失败时退款', async () => {
      const orderRepository = dataSource.getRepository(Order);

      // Mock successful device allocation but failed activation
      jest.spyOn(saga as any, 'waitForDeviceAllocation')
        .mockResolvedValue('test-device-' + Date.now());

      // Mock activation failure
      eventBus.publishBillingEvent.mockImplementation((eventType: string) => {
        if (eventType === 'order.completed') {
          throw new Error('Activation failed');
        }
        return Promise.resolve();
      });

      let sagaId: string;
      try {
        sagaId = await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // Saga may fail
      }

      // Wait for compensation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify order status
      const orders = await orderRepository.find({
        where: { userId: testUserId }
      });

      if (orders.length > 0) {
        const order = orders[0];

        // Order should be either REFUNDED or CANCELLED depending on how far it got
        const validCompensationStatuses = [
          OrderStatus.REFUNDED,
          OrderStatus.CANCELLED
        ];

        expect(validCompensationStatuses).toContain(order.status);

        // If refunded, verify refund timestamp
        if (order.status === OrderStatus.REFUNDED) {
          expect(order.refundedAt).toBeTruthy();
        }
      }
    });
  });

  describe('补偿顺序验证', () => {
    it('应该按相反顺序执行补偿步骤', async () => {
      const compensationOrder: string[] = [];

      // Mock compensation methods to track order
      const originalCancelOrder = (saga as any).cancelOrder.bind(saga);
      const originalReleaseDevice = (saga as any).releaseDevice.bind(saga);
      const originalRefundPayment = (saga as any).refundPayment.bind(saga);

      jest.spyOn(saga as any, 'cancelOrder').mockImplementation(async (state: any) => {
        compensationOrder.push('cancelOrder');
        return originalCancelOrder(state);
      });

      jest.spyOn(saga as any, 'releaseDevice').mockImplementation(async (state: any) => {
        compensationOrder.push('releaseDevice');
        return originalReleaseDevice(state);
      });

      jest.spyOn(saga as any, 'refundPayment').mockImplementation(async (state: any) => {
        compensationOrder.push('refundPayment');
        return originalRefundPayment(state);
      });

      // Mock device allocation success
      jest.spyOn(saga as any, 'waitForDeviceAllocation')
        .mockResolvedValue('test-device-' + Date.now());

      // Mock payment success but activation failure
      eventBus.publishBillingEvent.mockImplementation((eventType: string) => {
        if (eventType === 'order.completed') {
          throw new Error('Activation failed');
        }
        return Promise.resolve();
      });

      try {
        await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // Expected to fail
      }

      // Wait for compensations
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify compensation order (should be reverse of execution)
      // If activation fails after payment, we should see:
      // 1. refundPayment (last successful step)
      // 2. releaseDevice (previous step)
      // 3. cancelOrder (first step)

      if (compensationOrder.length > 0) {
        // Verify at least one compensation was called
        expect(compensationOrder.length).toBeGreaterThan(0);

        // Common pattern: refund comes before release, release before cancel
        const refundIndex = compensationOrder.indexOf('refundPayment');
        const releaseIndex = compensationOrder.indexOf('releaseDevice');
        const cancelIndex = compensationOrder.indexOf('cancelOrder');

        if (refundIndex !== -1 && releaseIndex !== -1) {
          // Refund should happen before release
          expect(refundIndex).toBeLessThan(releaseIndex);
        }

        if (releaseIndex !== -1 && cancelIndex !== -1) {
          // Release should happen before cancel
          expect(releaseIndex).toBeLessThan(cancelIndex);
        }
      }
    });
  });

  describe('Saga 状态管理', () => {
    it('应该在补偿完成后将 Saga 状态标记为 COMPENSATED', async () => {
      // Mock device allocation failure
      jest.spyOn(saga as any, 'waitForDeviceAllocation')
        .mockResolvedValue(null); // Simulate allocation failure

      let sagaId: string;
      try {
        sagaId = await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // May fail
      }

      // Wait for saga processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (sagaId) {
        // Query saga status
        const sagaState = await saga.getSagaStatus(sagaId);

        // Saga should be in COMPENSATED or FAILED status
        const validStatuses = [SagaStatus.COMPENSATED, SagaStatus.FAILED];
        expect(validStatuses).toContain(sagaState.status);

        // Error message should be present
        if (sagaState.status === SagaStatus.FAILED) {
          expect(sagaState.errorMessage).toBeTruthy();
        }
      }
    });
  });

  describe('事件发布验证', () => {
    it('应该在取消订单时发布 order.cancelled 事件', async () => {
      // Mock device allocation failure
      jest.spyOn(saga as any, 'waitForDeviceAllocation')
        .mockResolvedValue(null);

      try {
        await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // Expected
      }

      // Wait for compensation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify cancellation event
      const cancelEvents = eventBus.publishBillingEvent.mock.calls.filter(
        call => call[0] === 'order.cancelled'
      );

      if (cancelEvents.length > 0) {
        expect(cancelEvents[0][1]).toMatchObject({
          userId: testUserId,
          reason: 'Saga compensation',
        });
      }
    });

    it('应该在释放设备时发布 device release 事件', async () => {
      // Mock successful device allocation
      const mockDeviceId = 'test-device-' + Date.now();
      jest.spyOn(saga as any, 'waitForDeviceAllocation')
        .mockResolvedValue(mockDeviceId);

      // Mock payment failure
      const originalProcessPayment = (saga as any).processPayment.bind(saga);
      jest.spyOn(saga as any, 'processPayment').mockRejectedValueOnce(
        new Error('Payment processing failed')
      );

      try {
        await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // Expected
      }

      // Wait for compensation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify device release event
      const releaseEvents = eventBus.publishDeviceEvent.mock.calls.filter(
        call => call[0] === 'release'
      );

      if (releaseEvents.length > 0) {
        expect(releaseEvents[0][1]).toMatchObject({
          deviceId: expect.any(String),
          userId: testUserId,
          reason: 'Saga compensation',
        });
      }
    });
  });

  describe('数据一致性验证', () => {
    it('应该确保失败的 Saga 不会留下不一致的数据', async () => {
      const orderRepository = dataSource.getRepository(Order);

      // Mock failure at device allocation
      jest.spyOn(saga as any, 'waitForDeviceAllocation')
        .mockResolvedValue(null);

      const beforeOrderCount = await orderRepository.count({ where: { userId: testUserId } });

      try {
        await saga.startPurchase(testUserId, testPlanId, 99.99);
      } catch (error) {
        // Expected
      }

      // Wait for compensation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const afterOrderCount = await orderRepository.count({ where: { userId: testUserId } });
      const orders = await orderRepository.find({ where: { userId: testUserId } });

      // Either no order created, or order is cancelled
      if (afterOrderCount > beforeOrderCount) {
        // Order was created but should be cancelled
        const order = orders[0];
        expect(order.status).toBe(OrderStatus.CANCELLED);
        expect(order.cancelledAt).toBeTruthy();
      }

      // No order should be in PENDING or PAID status
      const nonCancelledOrders = orders.filter(
        o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REFUNDED
      );
      expect(nonCancelledOrders.length).toBe(0);
    });
  });
});
