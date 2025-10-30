import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationPreferencesService } from '../preferences.service';
import {
  NotificationPreference,
  NotificationType,
  NotificationChannel,
} from '../../entities/notification-preference.entity';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let repository: jest.Mocked<Repository<NotificationPreference>>;

  const mockUserId = 'user-123';

  const mockPreference: NotificationPreference = {
    id: 'pref-123',
    userId: mockUserId,
    notificationType: NotificationType.DEVICE_CREATED,
    enabled: true,
    enabledChannels: [NotificationChannel.WEBSOCKET],
    customSettings: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    repository = module.get(getRepositoryToken(NotificationPreference));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return existing preferences for user', async () => {
      const mockPreferences = [mockPreference];
      repository.find.mockResolvedValue(mockPreferences);

      const result = await service.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { notificationType: 'ASC' },
      });
    });

    it('should auto-create 28 default preferences if none exist', async () => {
      repository.find.mockResolvedValue([]); // No existing preferences

      // Mock create and save for default preferences
      const mockDefaults = Array.from({ length: 28 }, (_, i) => ({
        ...mockPreference,
        id: `pref-${i}`,
        notificationType: Object.values(NotificationType)[i],
      }));

      repository.create.mockImplementation((dto) => dto as NotificationPreference);
      repository.save.mockResolvedValue(mockDefaults as any);

      const result = await service.getUserPreferences(mockUserId);

      expect(repository.find).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toHaveLength(28); // Should create 28 default types
    });
  });

  describe('getUserPreference', () => {
    it('should return existing preference for specific type', async () => {
      repository.findOne.mockResolvedValue(mockPreference);

      const result = await service.getUserPreference(mockUserId, NotificationType.DEVICE_CREATED);

      expect(result).toEqual(mockPreference);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, notificationType: NotificationType.DEVICE_CREATED },
      });
    });

    it('should auto-create default preference if missing', async () => {
      repository.findOne.mockResolvedValue(null); // Not found
      repository.create.mockReturnValue(mockPreference);
      repository.save.mockResolvedValue(mockPreference);

      const result = await service.getUserPreference(mockUserId, NotificationType.DEVICE_CREATED);

      expect(result).toEqual(mockPreference);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(mockPreference);
    });

    it('should throw NotFoundException for invalid notification type', async () => {
      repository.findOne.mockResolvedValue(null);

      // Use an invalid type that's not in DEFAULT_NOTIFICATION_PREFERENCES
      const invalidType = 'invalid.type' as NotificationType;

      await expect(service.getUserPreference(mockUserId, invalidType)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserPreference', () => {
    it('should update existing preference with all fields', async () => {
      const updates = {
        enabled: false,
        enabledChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        customSettings: { key: 'value' },
      };

      const updatedPreference = { ...mockPreference, ...updates };

      repository.findOne.mockResolvedValue(mockPreference);
      repository.save.mockResolvedValue(updatedPreference);

      const result = await service.updateUserPreference(
        mockUserId,
        NotificationType.DEVICE_CREATED,
        updates,
      );

      expect(result.enabled).toBe(false);
      expect(result.enabledChannels).toEqual([NotificationChannel.EMAIL, NotificationChannel.SMS]);
      expect(result.customSettings).toEqual({ key: 'value' });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should create new preference if does not exist', async () => {
      const updates = {
        enabled: true,
        enabledChannels: [NotificationChannel.WEBSOCKET],
      };

      repository.findOne.mockResolvedValue(null); // Not found
      repository.create.mockReturnValue({ ...mockPreference, ...updates });
      repository.save.mockResolvedValue({ ...mockPreference, ...updates });

      const result = await service.updateUserPreference(
        mockUserId,
        NotificationType.DEVICE_CREATED,
        updates,
      );

      expect(repository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        notificationType: NotificationType.DEVICE_CREATED,
        ...updates,
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should update partial fields only', async () => {
      const updates = { enabled: false }; // Only update enabled

      const updatedPreference = { ...mockPreference, enabled: false };

      repository.findOne.mockResolvedValue(mockPreference);
      repository.save.mockResolvedValue(updatedPreference);

      const result = await service.updateUserPreference(
        mockUserId,
        NotificationType.DEVICE_CREATED,
        updates,
      );

      expect(result.enabled).toBe(false);
      // Other fields should remain unchanged
      expect(result.enabledChannels).toEqual(mockPreference.enabledChannels);
    });
  });

  describe('batchUpdatePreferences', () => {
    it('should update multiple preferences in batch', async () => {
      const batchUpdates = [
        {
          notificationType: NotificationType.DEVICE_CREATED,
          enabled: false,
        },
        {
          notificationType: NotificationType.DEVICE_STARTED,
          enabled: true,
          enabledChannels: [NotificationChannel.EMAIL],
        },
      ];

      const mockPref1 = { ...mockPreference, notificationType: NotificationType.DEVICE_CREATED };
      const mockPref2 = { ...mockPreference, notificationType: NotificationType.DEVICE_STARTED };

      repository.findOne.mockResolvedValueOnce(mockPref1).mockResolvedValueOnce(mockPref2);

      repository.save
        .mockResolvedValueOnce({ ...mockPref1, enabled: false })
        .mockResolvedValueOnce({
          ...mockPref2,
          enabled: true,
          enabledChannels: [NotificationChannel.EMAIL],
        });

      const results = await service.batchUpdatePreferences(mockUserId, batchUpdates);

      expect(results).toHaveLength(2);
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle mix of create and update in batch', async () => {
      const batchUpdates = [
        { notificationType: NotificationType.DEVICE_CREATED, enabled: false }, // Update existing
        { notificationType: NotificationType.DEVICE_STARTED, enabled: true }, // Create new
      ];

      repository.findOne
        .mockResolvedValueOnce(mockPreference) // First exists
        .mockResolvedValueOnce(null); // Second doesn't exist

      repository.create.mockReturnValue({
        ...mockPreference,
        notificationType: NotificationType.DEVICE_STARTED,
      });

      repository.save
        .mockResolvedValueOnce({ ...mockPreference, enabled: false })
        .mockResolvedValueOnce({
          ...mockPreference,
          notificationType: NotificationType.DEVICE_STARTED,
        });

      const results = await service.batchUpdatePreferences(mockUserId, batchUpdates);

      expect(results).toHaveLength(2);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetToDefault', () => {
    it('should delete all preferences and recreate 28 defaults', async () => {
      const mockDefaults = Array.from({ length: 28 }, (_, i) => ({
        ...mockPreference,
        id: `pref-${i}`,
      }));

      repository.delete.mockResolvedValue({ affected: 5, raw: [] } as any);
      repository.create.mockImplementation((dto) => dto as NotificationPreference);
      repository.save.mockResolvedValue(mockDefaults as any);

      const result = await service.resetToDefault(mockUserId);

      expect(repository.delete).toHaveBeenCalledWith({ userId: mockUserId });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toHaveLength(28);
    });
  });

  describe('shouldReceiveNotification', () => {
    it('should return false if preference is disabled', async () => {
      const disabledPreference = { ...mockPreference, enabled: false };
      repository.findOne.mockResolvedValue(disabledPreference);

      const result = await service.shouldReceiveNotification(
        mockUserId,
        NotificationType.DEVICE_CREATED,
        NotificationChannel.WEBSOCKET,
      );

      expect(result).toBe(false);
    });

    it('should return false if channel is not enabled', async () => {
      const preference = {
        ...mockPreference,
        enabled: true,
        enabledChannels: [NotificationChannel.WEBSOCKET], // Only WebSocket enabled
      };
      repository.findOne.mockResolvedValue(preference);

      const result = await service.shouldReceiveNotification(
        mockUserId,
        NotificationType.DEVICE_CREATED,
        NotificationChannel.EMAIL, // Try to send via EMAIL
      );

      expect(result).toBe(false);
    });

    it('should return false for non-critical notifications during quiet hours', async () => {
      // Mock current time as 23:00 (in quiet hours 22:00-08:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      const preferenceWithQuietHours = {
        ...mockPreference,
        enabled: true,
        enabledChannels: [NotificationChannel.WEBSOCKET],
        customSettings: {
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        },
      };

      repository.findOne.mockResolvedValue(preferenceWithQuietHours);

      const result = await service.shouldReceiveNotification(
        mockUserId,
        NotificationType.DEVICE_CREATED, // Non-critical type
        NotificationChannel.WEBSOCKET,
      );

      expect(result).toBe(false);
    });

    it('should return true for critical notifications even during quiet hours', async () => {
      // Mock current time as 23:00 (in quiet hours 22:00-08:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      const preferenceWithQuietHours = {
        ...mockPreference,
        notificationType: NotificationType.DEVICE_ERROR, // Critical type
        enabled: true,
        enabledChannels: [NotificationChannel.WEBSOCKET],
        customSettings: {
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        },
      };

      repository.findOne.mockResolvedValue(preferenceWithQuietHours);

      const result = await service.shouldReceiveNotification(
        mockUserId,
        NotificationType.DEVICE_ERROR, // Critical type
        NotificationChannel.WEBSOCKET,
      );

      expect(result).toBe(true);
    });

    it('should return true when all conditions are met and not in quiet hours', async () => {
      // Mock current time as 14:00 (not in quiet hours)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      const preference = {
        ...mockPreference,
        enabled: true,
        enabledChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      };

      repository.findOne.mockResolvedValue(preference);

      const result = await service.shouldReceiveNotification(
        mockUserId,
        NotificationType.DEVICE_CREATED,
        NotificationChannel.WEBSOCKET,
      );

      expect(result).toBe(true);
    });
  });

  describe('getEnabledNotificationTypes', () => {
    it('should filter preferences by channel', async () => {
      const mockPreferences = [
        {
          ...mockPreference,
          notificationType: NotificationType.DEVICE_CREATED,
          enabled: true,
          enabledChannels: [NotificationChannel.WEBSOCKET],
        },
        {
          ...mockPreference,
          notificationType: NotificationType.DEVICE_ERROR,
          enabled: true,
          enabledChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
        },
        {
          ...mockPreference,
          notificationType: NotificationType.APP_INSTALLED,
          enabled: true,
          enabledChannels: [NotificationChannel.EMAIL], // Only EMAIL
        },
        {
          ...mockPreference,
          notificationType: NotificationType.USER_LOGIN,
          enabled: false, // Disabled
          enabledChannels: [NotificationChannel.WEBSOCKET],
        },
      ];

      repository.find.mockResolvedValue(mockPreferences as any);

      const result = await service.getEnabledNotificationTypes(
        mockUserId,
        NotificationChannel.WEBSOCKET,
      );

      // Should return only DEVICE_CREATED and DEVICE_ERROR (enabled + has WEBSOCKET channel)
      expect(result).toHaveLength(2);
      expect(result).toContain(NotificationType.DEVICE_CREATED);
      expect(result).toContain(NotificationType.DEVICE_ERROR);
      expect(result).not.toContain(NotificationType.APP_INSTALLED); // No WEBSOCKET
      expect(result).not.toContain(NotificationType.USER_LOGIN); // Disabled
    });
  });

  describe('getUserPreferenceStats', () => {
    it('should calculate correct statistics', async () => {
      const mockPreferences = [
        {
          ...mockPreference,
          notificationType: NotificationType.DEVICE_CREATED,
          enabled: true,
          enabledChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
        },
        {
          ...mockPreference,
          notificationType: NotificationType.DEVICE_ERROR,
          enabled: true,
          enabledChannels: [NotificationChannel.SMS],
        },
        {
          ...mockPreference,
          notificationType: NotificationType.APP_INSTALLED,
          enabled: false, // Disabled
          enabledChannels: [NotificationChannel.WEBSOCKET],
        },
      ];

      repository.find.mockResolvedValue(mockPreferences as any);

      const stats = await service.getUserPreferenceStats(mockUserId);

      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2);
      expect(stats.disabled).toBe(1);
      expect(stats.byChannel[NotificationChannel.WEBSOCKET]).toBe(1); // Only first (enabled)
      expect(stats.byChannel[NotificationChannel.EMAIL]).toBe(1); // Only first
      expect(stats.byChannel[NotificationChannel.SMS]).toBe(1); // Second
    });
  });
});
