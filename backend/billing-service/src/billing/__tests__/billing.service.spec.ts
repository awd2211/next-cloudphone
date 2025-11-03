import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { Plan } from '../entities/plan.entity';
import { UsageRecord, UsageType } from '../entities/usage-record.entity';
import { PurchasePlanSagaV2 } from '../../sagas/purchase-plan-v2.saga';
import { SagaStatus, SagaType } from '@cloudphone/shared';

describe('BillingService', () => {
  let service: BillingService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let planRepository: jest.Mocked<Repository<Plan>>;
  let usageRecordRepository: jest.Mocked<Repository<UsageRecord>>;
  let purchasePlanSaga: jest.Mocked<PurchasePlanSagaV2>;

  // Mock 数据
  const mockPlan = {
    id: 'plan-123',
    name: '基础套餐',
    description: '适合个人用户',
    type: 'basic' as any,
    price: 99.99,
    billingCycle: 'monthly' as any,
    deviceQuota: 5,
    storageQuotaGB: 20,
    trafficQuotaGB: 100,
    features: ['customDomain', 'apiAccess'],
    metadata: {},
    isPublic: true,
    isActive: true,
    tenantId: undefined,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  } as unknown as Plan;

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    userName: 'testuser',
    userEmail: 'test@example.com',
    tenantId: undefined,
    orderNumber: 'ORD20251102000001',
    amount: 99.99,
    discountAmount: 0,
    finalAmount: 99.99,
    status: OrderStatus.PENDING,
    paymentMethod: undefined,
    planId: 'plan-123',
    deviceId: undefined,
    deviceName: undefined,
    description: undefined,
    metadata: {},
    transactionId: undefined,
    paidAt: undefined,
    cancelledAt: undefined,
    refundedAt: undefined,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 分钟后过期
    cancelReason: undefined,
    refundReason: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Order;

  const mockUsageRecord: UsageRecord = {
    id: 'usage-123',
    userId: 'user-123',
    deviceId: 'device-123',
    tenantId: 'tenant-123',
    usageType: UsageType.DEVICE_USAGE,
    startTime: new Date('2025-01-01T10:00:00'),
    endTime: new Date('2025-01-01T12:00:00'),
    durationSeconds: 7200, // 2 小时
    quantity: 1,
    cost: 2.0,
    isBilled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UsageRecord;

  beforeEach(async () => {
    const mockOrderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getCount: jest.fn(),
      })),
    };

    const mockPlanRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockUsageRecordRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      })),
    };

    const mockPurchasePlanSaga = {
      startPurchase: jest.fn(),
      getSagaStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Plan),
          useValue: mockPlanRepository,
        },
        {
          provide: getRepositoryToken(UsageRecord),
          useValue: mockUsageRecordRepository,
        },
        {
          provide: PurchasePlanSagaV2,
          useValue: mockPurchasePlanSaga,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    orderRepository = module.get(getRepositoryToken(Order));
    planRepository = module.get(getRepositoryToken(Plan));
    usageRecordRepository = module.get(getRepositoryToken(UsageRecord));
    purchasePlanSaga = module.get(PurchasePlanSagaV2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Plan Management', () => {
    describe('getPlans', () => {
      it('should return paginated plans', async () => {
        const plans = [mockPlan];
        planRepository.findAndCount.mockResolvedValue([plans, 1]);

        const result = await service.getPlans(1, 10);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(plans);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(planRepository.findAndCount).toHaveBeenCalledWith({
          where: { isPublic: true, isActive: true },
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 10,
        });
      });

      it('should handle pagination correctly for page 2', async () => {
        planRepository.findAndCount.mockResolvedValue([[], 0]);

        await service.getPlans(2, 10);

        expect(planRepository.findAndCount).toHaveBeenCalledWith({
          where: { isPublic: true, isActive: true },
          order: { createdAt: 'DESC' },
          skip: 10,
          take: 10,
        });
      });
    });

    describe('getPlan', () => {
      it('should return a plan by id', async () => {
        planRepository.findOne.mockResolvedValue(mockPlan);

        const result = await service.getPlan('plan-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPlan);
        expect(planRepository.findOne).toHaveBeenCalledWith({ where: { id: 'plan-123' } });
      });

      it('should throw NotFoundException when plan does not exist', async () => {
        planRepository.findOne.mockResolvedValue(null);

        await expect(service.getPlan('non-existent')).rejects.toThrow(NotFoundException);
        await expect(service.getPlan('non-existent')).rejects.toThrow('套餐不存在: non-existent');
      });
    });

    describe('createPlan', () => {
      it('should create a new plan', async () => {
        const planData = {
          name: '高级套餐',
          price: 199.99,
          duration: 30,
        };

        planRepository.create.mockReturnValue(mockPlan);
        planRepository.save.mockResolvedValue(mockPlan);

        const result = await service.createPlan(planData);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPlan);
        expect(result.message).toBe('套餐创建成功');
        expect(planRepository.create).toHaveBeenCalledWith(planData);
        expect(planRepository.save).toHaveBeenCalledWith(mockPlan);
      });
    });

    describe('updatePlan', () => {
      it('should update an existing plan', async () => {
        const updateData = { price: 149.99 };
        const updatedPlan = { ...mockPlan, ...updateData };

        planRepository.findOne.mockResolvedValue(mockPlan);
        planRepository.save.mockResolvedValue(updatedPlan);

        const result = await service.updatePlan('plan-123', updateData);

        expect(result.success).toBe(true);
        expect(result.data.price).toBe(149.99);
        expect(result.message).toBe('套餐更新成功');
        expect(planRepository.save).toHaveBeenCalled();
      });

      it('should throw NotFoundException when plan does not exist', async () => {
        planRepository.findOne.mockResolvedValue(null);

        await expect(service.updatePlan('non-existent', { price: 100 })).rejects.toThrow(
          NotFoundException
        );
        await expect(service.updatePlan('non-existent', { price: 100 })).rejects.toThrow(
          '套餐不存在: non-existent'
        );
      });
    });

    describe('deletePlan', () => {
      it('should delete a plan', async () => {
        planRepository.findOne.mockResolvedValue(mockPlan);
        planRepository.remove.mockResolvedValue(mockPlan);

        const result = await service.deletePlan('plan-123');

        expect(result.success).toBe(true);
        expect(result.message).toBe('套餐删除成功');
        expect(planRepository.remove).toHaveBeenCalledWith(mockPlan);
      });

      it('should throw NotFoundException when plan does not exist', async () => {
        planRepository.findOne.mockResolvedValue(null);

        await expect(service.deletePlan('non-existent')).rejects.toThrow(NotFoundException);
        await expect(service.deletePlan('non-existent')).rejects.toThrow(
          '套餐不存在: non-existent'
        );
      });
    });
  });

  describe('Order Management', () => {
    describe('createOrder', () => {
      it('should create order using Saga pattern', async () => {
        const createOrderDto = {
          userId: 'user-123',
          planId: 'plan-123',
        };

        // 使用新的 plan 副本，避免被前面测试修改
        const freshPlan = { ...mockPlan, price: 99.99 };
        planRepository.findOne.mockResolvedValue(freshPlan);
        purchasePlanSaga.startPurchase.mockResolvedValue('saga-123');

        const result = await service.createOrder(createOrderDto);

        expect(result.sagaId).toBe('saga-123');
        expect(result.message).toBe('订单创建中，请稍候...');
        expect(planRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'plan-123', isActive: true },
        });
        expect(purchasePlanSaga.startPurchase).toHaveBeenCalledWith(
          'user-123',
          'plan-123',
          99.99
        );
      });

      it('should throw NotFoundException when plan does not exist', async () => {
        planRepository.findOne.mockResolvedValue(null);

        await expect(
          service.createOrder({ userId: 'user-123', planId: 'non-existent' })
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.createOrder({ userId: 'user-123', planId: 'non-existent' })
        ).rejects.toThrow('套餐不存在或已下架: non-existent');
      });

      it('should throw NotFoundException when plan is inactive', async () => {
        const inactivePlan = { ...mockPlan, isActive: false };
        planRepository.findOne.mockResolvedValue(null); // findOne 使用 isActive: true 条件

        await expect(
          service.createOrder({ userId: 'user-123', planId: 'plan-123' })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getSagaStatus', () => {
      it('should return saga status', async () => {
        const mockStatus = {
          sagaId: 'saga-123',
          sagaType: SagaType.PAYMENT_PURCHASE,
          currentStep: 'create_order',
          stepIndex: 2,
          state: { orderId: 'order-123', userId: 'user-123' },
          status: SagaStatus.COMPLETED,
          retryCount: 0,
          maxRetries: 3,
          startedAt: new Date('2025-11-03T00:00:00Z'),
          completedAt: new Date('2025-11-03T00:01:00Z'),
        };

        purchasePlanSaga.getSagaStatus.mockResolvedValue(mockStatus);

        const result = await service.getSagaStatus('saga-123');

        expect(result).toEqual(mockStatus);
        expect(purchasePlanSaga.getSagaStatus).toHaveBeenCalledWith('saga-123');
      });
    });

    describe('getOrder', () => {
      it('should return an order by id', async () => {
        orderRepository.findOne.mockResolvedValue(mockOrder);

        const result = await service.getOrder('order-123');

        expect(result).toEqual(mockOrder);
        expect(orderRepository.findOne).toHaveBeenCalledWith({ where: { id: 'order-123' } });
      });

      it('should throw NotFoundException when order does not exist', async () => {
        orderRepository.findOne.mockResolvedValue(null);

        await expect(service.getOrder('non-existent')).rejects.toThrow(NotFoundException);
        await expect(service.getOrder('non-existent')).rejects.toThrow(
          '订单不存在: non-existent'
        );
      });
    });

    describe('updateOrderStatus', () => {
      it('should update order status to PAID', async () => {
        orderRepository.findOne.mockResolvedValue(mockOrder);
        const updatedOrder = {
          ...mockOrder,
          status: OrderStatus.PAID,
          paidAt: expect.any(Date),
        };
        orderRepository.save.mockResolvedValue(updatedOrder);

        const result = await service.updateOrderStatus('order-123', OrderStatus.PAID, {
          transactionId: 'tx-123',
        });

        expect(result.status).toBe(OrderStatus.PAID);
        expect(result.paidAt).toBeDefined();
        expect(orderRepository.save).toHaveBeenCalled();
      });

      it('should update order status to CANCELLED with reason', async () => {
        orderRepository.findOne.mockResolvedValue(mockOrder);
        const updatedOrder = {
          ...mockOrder,
          status: OrderStatus.CANCELLED,
          cancelledAt: expect.any(Date),
          cancelReason: '用户取消',
        };
        orderRepository.save.mockResolvedValue(updatedOrder);

        const result = await service.updateOrderStatus('order-123', OrderStatus.CANCELLED, {
          cancelReason: '用户取消',
        });

        expect(result.status).toBe(OrderStatus.CANCELLED);
        expect(result.cancelledAt).toBeDefined();
      });

      it('should update order status to REFUNDED with reason', async () => {
        const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
        orderRepository.findOne.mockResolvedValue(paidOrder);
        const refundedOrder = {
          ...paidOrder,
          status: OrderStatus.REFUNDED,
          refundedAt: expect.any(Date),
          refundReason: '商品缺陷',
        };
        orderRepository.save.mockResolvedValue(refundedOrder);

        const result = await service.updateOrderStatus('order-123', OrderStatus.REFUNDED, {
          refundReason: '商品缺陷',
        });

        expect(result.status).toBe(OrderStatus.REFUNDED);
        expect(result.refundedAt).toBeDefined();
      });
    });

    describe('cancelOrder', () => {
      it('should cancel a pending order', async () => {
        // 使用新的 PENDING 订单副本
        const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
        orderRepository.findOne.mockResolvedValue(pendingOrder);
        const cancelledOrder = {
          ...pendingOrder,
          status: OrderStatus.CANCELLED,
          cancelledAt: expect.any(Date),
          cancelReason: '不想要了',
        };
        orderRepository.save.mockResolvedValue(cancelledOrder);

        const result = await service.cancelOrder('order-123', '不想要了');

        expect(result.status).toBe(OrderStatus.CANCELLED);
        expect(result.cancelReason).toBe('不想要了');
        expect(orderRepository.save).toHaveBeenCalled();
      });

      it('should use default reason when no reason provided', async () => {
        // 使用新的 PENDING 订单副本，避免被前面测试修改
        const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
        orderRepository.findOne.mockResolvedValue(pendingOrder);
        const cancelledOrder = {
          ...pendingOrder,
          status: OrderStatus.CANCELLED,
          cancelReason: '用户主动取消',
        };
        orderRepository.save.mockResolvedValue(cancelledOrder);

        const result = await service.cancelOrder('order-123');

        expect(result.cancelReason).toBe('用户主动取消');
      });

      it('should throw BadRequestException when order is not pending', async () => {
        const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
        orderRepository.findOne.mockResolvedValue(paidOrder);

        await expect(service.cancelOrder('order-123')).rejects.toThrow(BadRequestException);
        await expect(service.cancelOrder('order-123')).rejects.toThrow(
          '只能取消待支付的订单，当前状态: paid'
        );
      });
    });

    describe('getUserOrders', () => {
      it('should return user orders ordered by creation date', async () => {
        const orders = [mockOrder];
        orderRepository.find.mockResolvedValue(orders);

        const result = await service.getUserOrders('user-123');

        expect(result).toEqual(orders);
        expect(orderRepository.find).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
          order: { createdAt: 'DESC' },
        });
      });

      it('should return empty array when user has no orders', async () => {
        orderRepository.find.mockResolvedValue([]);

        const result = await service.getUserOrders('user-123');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Usage Tracking', () => {
    describe('startUsage', () => {
      it('should create and start a usage record', async () => {
        const usageData = {
          userId: 'user-123',
          deviceId: 'device-123',
          tenantId: 'tenant-123',
          usageType: UsageType.DEVICE_USAGE,
        };

        const newRecord = {
          ...mockUsageRecord,
          id: undefined,
          startTime: expect.any(Date),
          quantity: 0,
          cost: 0,
        };

        usageRecordRepository.create.mockReturnValue(newRecord as any);
        usageRecordRepository.save.mockResolvedValue(mockUsageRecord);

        const result = await service.startUsage(usageData);

        expect(result).toEqual(mockUsageRecord);
        expect(usageRecordRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            deviceId: 'device-123',
            usageType: UsageType.DEVICE_USAGE,
          })
        );
        expect(usageRecordRepository.save).toHaveBeenCalled();
      });

      it('should default to DEVICE_USAGE type when not specified', async () => {
        const usageData = {
          userId: 'user-123',
          deviceId: 'device-123',
          tenantId: 'tenant-123',
        };

        usageRecordRepository.create.mockReturnValue({} as any);
        usageRecordRepository.save.mockResolvedValue(mockUsageRecord);

        await service.startUsage(usageData);

        expect(usageRecordRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            usageType: UsageType.DEVICE_USAGE,
          })
        );
      });
    });

    describe('stopUsage', () => {
      it('should stop usage and calculate cost', async () => {
        const startTime = new Date(Date.now() - 2 * 3600 * 1000); // 2 小时前
        const startRecord = {
          ...mockUsageRecord,
          endTime: null,
          durationSeconds: 0,
          cost: 0,
          startTime,
        };

        usageRecordRepository.findOne.mockResolvedValue(startRecord as any);

        // Mock save 并返回带真实计算值的对象
        usageRecordRepository.save.mockImplementation((record: any) => {
          const endTime = new Date();
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          const cost = (duration / 3600) * 1;

          return Promise.resolve({
            ...record,
            endTime,
            durationSeconds: duration,
            cost,
          });
        });

        const result = await service.stopUsage('usage-123');

        expect(result.endTime).toBeDefined();
        expect(result.durationSeconds).toBeGreaterThan(0);
        expect(result.cost).toBeGreaterThan(0);
        expect(usageRecordRepository.save).toHaveBeenCalled();
      });

      it('should throw error when usage record not found', async () => {
        usageRecordRepository.findOne.mockResolvedValue(null);

        await expect(service.stopUsage('non-existent')).rejects.toThrow('Usage record not found');
      });
    });

    describe('getUserUsage', () => {
      it('should return user usage within date range', async () => {
        const records = [mockUsageRecord];
        usageRecordRepository.find.mockResolvedValue(records);

        const result = await service.getUserUsage('user-123', '2025-01-01', '2025-01-31');

        expect(result.records).toEqual(records);
        expect(result.summary.totalDuration).toBe(7200);
        expect(result.summary.totalCost).toBe(2.0);
        expect(result.summary.recordCount).toBe(1);
      });

      it('should use default date range when dates not provided', async () => {
        usageRecordRepository.find.mockResolvedValue([]);

        const result = await service.getUserUsage('user-123', '', '');

        expect(usageRecordRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId: 'user-123',
              createdAt: expect.anything(),
            }),
          })
        );
        expect(result.summary.totalDuration).toBe(0);
        expect(result.summary.totalCost).toBe(0);
      });
    });
  });

  describe('Statistics', () => {
    describe('getStats', () => {
      it('should return billing statistics', async () => {
        // Mock order counts
        orderRepository.count
          .mockResolvedValueOnce(100) // totalOrders
          .mockResolvedValueOnce(20) // pendingOrders
          .mockResolvedValueOnce(70); // completedOrders

        // Mock query builders - 每次调用 createQueryBuilder 返回新的 mock 实例
        let qbCallCount = 0;
        (orderRepository.createQueryBuilder as jest.Mock).mockImplementation(() => {
          qbCallCount++;
          return {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue(
              qbCallCount === 1 ? { total: '10000' } : { total: '2000' }
            ),
            getCount: jest.fn().mockResolvedValue(15),
          };
        });

        planRepository.count.mockResolvedValue(5); // totalPlans

        usageRecordRepository.count.mockResolvedValue(500); // totalUsageRecords
        (usageRecordRepository.createQueryBuilder as jest.Mock).mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '1500' }),
        }));

        const result = await service.getStats();

        expect(result.orders.total).toBe(100);
        expect(result.orders.pending).toBe(20);
        expect(result.orders.completed).toBe(70);
        expect(result.orders.newThisMonth).toBe(15);
        expect(result.revenue.total).toBe(10000);
        expect(result.revenue.thisMonth).toBe(2000);
        expect(result.plans.total).toBe(5);
        expect(result.usage.totalRecords).toBe(500);
        expect(result.usage.totalCost).toBe(1500);
      });

      it('should handle tenant-specific statistics', async () => {
        orderRepository.count.mockResolvedValue(50);
        planRepository.count.mockResolvedValue(5);
        usageRecordRepository.count.mockResolvedValue(200);

        (orderRepository.createQueryBuilder as jest.Mock).mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
          getCount: jest.fn().mockResolvedValue(10),
        }));

        (usageRecordRepository.createQueryBuilder as jest.Mock).mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '800' }),
        }));

        const result = await service.getStats('tenant-123');

        expect(result).toBeDefined();
        expect(orderRepository.count).toHaveBeenCalledWith({
          where: { tenantId: 'tenant-123' },
        });
      });
    });
  });
});
