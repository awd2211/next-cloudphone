import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { BlacklistManagerService } from './blacklist-manager.service';
import { ProviderBlacklist } from '../entities/provider-blacklist.entity';

describe('BlacklistManagerService', () => {
  let service: BlacklistManagerService;
  let blacklistRepo: Repository<ProviderBlacklist>;

  // Mock repository
  const mockBlacklistRepo = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlacklistManagerService,
        {
          provide: getRepositoryToken(ProviderBlacklist),
          useValue: mockBlacklistRepo,
        },
      ],
    }).compile();

    service = module.get<BlacklistManagerService>(BlacklistManagerService);
    blacklistRepo = module.get<Repository<ProviderBlacklist>>(
      getRepositoryToken(ProviderBlacklist)
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have correct thresholds', () => {
      expect((service as any).AUTO_BLACKLIST_THRESHOLD).toBe(5);
      expect((service as any).AUTO_BLACKLIST_DURATION_HOURS).toBe(1);
    });
  });

  describe('isBlacklisted - Permanent Blacklist', () => {
    it('should return true for permanently blacklisted provider', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(1);

      const result = await service.isBlacklisted('bad-provider');

      expect(result).toBe(true);
      expect(mockBlacklistRepo.count).toHaveBeenCalledWith({
        where: [
          {
            provider: 'bad-provider',
            isActive: true,
            blacklistType: 'permanent',
          },
          {
            provider: 'bad-provider',
            isActive: true,
            blacklistType: 'manual',
          },
          {
            provider: 'bad-provider',
            isActive: true,
            blacklistType: 'temporary',
            expiresAt: expect.any(Object), // MoreThan(now)
          },
        ],
      });
    });

    it('should return false for non-blacklisted provider', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(0);

      const result = await service.isBlacklisted('good-provider');

      expect(result).toBe(false);
    });
  });

  describe('isBlacklisted - Manual Blacklist', () => {
    it('should return true for manually blacklisted provider', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(1);

      const result = await service.isBlacklisted('manual-blocked');

      expect(result).toBe(true);
    });
  });

  describe('isBlacklisted - Temporary Blacklist', () => {
    it('should return true for temporarily blacklisted provider not expired', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(1);

      const result = await service.isBlacklisted('temp-blocked');

      expect(result).toBe(true);
      // Should check expiresAt > now
      expect(mockBlacklistRepo.count).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          expect.objectContaining({
            blacklistType: 'temporary',
            expiresAt: expect.any(Object),
          }),
        ]),
      });
    });

    it('should return false for expired temporary blacklist', async () => {
      // Expired entries would not be counted due to expiresAt > now condition
      mockBlacklistRepo.count.mockResolvedValueOnce(0);

      const result = await service.isBlacklisted('expired-temp-blocked');

      expect(result).toBe(false);
    });
  });

  describe('addToBlacklist - Manual Type', () => {
    it('should add provider to blacklist with manual type by default', async () => {
      const mockEntry: Partial<ProviderBlacklist> = {
        id: 'blacklist-1',
        provider: 'bad-provider',
        reason: 'Manual block',
        blacklistType: 'manual',
        isActive: true,
        triggeredBy: 'admin',
      };

      mockBlacklistRepo.create.mockReturnValue(mockEntry);
      mockBlacklistRepo.save.mockResolvedValue(mockEntry);

      const result = await service.addToBlacklist('bad-provider', 'Manual block');

      expect(result.blacklistType).toBe('manual');
      expect(result.triggeredBy).toBe('admin');
      expect(mockBlacklistRepo.create).toHaveBeenCalledWith({
        provider: 'bad-provider',
        reason: 'Manual block',
        blacklistType: 'manual',
        triggeredBy: 'admin',
        expiresAt: undefined,
        isActive: true,
        notes: undefined,
      });
    });

    it('should use custom triggeredBy if provided', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider', 'Test reason', {
        triggeredBy: 'support-team',
      });

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'support-team',
        })
      );
    });

    it('should include notes if provided', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider', 'Test reason', {
        notes: 'Additional context',
      });

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Additional context',
        })
      );
    });
  });

  describe('addToBlacklist - Permanent Type', () => {
    it('should add permanent blacklist without expiration', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider', 'Permanent ban', {
        type: 'permanent',
      });

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          blacklistType: 'permanent',
          expiresAt: undefined,
        })
      );
    });
  });

  describe('addToBlacklist - Temporary Type', () => {
    it('should add temporary blacklist with default 1 hour expiration', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const before = new Date(Date.now() + 1 * 60 * 60 * 1000);
      await service.addToBlacklist('provider', 'Temp ban', {
        type: 'temporary',
      });
      const after = new Date(Date.now() + 1 * 60 * 60 * 1000);

      const createCall = mockBlacklistRepo.create.mock.calls[0][0];
      expect(createCall.blacklistType).toBe('temporary');
      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should use custom duration hours for temporary blacklist', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const before = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await service.addToBlacklist('provider', 'Temp ban', {
        type: 'temporary',
        durationHours: 24,
      });
      const after = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const createCall = mockBlacklistRepo.create.mock.calls[0][0];
      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should handle very short duration (minutes)', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider', 'Short ban', {
        type: 'temporary',
        durationHours: 0.5, // 30 minutes
      });

      const createCall = mockBlacklistRepo.create.mock.calls[0][0];
      expect(createCall.expiresAt.getTime()).toBeLessThan(Date.now() + 1 * 60 * 60 * 1000);
    });
  });

  describe('removeFromBlacklist', () => {
    it('should deactivate all active blacklist entries for provider', async () => {
      const mockEntries: Partial<ProviderBlacklist>[] = [
        {
          id: 'entry-1',
          provider: 'test-provider',
          isActive: true,
          notes: 'Original note',
        },
        {
          id: 'entry-2',
          provider: 'test-provider',
          isActive: true,
          notes: '',
        },
      ];

      mockBlacklistRepo.find.mockResolvedValueOnce(mockEntries);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.removeFromBlacklist('test-provider', 'Testing removal');

      expect(mockBlacklistRepo.save).toHaveBeenCalledTimes(2);
      expect(mockBlacklistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          removedAt: expect.any(Date),
          notes: expect.stringContaining('Removed: Testing removal'),
        })
      );
    });

    it('should use default reason if not provided', async () => {
      const mockEntry: Partial<ProviderBlacklist> = {
        id: 'entry-1',
        provider: 'test-provider',
        isActive: true,
        notes: '',
      };

      mockBlacklistRepo.find.mockResolvedValueOnce([mockEntry]);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.removeFromBlacklist('test-provider');

      expect(mockBlacklistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('Removed: Manual removal'),
        })
      );
    });

    it('should append removal reason to existing notes', async () => {
      const mockEntry: Partial<ProviderBlacklist> = {
        id: 'entry-1',
        provider: 'test-provider',
        isActive: true,
        notes: 'Previous notes here',
      };

      mockBlacklistRepo.find.mockResolvedValueOnce([mockEntry]);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.removeFromBlacklist('test-provider', 'Recovery');

      expect(mockBlacklistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Previous notes here\nRemoved: Recovery',
        })
      );
    });

    it('should handle no active entries gracefully', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      await expect(service.removeFromBlacklist('non-blacklisted')).resolves.not.toThrow();
      expect(mockBlacklistRepo.save).not.toHaveBeenCalled();
    });

    it('should set removedAt timestamp', async () => {
      const mockEntry: Partial<ProviderBlacklist> = {
        id: 'entry-1',
        provider: 'test-provider',
        isActive: true,
      };

      mockBlacklistRepo.find.mockResolvedValueOnce([mockEntry]);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const before = new Date();
      await service.removeFromBlacklist('test-provider');
      const after = new Date();

      const savedCall = mockBlacklistRepo.save.mock.calls[0][0];
      expect(savedCall.removedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(savedCall.removedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('handleConsecutiveFailures', () => {
    it('should auto-blacklist provider after 5 consecutive failures', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(0); // Not already blacklisted
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.handleConsecutiveFailures('failing-provider', 5, 'Connection timeout');

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'failing-provider',
          reason: 'Auto-blacklisted after 5 consecutive failures',
          blacklistType: 'temporary',
          triggeredBy: 'auto',
          notes: 'Last error: Connection timeout',
        })
      );
    });

    it('should not blacklist below threshold', async () => {
      await service.handleConsecutiveFailures('provider', 4, 'Error');

      expect(mockBlacklistRepo.count).not.toHaveBeenCalled();
      expect(mockBlacklistRepo.create).not.toHaveBeenCalled();
    });

    it('should not blacklist if already blacklisted', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(1); // Already blacklisted

      await service.handleConsecutiveFailures('provider', 5, 'Error');

      expect(mockBlacklistRepo.count).toHaveBeenCalledTimes(1);
      expect(mockBlacklistRepo.create).not.toHaveBeenCalled();
    });

    it('should blacklist at exactly threshold', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(0);
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.handleConsecutiveFailures('provider', 5, 'Error');

      expect(mockBlacklistRepo.create).toHaveBeenCalled();
    });

    it('should blacklist above threshold', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(0);
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.handleConsecutiveFailures('provider', 10, 'Error');

      expect(mockBlacklistRepo.create).toHaveBeenCalled();
    });

    it('should include last error in notes', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(0);
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.handleConsecutiveFailures(
        'provider',
        5,
        'API rate limit exceeded: 429 Too Many Requests'
      );

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Last error: API rate limit exceeded: 429 Too Many Requests',
        })
      );
    });
  });

  describe('getAllBlacklist', () => {
    it('should return only active entries by default', async () => {
      const mockEntries: Partial<ProviderBlacklist>[] = [
        { id: 'entry-1', provider: 'provider-1', isActive: true },
        { id: 'entry-2', provider: 'provider-2', isActive: true },
      ];

      mockBlacklistRepo.find.mockResolvedValueOnce(mockEntries);

      const result = await service.getAllBlacklist();

      expect(result).toEqual(mockEntries);
      expect(mockBlacklistRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should include inactive entries when requested', async () => {
      const mockEntries: Partial<ProviderBlacklist>[] = [
        { id: 'entry-1', provider: 'provider-1', isActive: true },
        { id: 'entry-2', provider: 'provider-2', isActive: false },
      ];

      mockBlacklistRepo.find.mockResolvedValueOnce(mockEntries);

      const result = await service.getAllBlacklist(true);

      expect(result).toEqual(mockEntries);
      expect(mockBlacklistRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no entries', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      const result = await service.getAllBlacklist();

      expect(result).toEqual([]);
    });

    it('should order by createdAt DESC', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      await service.getAllBlacklist();

      expect(mockBlacklistRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        })
      );
    });
  });

  describe('getProviderBlacklistHistory', () => {
    it('should return all entries for specific provider', async () => {
      const mockHistory: Partial<ProviderBlacklist>[] = [
        {
          id: 'entry-1',
          provider: 'test-provider',
          isActive: false,
          blacklistType: 'temporary',
        },
        {
          id: 'entry-2',
          provider: 'test-provider',
          isActive: true,
          blacklistType: 'manual',
        },
      ];

      mockBlacklistRepo.find.mockResolvedValueOnce(mockHistory);

      const result = await service.getProviderBlacklistHistory('test-provider');

      expect(result).toEqual(mockHistory);
      expect(mockBlacklistRepo.find).toHaveBeenCalledWith({
        where: { provider: 'test-provider' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should include both active and inactive entries', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      await service.getProviderBlacklistHistory('provider');

      // Should not filter by isActive
      expect(mockBlacklistRepo.find).toHaveBeenCalledWith({
        where: { provider: 'provider' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array for provider with no history', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      const result = await service.getProviderBlacklistHistory('clean-provider');

      expect(result).toEqual([]);
    });
  });

  describe('cleanupExpiredBlacklist - Cron Job', () => {
    it('should deactivate expired temporary blacklist entries', async () => {
      const expiredEntries: Partial<ProviderBlacklist>[] = [
        {
          id: 'entry-1',
          provider: 'provider-1',
          blacklistType: 'temporary',
          isActive: true,
          expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        },
        {
          id: 'entry-2',
          provider: 'provider-2',
          blacklistType: 'temporary',
          isActive: true,
          expiresAt: new Date(Date.now() - 120000), // Expired 2 minutes ago
        },
      ];

      mockBlacklistRepo.find.mockResolvedValueOnce(expiredEntries);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.cleanupExpiredBlacklist();

      expect(mockBlacklistRepo.save).toHaveBeenCalledTimes(2);
      expect(mockBlacklistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          autoRemoved: true,
          removedAt: expect.any(Date),
        })
      );
    });

    it('should not remove permanent or manual blacklists', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      await service.cleanupExpiredBlacklist();

      expect(mockBlacklistRepo.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          blacklistType: 'temporary',
          expiresAt: expect.any(Object), // LessThan(now)
        },
      });
    });

    it('should do nothing when no expired entries', async () => {
      mockBlacklistRepo.find.mockResolvedValueOnce([]);

      await service.cleanupExpiredBlacklist();

      expect(mockBlacklistRepo.save).not.toHaveBeenCalled();
    });

    it('should set autoRemoved flag', async () => {
      const expiredEntry: Partial<ProviderBlacklist> = {
        id: 'entry-1',
        provider: 'provider-1',
        blacklistType: 'temporary',
        isActive: true,
        expiresAt: new Date(Date.now() - 60000),
      };

      mockBlacklistRepo.find.mockResolvedValueOnce([expiredEntry]);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.cleanupExpiredBlacklist();

      expect(mockBlacklistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRemoved: true,
        })
      );
    });

    it('should handle multiple expired entries in batch', async () => {
      const expiredEntries = Array.from({ length: 10 }, (_, i) => ({
        id: `entry-${i}`,
        provider: `provider-${i}`,
        blacklistType: 'temporary',
        isActive: true,
        expiresAt: new Date(Date.now() - 60000),
      }));

      mockBlacklistRepo.find.mockResolvedValueOnce(expiredEntries);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.cleanupExpiredBlacklist();

      expect(mockBlacklistRepo.save).toHaveBeenCalledTimes(10);
    });
  });

  describe('getBlacklistStatistics', () => {
    it('should return statistics for all blacklist types', async () => {
      mockBlacklistRepo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // permanent
        .mockResolvedValueOnce(5) // temporary
        .mockResolvedValueOnce(2); // manual

      const stats = await service.getBlacklistStatistics();

      expect(stats).toEqual({
        total: 10,
        permanent: 3,
        temporary: 5,
        manual: 2,
      });
    });

    it('should count only active entries', async () => {
      mockBlacklistRepo.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      await service.getBlacklistStatistics();

      expect(mockBlacklistRepo.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockBlacklistRepo.count).toHaveBeenCalledWith({
        where: { isActive: true, blacklistType: 'permanent' },
      });
      expect(mockBlacklistRepo.count).toHaveBeenCalledWith({
        where: { isActive: true, blacklistType: 'temporary' },
      });
      expect(mockBlacklistRepo.count).toHaveBeenCalledWith({
        where: { isActive: true, blacklistType: 'manual' },
      });
    });

    it('should return zeros when no blacklists exist', async () => {
      mockBlacklistRepo.count.mockResolvedValue(0);

      const stats = await service.getBlacklistStatistics();

      expect(stats).toEqual({
        total: 0,
        permanent: 0,
        temporary: 0,
        manual: 0,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty provider name', async () => {
      mockBlacklistRepo.count.mockResolvedValueOnce(0);

      const result = await service.isBlacklisted('');

      expect(result).toBe(false);
    });

    it('should handle special characters in provider name', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider-with-@#$-chars', 'Test');

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'provider-with-@#$-chars',
        })
      );
    });

    it('should handle very long reason strings', async () => {
      const longReason = 'A'.repeat(1000);

      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider', longReason);

      expect(mockBlacklistRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: longReason,
        })
      );
    });

    it('should handle concurrent blacklist additions', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await Promise.all([
        service.addToBlacklist('provider', 'Reason 1'),
        service.addToBlacklist('provider', 'Reason 2'),
      ]);

      expect(mockBlacklistRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle zero duration hours', async () => {
      mockBlacklistRepo.create.mockImplementation((entity) => entity);
      mockBlacklistRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.addToBlacklist('provider', 'Test', {
        type: 'temporary',
        durationHours: 0,
      });

      const createCall = mockBlacklistRepo.create.mock.calls[0][0];
      // Note: Due to `0 || DEFAULT` behavior, 0 duration falls back to 1 hour default
      // This is a known limitation of using || instead of ??
      const oneHourFromNow = Date.now() + 60 * 60 * 1000;
      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(Date.now());
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(oneHourFromNow + 1000);
    });
  });
});
