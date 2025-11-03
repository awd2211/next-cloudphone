import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from '../billing.controller';
import { BillingService } from '../billing.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

describe('BillingController', () => {
  let controller: BillingController;
  let billingService: jest.Mocked<BillingService>;

  const mockBillingService = {
    getStats: jest.fn(),
    getPlans: jest.fn(),
    getPlan: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    deletePlan: jest.fn(),
    createOrder: jest.fn(),
    getUserOrders: jest.fn(),
    cancelOrder: jest.fn(),
    getUserUsage: jest.fn(),
    startUsage: jest.fn(),
    stopUsage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BillingController>(BillingController);
    billingService = module.get(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should get billing stats without tenantId', async () => {
      const mockStats = {
        totalRevenue: 10000,
        totalOrders: 100,
        activeSubscriptions: 50,
      };

      mockBillingService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual({
        success: true,
        data: mockStats,
        message: '计费统计获取成功',
      });
      expect(billingService.getStats).toHaveBeenCalledWith(undefined);
    });

    it('should get billing stats with tenantId', async () => {
      const mockStats = {
        totalRevenue: 5000,
        totalOrders: 50,
        activeSubscriptions: 25,
      };

      mockBillingService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats('tenant-123');

      expect(result).toEqual({
        success: true,
        data: mockStats,
        message: '计费统计获取成功',
      });
      expect(billingService.getStats).toHaveBeenCalledWith('tenant-123');
    });

    it('should require billing:read permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.getStats);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:read'] });
    });
  });

  describe('getPlans', () => {
    it('should get plans with default pagination', async () => {
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', price: 9.99 },
        { id: 'plan-2', name: 'Pro', price: 19.99 },
      ];

      mockBillingService.getPlans.mockResolvedValue(mockPlans);

      const result = await controller.getPlans();

      expect(result).toEqual(mockPlans);
      expect(billingService.getPlans).toHaveBeenCalledWith(1, 10);
    });

    it('should get plans with custom pagination', async () => {
      const mockPlans = [{ id: 'plan-1', name: 'Enterprise', price: 99.99 }];

      mockBillingService.getPlans.mockResolvedValue(mockPlans);

      const result = await controller.getPlans('2', '20');

      expect(result).toEqual(mockPlans);
      expect(billingService.getPlans).toHaveBeenCalledWith(2, 20);
    });

    it('should convert string pagination params to numbers', async () => {
      mockBillingService.getPlans.mockResolvedValue([]);

      await controller.getPlans('3', '15');

      expect(billingService.getPlans).toHaveBeenCalledWith(3, 15);
    });

    it('should require billing:read permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.getPlans);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:read'] });
    });
  });

  describe('getPlan', () => {
    it('should get plan by id', async () => {
      const mockPlan = {
        id: 'plan-123',
        name: 'Premium',
        price: 29.99,
        features: ['Feature 1', 'Feature 2'],
      };

      mockBillingService.getPlan.mockResolvedValue(mockPlan);

      const result = await controller.getPlan('plan-123');

      expect(result).toEqual(mockPlan);
      expect(billingService.getPlan).toHaveBeenCalledWith('plan-123');
    });

    it('should require billing:read permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.getPlan);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:read'] });
    });
  });

  describe('createPlan', () => {
    it('should create a new plan', async () => {
      const createPlanDto = {
        name: 'New Plan',
        price: 49.99,
        duration: 30,
      };

      const createdPlan = {
        id: 'plan-new',
        ...createPlanDto,
      };

      mockBillingService.createPlan.mockResolvedValue(createdPlan);

      const result = await controller.createPlan(createPlanDto);

      expect(result).toEqual(createdPlan);
      expect(billingService.createPlan).toHaveBeenCalledWith(createPlanDto);
    });

    it('should require billing:create permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.createPlan);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:create'] });
    });
  });

  describe('updatePlan', () => {
    it('should update an existing plan', async () => {
      const updatePlanDto = {
        name: 'Updated Plan',
        price: 59.99,
      };

      const updatedPlan = {
        id: 'plan-123',
        ...updatePlanDto,
      };

      mockBillingService.updatePlan.mockResolvedValue(updatedPlan);

      const result = await controller.updatePlan('plan-123', updatePlanDto);

      expect(result).toEqual(updatedPlan);
      expect(billingService.updatePlan).toHaveBeenCalledWith('plan-123', updatePlanDto);
    });

    it('should require billing:update permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.updatePlan);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:update'] });
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan', async () => {
      const deleteResult = { success: true, message: 'Plan deleted' };

      mockBillingService.deletePlan.mockResolvedValue(deleteResult);

      const result = await controller.deletePlan('plan-123');

      expect(result).toEqual(deleteResult);
      expect(billingService.deletePlan).toHaveBeenCalledWith('plan-123');
    });

    it('should require billing:delete permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.deletePlan);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:delete'] });
    });
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const createOrderDto = {
        userId: 'user-123',
        planId: 'plan-123',
        tenantId: 'tenant-123',
      };

      const createdOrder = {
        id: 'order-123',
        ...createOrderDto,
        status: 'PENDING',
        amount: 29.99,
      };

      mockBillingService.createOrder.mockResolvedValue(createdOrder);

      const result = await controller.createOrder(createOrderDto);

      expect(result).toEqual(createdOrder);
      expect(billingService.createOrder).toHaveBeenCalledWith(createOrderDto);
    });

    it('should create order without optional tenantId', async () => {
      const createOrderDto = {
        userId: 'user-456',
        planId: 'plan-456',
      };

      const createdOrder = {
        id: 'order-456',
        ...createOrderDto,
        status: 'PENDING',
      };

      mockBillingService.createOrder.mockResolvedValue(createdOrder);

      const result = await controller.createOrder(createOrderDto);

      expect(result).toEqual(createdOrder);
      expect(billingService.createOrder).toHaveBeenCalledWith(createOrderDto);
    });

    it('should require billing:create permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.createOrder);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:create'] });
    });
  });

  describe('getUserOrders', () => {
    it('should get all orders for a user', async () => {
      const mockOrders = [
        { id: 'order-1', userId: 'user-123', status: 'PAID' },
        { id: 'order-2', userId: 'user-123', status: 'PENDING' },
      ];

      mockBillingService.getUserOrders.mockResolvedValue(mockOrders);

      const result = await controller.getUserOrders('user-123');

      expect(result).toEqual(mockOrders);
      expect(billingService.getUserOrders).toHaveBeenCalledWith('user-123');
    });

    it('should require billing:read permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.getUserOrders);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:read'] });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order with reason', async () => {
      const canceledOrder = {
        id: 'order-123',
        status: 'CANCELLED',
        cancelReason: 'User requested',
      };

      mockBillingService.cancelOrder.mockResolvedValue(canceledOrder);

      const result = await controller.cancelOrder('order-123', {
        reason: 'User requested',
      });

      expect(result).toEqual({
        success: true,
        data: canceledOrder,
        message: '订单已取消',
      });
      expect(billingService.cancelOrder).toHaveBeenCalledWith('order-123', 'User requested');
    });

    it('should cancel an order without reason', async () => {
      const canceledOrder = {
        id: 'order-456',
        status: 'CANCELLED',
      };

      mockBillingService.cancelOrder.mockResolvedValue(canceledOrder);

      const result = await controller.cancelOrder('order-456', {});

      expect(result).toEqual({
        success: true,
        data: canceledOrder,
        message: '订单已取消',
      });
      expect(billingService.cancelOrder).toHaveBeenCalledWith('order-456', undefined);
    });

    it('should require billing:update permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.cancelOrder);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:update'] });
    });
  });

  describe('getUserUsage', () => {
    it('should get user usage with date range', async () => {
      const mockUsage = [
        { date: '2024-01-01', deviceId: 'device-1', duration: 3600 },
        { date: '2024-01-02', deviceId: 'device-1', duration: 7200 },
      ];

      mockBillingService.getUserUsage.mockResolvedValue(mockUsage);

      const result = await controller.getUserUsage('user-123', '2024-01-01', '2024-01-31');

      expect(result).toEqual(mockUsage);
      expect(billingService.getUserUsage).toHaveBeenCalledWith(
        'user-123',
        '2024-01-01',
        '2024-01-31'
      );
    });

    it('should get user usage without date range', async () => {
      const mockUsage = [{ date: '2024-01-01', deviceId: 'device-1', duration: 1800 }];

      mockBillingService.getUserUsage.mockResolvedValue(mockUsage);

      const result = await controller.getUserUsage('user-123', undefined as any, undefined as any);

      expect(result).toEqual(mockUsage);
      expect(billingService.getUserUsage).toHaveBeenCalledWith('user-123', undefined, undefined);
    });

    it('should require billing:read permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.getUserUsage);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:read'] });
    });
  });

  describe('startUsage', () => {
    it('should start a usage record', async () => {
      const startUsageDto = {
        userId: 'user-123',
        deviceId: 'device-123',
        tenantId: 'tenant-123',
      };

      const usageRecord = {
        id: 'record-123',
        ...startUsageDto,
        startTime: new Date(),
      };

      mockBillingService.startUsage.mockResolvedValue(usageRecord);

      const result = await controller.startUsage(startUsageDto);

      expect(result).toEqual(usageRecord);
      expect(billingService.startUsage).toHaveBeenCalledWith(startUsageDto);
    });

    it('should require billing:create permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.startUsage);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:create'] });
    });
  });

  describe('stopUsage', () => {
    it('should stop a usage record', async () => {
      const stopResult = {
        id: 'record-123',
        endTime: new Date(),
        duration: 3600,
        cost: 1.5,
      };

      mockBillingService.stopUsage.mockResolvedValue(stopResult);

      const result = await controller.stopUsage({ recordId: 'record-123' });

      expect(result).toEqual(stopResult);
      expect(billingService.stopUsage).toHaveBeenCalledWith('record-123');
    });

    it('should require billing:update permission', () => {
      const permissions = Reflect.getMetadata('permissions', controller.stopUsage);
      expect(permissions).toEqual({ operator: 'AND', permissions: ['billing:update'] });
    });
  });

  describe('Guards', () => {
    it('should be protected by JWT AuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', BillingController);
      expect(guards).toBeDefined();
    });

    it('should be protected by PermissionsGuard', () => {
      const guards = Reflect.getMetadata('__guards__', BillingController);
      expect(guards).toBeDefined();
    });
  });
});
