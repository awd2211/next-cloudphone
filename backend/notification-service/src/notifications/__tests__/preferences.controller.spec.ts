import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesController } from '../preferences.controller';
import { NotificationPreferencesService } from '../preferences.service';
import { NotificationType, NotificationChannel } from '../../entities/notification-preference.entity';

describe('NotificationPreferencesController', () => {
  let controller: NotificationPreferencesController;
  let service: jest.Mocked<NotificationPreferencesService>;

  const mockPreference = {
    id: 'pref-123',
    userId: 'user-123',
    notificationType: NotificationType.DEVICE_CREATED,
    enabled: true,
    enabledChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    customSettings: {},
    createdAt: new Date('2025-11-06'),
    updatedAt: new Date('2025-11-06'),
  };

  beforeEach(async () => {
    const mockService = {
      getUserPreferences: jest.fn(),
      getUserPreference: jest.fn(),
      updateUserPreference: jest.fn(),
      batchUpdatePreferences: jest.fn(),
      resetToDefault: jest.fn(),
      getUserPreferenceStats: jest.fn(),
      shouldReceiveNotification: jest.fn(),
      getEnabledNotificationTypes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferencesController],
      providers: [
        {
          provide: NotificationPreferencesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationPreferencesController>(NotificationPreferencesController);
    service = module.get(NotificationPreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return all user preferences', async () => {
      const preferences = [
        mockPreference,
        { ...mockPreference, id: 'pref-124', notificationType: NotificationType.DEVICE_STARTED },
      ];
      service.getUserPreferences.mockResolvedValue(preferences as any);

      const result = await controller.getUserPreferences('user-123');

      expect(service.getUserPreferences).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        userId: 'user-123',
        preferences: expect.arrayContaining([
          expect.objectContaining({
            notificationType: NotificationType.DEVICE_CREATED,
            enabled: true,
          }),
          expect.objectContaining({
            notificationType: NotificationType.DEVICE_STARTED,
            enabled: true,
          }),
        ]),
      });
      expect(result.preferences).toHaveLength(2);
    });

    it('should return empty array when user has no preferences', async () => {
      service.getUserPreferences.mockResolvedValue([]);

      const result = await controller.getUserPreferences('user-123');

      expect(result.preferences).toEqual([]);
    });
  });

  describe('getUserPreference', () => {
    it('should return specific user preference', async () => {
      service.getUserPreference.mockResolvedValue(mockPreference as any);

      const result = await controller.getUserPreference(
        NotificationType.DEVICE_CREATED,
        'user-123'
      );

      expect(service.getUserPreference).toHaveBeenCalledWith(
        'user-123',
        NotificationType.DEVICE_CREATED
      );
      expect(result).toEqual({
        userId: 'user-123',
        notificationType: NotificationType.DEVICE_CREATED,
        enabled: true,
        enabledChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
        customSettings: {},
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('updateUserPreference', () => {
    it('should update user preference successfully', async () => {
      const updateDto = {
        enabled: false,
        enabledChannels: [NotificationChannel.WEBSOCKET],
      };
      const updatedPreference = {
        ...mockPreference,
        enabled: false,
        enabledChannels: [NotificationChannel.WEBSOCKET],
      };
      service.updateUserPreference.mockResolvedValue(updatedPreference as any);

      const result = await controller.updateUserPreference(
        NotificationType.DEVICE_CREATED,
        'user-123',
        updateDto
      );

      expect(service.updateUserPreference).toHaveBeenCalledWith(
        'user-123',
        NotificationType.DEVICE_CREATED,
        updateDto
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification preference updated successfully');
      expect(result.preference.enabled).toBe(false);
      expect(result.preference.enabledChannels).toEqual([NotificationChannel.WEBSOCKET]);
    });

    it('should update only enabled flag', async () => {
      const updateDto = { enabled: false };
      const updatedPreference = { ...mockPreference, enabled: false };
      service.updateUserPreference.mockResolvedValue(updatedPreference as any);

      const result = await controller.updateUserPreference(
        NotificationType.DEVICE_CREATED,
        'user-123',
        updateDto
      );

      expect(result.preference.enabled).toBe(false);
      expect(result.preference.enabledChannels).toEqual(mockPreference.enabledChannels);
    });

    it('should update custom settings', async () => {
      const updateDto = { customSettings: { emailFrequency: 'daily' } };
      const updatedPreference = {
        ...mockPreference,
        customSettings: { emailFrequency: 'daily' },
      };
      service.updateUserPreference.mockResolvedValue(updatedPreference as any);

      const result = await controller.updateUserPreference(
        NotificationType.DEVICE_CREATED,
        'user-123',
        updateDto
      );

      expect(result.preference.customSettings).toEqual({ emailFrequency: 'daily' });
    });
  });

  describe('batchUpdatePreferences', () => {
    it('should batch update multiple preferences', async () => {
      const batchDto = {
        preferences: [
          {
            notificationType: NotificationType.DEVICE_CREATED,
            enabled: false,
          },
          {
            notificationType: NotificationType.DEVICE_STARTED,
            enabled: true,
            enabledChannels: [NotificationChannel.WEBSOCKET],
          },
        ],
      };
      const updatedPreferences = [
        { ...mockPreference, enabled: false },
        {
          ...mockPreference,
          id: 'pref-124',
          notificationType: NotificationType.DEVICE_STARTED,
          enabledChannels: [NotificationChannel.WEBSOCKET],
        },
      ];
      service.batchUpdatePreferences.mockResolvedValue(updatedPreferences as any);

      const result = await controller.batchUpdatePreferences('user-123', batchDto);

      expect(service.batchUpdatePreferences).toHaveBeenCalledWith(
        'user-123',
        batchDto.preferences
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('2 preferences updated successfully');
      expect(result.updatedCount).toBe(2);
    });

    it('should handle empty batch update', async () => {
      const batchDto = { preferences: [] };
      service.batchUpdatePreferences.mockResolvedValue([]);

      const result = await controller.batchUpdatePreferences('user-123', batchDto);

      expect(result.updatedCount).toBe(0);
      expect(result.message).toBe('0 preferences updated successfully');
    });
  });

  describe('resetToDefault', () => {
    it('should reset all preferences to default', async () => {
      const defaultPreferences = [
        mockPreference,
        { ...mockPreference, id: 'pref-124', notificationType: NotificationType.DEVICE_STARTED },
        { ...mockPreference, id: 'pref-125', notificationType: NotificationType.APP_INSTALLED },
      ];
      service.resetToDefault.mockResolvedValue(defaultPreferences as any);

      const result = await controller.resetToDefault('user-123');

      expect(service.resetToDefault).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Preferences reset to default successfully');
      expect(result.totalPreferences).toBe(3);
    });
  });

  describe('getAvailableNotificationTypes', () => {
    it('should return all available notification types', async () => {
      const result = await controller.getAvailableNotificationTypes();

      expect(result.total).toBeGreaterThan(0);
      expect(result.types).toBeInstanceOf(Array);
      expect(result.types[0]).toHaveProperty('type');
      expect(result.types[0]).toHaveProperty('description');
      expect(result.types[0]).toHaveProperty('priority');
      expect(result.types[0]).toHaveProperty('defaultChannels');
    });
  });

  describe('getUserPreferenceStats', () => {
    it('should return user preference statistics', async () => {
      const mockStats = {
        total: 10,
        enabled: 8,
        disabled: 2,
        byChannel: {
          websocket: 8,
          email: 5,
          sms: 2,
        } as Record<NotificationChannel, number>,
      };
      service.getUserPreferenceStats.mockResolvedValue(mockStats);

      const result = await controller.getUserPreferenceStats('user-123');

      expect(service.getUserPreferenceStats).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        userId: 'user-123',
        stats: mockStats,
      });
    });
  });

  describe('checkShouldReceive', () => {
    it('should return true when user should receive notification', async () => {
      service.shouldReceiveNotification.mockResolvedValue(true);

      const result = await controller.checkShouldReceive({
        userId: 'user-123',
        notificationType: NotificationType.DEVICE_CREATED,
        channel: NotificationChannel.WEBSOCKET,
      });

      expect(service.shouldReceiveNotification).toHaveBeenCalledWith(
        'user-123',
        NotificationType.DEVICE_CREATED,
        NotificationChannel.WEBSOCKET
      );
      expect(result.shouldReceive).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.notificationType).toBe(NotificationType.DEVICE_CREATED);
      expect(result.channel).toBe(NotificationChannel.WEBSOCKET);
    });

    it('should return false when user should not receive notification', async () => {
      service.shouldReceiveNotification.mockResolvedValue(false);

      const result = await controller.checkShouldReceive({
        userId: 'user-123',
        notificationType: NotificationType.DEVICE_CREATED,
        channel: NotificationChannel.SMS,
      });

      expect(result.shouldReceive).toBe(false);
    });
  });

  describe('getEnabledTypesForChannel', () => {
    it('should return enabled notification types for specific channel', async () => {
      const enabledTypes = [
        NotificationType.DEVICE_CREATED,
        NotificationType.DEVICE_STARTED,
        NotificationType.APP_INSTALLED,
      ];
      service.getEnabledNotificationTypes.mockResolvedValue(enabledTypes);

      const result = await controller.getEnabledTypesForChannel(
        NotificationChannel.WEBSOCKET,
        'user-123'
      );

      expect(service.getEnabledNotificationTypes).toHaveBeenCalledWith(
        'user-123',
        NotificationChannel.WEBSOCKET
      );
      expect(result.userId).toBe('user-123');
      expect(result.channel).toBe(NotificationChannel.WEBSOCKET);
      expect(result.enabledTypes).toEqual(enabledTypes);
      expect(result.count).toBe(3);
    });

    it('should return empty array when no types enabled for channel', async () => {
      service.getEnabledNotificationTypes.mockResolvedValue([]);

      const result = await controller.getEnabledTypesForChannel(
        NotificationChannel.SMS,
        'user-123'
      );

      expect(result.enabledTypes).toEqual([]);
      expect(result.count).toBe(0);
    });
  });
});
