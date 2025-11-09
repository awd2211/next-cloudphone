import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { CouponsService } from '../coupons/coupons.service';
import { CouponType } from '../coupons/entities/coupon.entity';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let activitiesService: any;
  let couponsService: any;

  const mockActivitiesService = {
    findAll: jest.fn(),
    getStats: jest.fn(),
    getMyParticipations: jest.fn(),
    findOne: jest.fn(),
    participate: jest.fn(),
    hasUserParticipated: jest.fn(),
  };

  const mockCouponsService = {
    claimFromActivity: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      sub: 'user-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: mockActivitiesService,
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    activitiesService = module.get(ActivitiesService);
    couponsService = module.get(CouponsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all activities without filters', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          title: 'New Year Promotion',
          status: 'active',
          discount: 20,
        },
        {
          id: 'activity-2',
          title: 'Summer Sale',
          status: 'active',
          discount: 15,
        },
      ];

      activitiesService.findAll.mockResolvedValue(mockActivities);

      const result = await controller.findAll({});

      expect(result).toEqual(mockActivities);
      expect(result).toHaveLength(2);
      expect(activitiesService.findAll).toHaveBeenCalledWith({});
    });

    it('should return activities filtered by status', async () => {
      const query: any = { status: 'active' };
      const mockActivities = [
        {
          id: 'activity-1',
          title: 'Active Promotion',
          status: 'active',
        },
      ];

      activitiesService.findAll.mockResolvedValue(mockActivities);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockActivities);
      expect(activitiesService.findAll).toHaveBeenCalledWith(query);
    });

    it('should return activities filtered by type', async () => {
      const query: any = { type: 'discount' };
      const mockActivities = [
        {
          id: 'activity-2',
          title: 'Discount Campaign',
          type: 'discount',
        },
      ];

      activitiesService.findAll.mockResolvedValue(mockActivities);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockActivities);
      expect(activitiesService.findAll).toHaveBeenCalledWith(query);
    });

    it('should return empty array when no activities match', async () => {
      activitiesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return user activity statistics', async () => {
      const mockStats = {
        userId: 'user-123',
        totalActivities: 10,
        participatedActivities: 5,
        claimedCoupons: 3,
        totalSavings: 150,
      };

      activitiesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockRequest);

      expect(result).toEqual(mockStats);
      expect(result.userId).toBe('user-123');
      expect(activitiesService.getStats).toHaveBeenCalledWith('user-123');
    });

    it('should return stats with zero participation', async () => {
      const mockStats = {
        userId: 'user-456',
        totalActivities: 5,
        participatedActivities: 0,
        claimedCoupons: 0,
        totalSavings: 0,
      };

      activitiesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats({ user: { id: 'user-456' } });

      expect(result).toEqual(mockStats);
      expect(result.participatedActivities).toBe(0);
    });

    it('should handle request with sub field', async () => {
      const request = {
        user: {
          sub: 'user-789',
        },
      };

      const mockStats = {
        userId: 'user-789',
        totalActivities: 15,
        participatedActivities: 8,
        claimedCoupons: 5,
        totalSavings: 250,
      };

      activitiesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(request);

      expect(result).toEqual(mockStats);
      expect(activitiesService.getStats).toHaveBeenCalledWith('user-789');
    });
  });

  describe('getMyParticipations', () => {
    it('should return user participation records', async () => {
      const mockParticipations = [
        {
          id: 'participation-1',
          activityId: 'activity-1',
          userId: 'user-123',
          participatedAt: new Date('2025-01-01'),
          status: 'completed',
        },
        {
          id: 'participation-2',
          activityId: 'activity-2',
          userId: 'user-123',
          participatedAt: new Date('2025-01-05'),
          status: 'active',
        },
      ];

      activitiesService.getMyParticipations.mockResolvedValue(mockParticipations);

      const result = await controller.getMyParticipations(mockRequest, {});

      expect(result).toEqual(mockParticipations);
      expect(result).toHaveLength(2);
      expect(activitiesService.getMyParticipations).toHaveBeenCalledWith('user-123', {});
    });

    it('should return participations filtered by status', async () => {
      const query: any = { status: 'completed' };
      const mockParticipations = [
        {
          id: 'participation-1',
          activityId: 'activity-1',
          userId: 'user-123',
          status: 'completed',
        },
      ];

      activitiesService.getMyParticipations.mockResolvedValue(mockParticipations);

      const result = await controller.getMyParticipations(mockRequest, query);

      expect(result).toEqual(mockParticipations);
      expect(activitiesService.getMyParticipations).toHaveBeenCalledWith('user-123', query);
    });

    it('should return empty array when user has no participations', async () => {
      activitiesService.getMyParticipations.mockResolvedValue([]);

      const result = await controller.getMyParticipations(mockRequest, {});

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return activity detail', async () => {
      const activityId = 'activity-123';
      const mockActivity = {
        id: 'activity-123',
        title: 'Spring Festival Sale',
        description: 'Get 30% off on all products',
        status: 'active',
        discount: 30,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        participants: 150,
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(activityId);

      expect(result).toEqual(mockActivity);
      expect(result.id).toBe('activity-123');
      expect(activitiesService.findOne).toHaveBeenCalledWith(activityId);
    });

    it('should return activity with full details', async () => {
      const activityId = 'activity-456';
      const mockActivity = {
        id: 'activity-456',
        title: 'Member Appreciation',
        description: 'Special rewards for loyal customers',
        status: 'active',
        discount: 20,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        participants: 500,
        maxParticipants: 1000,
        rules: ['Must be a registered member', 'One-time participation only'],
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(activityId);

      expect(result).toEqual(mockActivity);
      expect(result.rules).toHaveLength(2);
      expect(result.maxParticipants).toBe(1000);
    });
  });

  describe('participate', () => {
    it('should successfully participate in activity', async () => {
      const activityId = 'activity-123';
      const mockResult = {
        success: true,
        activityId: 'activity-123',
        userId: 'user-123',
        participationId: 'participation-789',
        message: 'Successfully joined the activity',
      };

      activitiesService.participate.mockResolvedValue(mockResult);

      const result = await controller.participate(activityId, mockRequest);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(activitiesService.participate).toHaveBeenCalledWith(activityId, 'user-123');
    });

    it('should handle participation for different user', async () => {
      const request = {
        user: {
          id: 'user-456',
        },
      };

      const activityId = 'activity-789';
      const mockResult = {
        success: true,
        activityId: 'activity-789',
        userId: 'user-456',
        participationId: 'participation-abc',
      };

      activitiesService.participate.mockResolvedValue(mockResult);

      const result = await controller.participate(activityId, request);

      expect(result).toEqual(mockResult);
      expect(activitiesService.participate).toHaveBeenCalledWith(activityId, 'user-456');
    });

    it('should return participation details', async () => {
      const activityId = 'activity-def';
      const mockResult = {
        success: true,
        activityId: 'activity-def',
        userId: 'user-123',
        participationId: 'participation-ghi',
        participatedAt: new Date('2025-01-06'),
        rewards: {
          coupon: true,
          points: 100,
        },
      };

      activitiesService.participate.mockResolvedValue(mockResult);

      const result = await controller.participate(activityId, mockRequest);

      expect(result).toEqual(mockResult);
      expect(result.rewards).toBeDefined();
      expect(result.rewards.points).toBe(100);
    });
  });

  describe('claimCoupon', () => {
    it('should successfully claim coupon after participation', async () => {
      const activityId = 'activity-123';
      const mockActivity = {
        id: 'activity-123',
        title: 'New Year Sale',
        discount: 20,
      };

      const mockCoupon = {
        id: 'coupon-789',
        code: 'NEWYEAR20',
        discountValue: 20,
        userId: 'user-123',
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);
      activitiesService.hasUserParticipated.mockResolvedValue(true);
      couponsService.claimFromActivity.mockResolvedValue(mockCoupon);

      const result = await controller.claimCoupon(activityId, mockRequest);

      expect(result).toEqual(mockCoupon);
      expect(activitiesService.findOne).toHaveBeenCalledWith(activityId);
      expect(activitiesService.hasUserParticipated).toHaveBeenCalledWith(activityId, 'user-123');
      expect(couponsService.claimFromActivity).toHaveBeenCalledWith(
        activityId,
        'user-123',
        'New Year Sale',
        expect.objectContaining({
          name: 'New Year Sale - 优惠券',
          type: CouponType.DISCOUNT,
          value: 20,
          validDays: 30,
        }),
      );
    });

    it('should throw error when user has not participated', async () => {
      const activityId = 'activity-456';
      const mockActivity = {
        id: 'activity-456',
        title: 'Spring Festival',
        discount: 30,
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);
      activitiesService.hasUserParticipated.mockResolvedValue(false);

      await expect(controller.claimCoupon(activityId, mockRequest)).rejects.toThrow(
        BadRequestException,
      );

      await expect(controller.claimCoupon(activityId, mockRequest)).rejects.toThrow(
        'You must participate in the activity first',
      );

      expect(couponsService.claimFromActivity).not.toHaveBeenCalled();
    });

    it('should claim gift coupon for activity without discount', async () => {
      const activityId = 'activity-789';
      const mockActivity = {
        id: 'activity-789',
        title: 'Gift Campaign',
        discount: null,
      };

      const mockCoupon = {
        id: 'coupon-abc',
        code: 'GIFT2025',
        type: CouponType.GIFT,
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);
      activitiesService.hasUserParticipated.mockResolvedValue(true);
      couponsService.claimFromActivity.mockResolvedValue(mockCoupon);

      const result = await controller.claimCoupon(activityId, mockRequest);

      expect(result).toEqual(mockCoupon);
      expect(couponsService.claimFromActivity).toHaveBeenCalledWith(
        activityId,
        'user-123',
        'Gift Campaign',
        expect.objectContaining({
          type: CouponType.GIFT,
          value: 0,
        }),
      );
    });

    it('should handle coupon claim for different user', async () => {
      const request = {
        user: {
          sub: 'user-999',
        },
      };

      const activityId = 'activity-def';
      const mockActivity = {
        id: 'activity-def',
        title: 'VIP Sale',
        discount: 50,
      };

      const mockCoupon = {
        id: 'coupon-vip',
        code: 'VIP50',
        discountValue: 50,
        userId: 'user-999',
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);
      activitiesService.hasUserParticipated.mockResolvedValue(true);
      couponsService.claimFromActivity.mockResolvedValue(mockCoupon);

      const result = await controller.claimCoupon(activityId, request);

      expect(result).toEqual(mockCoupon);
      expect(activitiesService.hasUserParticipated).toHaveBeenCalledWith(activityId, 'user-999');
      expect(couponsService.claimFromActivity).toHaveBeenCalledWith(
        activityId,
        'user-999',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should configure coupon with correct discount type', async () => {
      const activityId = 'activity-ghi';
      const mockActivity = {
        id: 'activity-ghi',
        title: 'Holiday Special',
        discount: 25,
      };

      activitiesService.findOne.mockResolvedValue(mockActivity);
      activitiesService.hasUserParticipated.mockResolvedValue(true);
      couponsService.claimFromActivity.mockResolvedValue({ id: 'coupon-1' });

      await controller.claimCoupon(activityId, mockRequest);

      expect(couponsService.claimFromActivity).toHaveBeenCalledWith(
        activityId,
        'user-123',
        'Holiday Special',
        {
          name: 'Holiday Special - 优惠券',
          type: CouponType.DISCOUNT,
          value: 25,
          minAmount: undefined,
          validDays: 30,
        },
      );
    });
  });
});
