import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  let referralsService: any;

  const mockReferralsService = {
    getReferralConfig: jest.fn(),
    generateInviteCode: jest.fn(),
    getReferralStats: jest.fn(),
    getReferralRecords: jest.fn(),
    getWithdrawRecords: jest.fn(),
    applyWithdraw: jest.fn(),
    cancelWithdraw: jest.fn(),
    generatePoster: jest.fn(),
    getEarningsDetail: jest.fn(),
    shareToSocial: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      sub: 'user-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        {
          provide: ReferralsService,
          useValue: mockReferralsService,
        },
      ],
    }).compile();

    controller = module.get<ReferralsController>(ReferralsController);
    referralsService = module.get(ReferralsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReferralConfig', () => {
    it('should return referral configuration', async () => {
      const mockConfig = {
        enabled: true,
        rewardPerInvite: 10,
        minWithdraw: 50,
        commissionRate: 0.1,
        tiers: [
          { level: 1, minInvites: 0, commissionRate: 0.1 },
          { level: 2, minInvites: 10, commissionRate: 0.15 },
        ],
      };

      referralsService.getReferralConfig.mockResolvedValue(mockConfig);

      const result = await controller.getReferralConfig(mockRequest);

      expect(result).toEqual(mockConfig);
      expect(result.enabled).toBe(true);
      expect(referralsService.getReferralConfig).toHaveBeenCalledWith('user-123');
    });

    it('should handle request with sub field', async () => {
      const request = {
        user: {
          sub: 'user-456',
        },
      };

      const mockConfig = {
        enabled: true,
        rewardPerInvite: 5,
      };

      referralsService.getReferralConfig.mockResolvedValue(mockConfig);

      const result = await controller.getReferralConfig(request);

      expect(result).toEqual(mockConfig);
      expect(referralsService.getReferralConfig).toHaveBeenCalledWith('user-456');
    });
  });

  describe('generateInviteCode', () => {
    it('should generate invite code for user', async () => {
      const mockResult = {
        success: true,
        inviteCode: 'INVITE-ABC123',
        shareUrl: 'https://example.com/register?ref=INVITE-ABC123',
        validUntil: new Date('2025-12-31'),
      };

      referralsService.generateInviteCode.mockResolvedValue(mockResult);

      const result = await controller.generateInviteCode(mockRequest);

      expect(result).toEqual(mockResult);
      expect(result.inviteCode).toBe('INVITE-ABC123');
      expect(referralsService.generateInviteCode).toHaveBeenCalledWith('user-123');
    });

    it('should generate new code for different user', async () => {
      const request = {
        user: {
          id: 'user-789',
        },
      };

      const mockResult = {
        success: true,
        inviteCode: 'INVITE-XYZ789',
        shareUrl: 'https://example.com/register?ref=INVITE-XYZ789',
      };

      referralsService.generateInviteCode.mockResolvedValue(mockResult);

      const result = await controller.generateInviteCode(request);

      expect(result.inviteCode).toBe('INVITE-XYZ789');
      expect(referralsService.generateInviteCode).toHaveBeenCalledWith('user-789');
    });
  });

  describe('getReferralStats', () => {
    it('should return referral statistics', async () => {
      const mockStats = {
        totalInvites: 25,
        successfulInvites: 20,
        totalEarnings: 200,
        availableBalance: 150,
        pendingWithdraw: 50,
        conversionRate: 0.8,
      };

      referralsService.getReferralStats.mockResolvedValue(mockStats);

      const result = await controller.getReferralStats(mockRequest);

      expect(result).toEqual(mockStats);
      expect(result.totalInvites).toBe(25);
      expect(result.totalEarnings).toBe(200);
      expect(referralsService.getReferralStats).toHaveBeenCalledWith('user-123');
    });

    it('should return stats with zero invites', async () => {
      const mockStats = {
        totalInvites: 0,
        successfulInvites: 0,
        totalEarnings: 0,
        availableBalance: 0,
        pendingWithdraw: 0,
        conversionRate: 0,
      };

      referralsService.getReferralStats.mockResolvedValue(mockStats);

      const result = await controller.getReferralStats(mockRequest);

      expect(result.totalInvites).toBe(0);
      expect(result.totalEarnings).toBe(0);
    });
  });

  describe('getReferralRecords', () => {
    it('should return referral records without filters', async () => {
      const query: any = {};
      const mockRecords = {
        data: [
          { id: 'ref-1', refereeId: 'user-1', status: 'completed', reward: 10, createdAt: new Date() },
          { id: 'ref-2', refereeId: 'user-2', status: 'pending', reward: 10, createdAt: new Date() },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      referralsService.getReferralRecords.mockResolvedValue(mockRecords);

      const result = await controller.getReferralRecords(mockRequest, query);

      expect(result).toEqual(mockRecords);
      expect(result.data).toHaveLength(2);
      expect(referralsService.getReferralRecords).toHaveBeenCalledWith('user-123', query);
    });

    it('should return referral records with status filter', async () => {
      const query: any = {
        status: 'completed',
      };

      const mockRecords = {
        data: [{ id: 'ref-1', refereeId: 'user-1', status: 'completed', reward: 10 }],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      referralsService.getReferralRecords.mockResolvedValue(mockRecords);

      const result = await controller.getReferralRecords(mockRequest, query);

      expect(result).toEqual(mockRecords);
      expect(result.data[0].status).toBe('completed');
    });
  });

  describe('getWithdrawRecords', () => {
    it('should return withdraw records without filters', async () => {
      const query: any = {};
      const mockRecords = {
        data: [
          { id: 'withdraw-1', amount: 100, status: 'completed', createdAt: new Date() },
          { id: 'withdraw-2', amount: 50, status: 'pending', createdAt: new Date() },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      referralsService.getWithdrawRecords.mockResolvedValue(mockRecords);

      const result = await controller.getWithdrawRecords(mockRequest, query);

      expect(result).toEqual(mockRecords);
      expect(result.data).toHaveLength(2);
      expect(referralsService.getWithdrawRecords).toHaveBeenCalledWith('user-123', query);
    });

    it('should return withdraw records with status filter', async () => {
      const query: any = {
        status: 'completed',
      };

      const mockRecords = {
        data: [{ id: 'withdraw-1', amount: 100, status: 'completed' }],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      referralsService.getWithdrawRecords.mockResolvedValue(mockRecords);

      const result = await controller.getWithdrawRecords(mockRequest, query);

      expect(result.data[0].status).toBe('completed');
    });
  });

  describe('applyWithdraw', () => {
    it('should successfully apply for withdraw', async () => {
      const dto: any = {
        amount: 100,
        bankAccount: '1234567890',
      };

      const mockResult = {
        success: true,
        withdrawId: 'withdraw-123',
        amount: 100,
        status: 'pending',
        estimatedArrival: new Date(),
      };

      referralsService.applyWithdraw.mockResolvedValue(mockResult);

      const result = await controller.applyWithdraw(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.amount).toBe(100);
      expect(referralsService.applyWithdraw).toHaveBeenCalledWith('user-123', dto);
    });

    it('should apply for withdraw with different amount', async () => {
      const dto: any = {
        amount: 50,
        alipayAccount: 'user@example.com',
      };

      const mockResult = {
        success: true,
        withdrawId: 'withdraw-456',
        amount: 50,
        status: 'pending',
      };

      referralsService.applyWithdraw.mockResolvedValue(mockResult);

      const result = await controller.applyWithdraw(mockRequest, dto);

      expect(result.amount).toBe(50);
    });
  });

  describe('cancelWithdraw', () => {
    it('should successfully cancel withdraw', async () => {
      const withdrawId = 'withdraw-123';
      const mockResult = {
        success: true,
        withdrawId: 'withdraw-123',
        status: 'cancelled',
        refundedAmount: 100,
      };

      referralsService.cancelWithdraw.mockResolvedValue(mockResult);

      const result = await controller.cancelWithdraw(withdrawId, mockRequest);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(referralsService.cancelWithdraw).toHaveBeenCalledWith('user-123', withdrawId);
    });

    it('should cancel withdraw for different user', async () => {
      const request = {
        user: {
          id: 'user-789',
        },
      };

      const withdrawId = 'withdraw-456';
      const mockResult = {
        success: true,
        withdrawId: 'withdraw-456',
        status: 'cancelled',
      };

      referralsService.cancelWithdraw.mockResolvedValue(mockResult);

      const result = await controller.cancelWithdraw(withdrawId, request);

      expect(result.success).toBe(true);
      expect(referralsService.cancelWithdraw).toHaveBeenCalledWith('user-789', withdrawId);
    });
  });

  describe('generatePoster', () => {
    it('should generate referral poster', async () => {
      const mockResult = {
        success: true,
        posterUrl: 'https://cdn.example.com/posters/user-123.png',
        qrCodeUrl: 'https://cdn.example.com/qr/user-123.png',
        inviteCode: 'INVITE-ABC123',
      };

      referralsService.generatePoster.mockResolvedValue(mockResult);

      const result = await controller.generatePoster(mockRequest);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.posterUrl).toContain('.png');
      expect(referralsService.generatePoster).toHaveBeenCalledWith('user-123');
    });

    it('should generate poster for different user', async () => {
      const request = {
        user: {
          sub: 'user-def',
        },
      };

      const mockResult = {
        success: true,
        posterUrl: 'https://cdn.example.com/posters/user-def.png',
        qrCodeUrl: 'https://cdn.example.com/qr/user-def.png',
      };

      referralsService.generatePoster.mockResolvedValue(mockResult);

      const result = await controller.generatePoster(request);

      expect(result.posterUrl).toContain('user-def');
      expect(referralsService.generatePoster).toHaveBeenCalledWith('user-def');
    });
  });

  describe('getEarningsDetail', () => {
    it('should return earnings detail without filters', async () => {
      const query: any = {};
      const mockEarnings = {
        data: [
          { id: 'earn-1', amount: 10, source: 'referral', createdAt: new Date() },
          { id: 'earn-2', amount: 5, source: 'commission', createdAt: new Date() },
        ],
        total: 2,
        totalAmount: 15,
        page: 1,
        pageSize: 20,
      };

      referralsService.getEarningsDetail.mockResolvedValue(mockEarnings);

      const result = await controller.getEarningsDetail(mockRequest, query);

      expect(result).toEqual(mockEarnings);
      expect(result.data).toHaveLength(2);
      expect(result.totalAmount).toBe(15);
      expect(referralsService.getEarningsDetail).toHaveBeenCalledWith('user-123', query);
    });

    it('should return earnings detail with date filter', async () => {
      const query: any = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockEarnings = {
        data: [{ id: 'earn-1', amount: 10, source: 'referral' }],
        total: 1,
        totalAmount: 10,
        page: 1,
        pageSize: 20,
      };

      referralsService.getEarningsDetail.mockResolvedValue(mockEarnings);

      const result = await controller.getEarningsDetail(mockRequest, query);

      expect(result.totalAmount).toBe(10);
    });
  });

  describe('shareToSocial', () => {
    it('should share to WeChat', async () => {
      const dto: any = {
        platform: 'wechat',
      };

      const mockResult = {
        success: true,
        platform: 'wechat',
        shareUrl: 'https://example.com/share/wechat',
        message: '分享成功',
      };

      referralsService.shareToSocial.mockResolvedValue(mockResult);

      const result = await controller.shareToSocial(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.platform).toBe('wechat');
      expect(referralsService.shareToSocial).toHaveBeenCalledWith('user-123', dto);
    });

    it('should share to different platforms', async () => {
      const dto: any = {
        platform: 'weibo',
      };

      const mockResult = {
        success: true,
        platform: 'weibo',
        shareUrl: 'https://example.com/share/weibo',
      };

      referralsService.shareToSocial.mockResolvedValue(mockResult);

      const result = await controller.shareToSocial(mockRequest, dto);

      expect(result.platform).toBe('weibo');
    });

    it('should share with custom message', async () => {
      const dto: any = {
        platform: 'twitter',
        message: 'Check out this amazing platform!',
      };

      const mockResult = {
        success: true,
        platform: 'twitter',
        shareUrl: 'https://example.com/share/twitter',
        customMessage: 'Check out this amazing platform!',
      };

      referralsService.shareToSocial.mockResolvedValue(mockResult);

      const result = await controller.shareToSocial(mockRequest, dto);

      expect(result.platform).toBe('twitter');
      expect(result.customMessage).toBeDefined();
    });
  });
});
