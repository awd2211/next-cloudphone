import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventStoreService } from './event-store.service';
import { EventReplayService } from './event-replay.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventStoreService: any;
  let eventReplayService: any;

  const mockEventStoreService = {
    countEvents: jest.fn(),
    getEventsByType: jest.fn(),
  };

  const mockEventReplayService = {
    getUserEventHistory: jest.fn(),
    replayUserEvents: jest.fn(),
    replayToVersion: jest.fn(),
    replayToTimestamp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventStoreService,
          useValue: mockEventStoreService,
        },
        {
          provide: EventReplayService,
          useValue: mockEventReplayService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventStoreService = module.get(EventStoreService);
    eventReplayService = module.get(EventReplayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have eventStoreService injected', () => {
      expect(eventStoreService).toBeDefined();
      expect(eventStoreService).toBe(mockEventStoreService);
    });

    it('should have eventReplayService injected', () => {
      expect(eventReplayService).toBeDefined();
      expect(eventReplayService).toBe(mockEventReplayService);
    });
  });

  describe('getUserEventHistory', () => {
    it('should return user event history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          eventId: 1,
          eventType: 'UserCreated',
          version: 1,
          timestamp: '2024-01-01T10:00:00Z',
          data: { username: 'testuser', email: 'test@example.com' },
        },
        {
          eventId: 2,
          eventType: 'UserUpdated',
          version: 2,
          timestamp: '2024-01-02T11:00:00Z',
          data: { email: 'newemail@example.com' },
        },
      ];

      mockEventReplayService.getUserEventHistory.mockResolvedValue(mockHistory);

      const result = await controller.getUserEventHistory(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
      expect(result.message).toBe('事件历史获取成功');
      expect(mockEventReplayService.getUserEventHistory).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no events', async () => {
      mockEventReplayService.getUserEventHistory.mockResolvedValue([]);

      const result = await controller.getUserEventHistory('user-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('replayUserEvents', () => {
    it('should replay user events and return current state', async () => {
      const userId = 'user-123';
      const mockUserState = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        version: 5,
        status: 'active',
      };

      mockEventReplayService.replayUserEvents.mockResolvedValue(mockUserState);

      const result = await controller.replayUserEvents(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserState);
      expect(result.message).toBe('事件重放成功');
      expect(mockEventReplayService.replayUserEvents).toHaveBeenCalledWith(userId);
    });

    it('should include all user properties in replayed state', async () => {
      const mockUserState = {
        id: 'user-789',
        username: 'john',
        email: 'john@example.com',
        version: 10,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      mockEventReplayService.replayUserEvents.mockResolvedValue(mockUserState);

      const result = await controller.replayUserEvents('user-789');

      expect(result.data.version).toBe(10);
      expect(result.data.createdAt).toBeDefined();
      expect(result.data.updatedAt).toBeDefined();
    });
  });

  describe('replayToVersion', () => {
    it('should replay events to specific version', async () => {
      const userId = 'user-123';
      const targetVersion = 3;
      const mockUserState = {
        id: userId,
        username: 'testuser',
        email: 'old@example.com',
        version: targetVersion,
      };

      mockEventReplayService.replayToVersion.mockResolvedValue(mockUserState);

      const result = await controller.replayToVersion(userId, targetVersion);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserState);
      expect(result.data.version).toBe(targetVersion);
      expect(result.message).toBe(`重放到版本 ${targetVersion} 成功`);
      expect(mockEventReplayService.replayToVersion).toHaveBeenCalledWith(userId, targetVersion);
    });

    it('should replay to version 1 (initial state)', async () => {
      const mockUserState = {
        id: 'user-456',
        username: 'newuser',
        email: 'newuser@example.com',
        version: 1,
      };

      mockEventReplayService.replayToVersion.mockResolvedValue(mockUserState);

      const result = await controller.replayToVersion('user-456', 1);

      expect(result.data.version).toBe(1);
      expect(result.message).toBe('重放到版本 1 成功');
    });

    it('should handle large version numbers', async () => {
      const mockUserState = {
        id: 'user-789',
        version: 100,
      };

      mockEventReplayService.replayToVersion.mockResolvedValue(mockUserState);

      const result = await controller.replayToVersion('user-789', 100);

      expect(result.success).toBe(true);
      expect(result.data.version).toBe(100);
    });
  });

  describe('timeTravel', () => {
    it('should replay events to specific timestamp', async () => {
      const userId = 'user-123';
      const timestamp = '2024-01-15T12:00:00.000Z';
      const mockUserState = {
        id: userId,
        username: 'testuser',
        email: 'historical@example.com',
        version: 7,
      };

      mockEventReplayService.replayToTimestamp.mockResolvedValue(mockUserState);

      const result = await controller.timeTravel(userId, timestamp);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserState);
      expect(result.message).toBe(`时间旅行到 ${timestamp} 成功`);
      expect(mockEventReplayService.replayToTimestamp).toHaveBeenCalledWith(
        userId,
        new Date(timestamp)
      );
    });

    it('should return error for invalid timestamp', async () => {
      const result = await controller.timeTravel('user-123', 'invalid-date');

      expect(result.success).toBe(false);
      expect(result.message).toBe('无效的时间戳格式');
      expect(mockEventReplayService.replayToTimestamp).not.toHaveBeenCalled();
    });

    it('should handle different timestamp formats', async () => {
      const mockUserState = { id: 'user-456', version: 5 };
      mockEventReplayService.replayToTimestamp.mockResolvedValue(mockUserState);

      // ISO 8601 format
      const result = await controller.timeTravel('user-456', '2024-06-01T00:00:00Z');

      expect(result.success).toBe(true);
      expect(mockEventReplayService.replayToTimestamp).toHaveBeenCalled();
    });

    it('should reject malformed timestamps', async () => {
      const invalidTimestamps = ['not-a-date', '123abc', 'NaN'];

      for (const ts of invalidTimestamps) {
        const result = await controller.timeTravel('user-123', ts);
        expect(result.success).toBe(false);
        expect(result.message).toBe('无效的时间戳格式');
      }
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      mockEventStoreService.countEvents.mockResolvedValueOnce(150); // Total
      mockEventStoreService.countEvents.mockResolvedValueOnce(50); // UserCreated
      mockEventStoreService.countEvents.mockResolvedValueOnce(40); // UserUpdated
      mockEventStoreService.countEvents.mockResolvedValueOnce(30); // PasswordChanged
      mockEventStoreService.countEvents.mockResolvedValueOnce(10); // UserDeleted
      mockEventStoreService.countEvents.mockResolvedValueOnce(15); // LoginInfoUpdated
      mockEventStoreService.countEvents.mockResolvedValueOnce(5); // AccountLocked

      const result = await controller.getEventStats();

      expect(result.success).toBe(true);
      expect(result.data.totalEvents).toBe(150);
      expect(result.data.eventsByType).toEqual({
        UserCreated: 50,
        UserUpdated: 40,
        PasswordChanged: 30,
        UserDeleted: 10,
        LoginInfoUpdated: 15,
        AccountLocked: 5,
      });
      expect(result.message).toBe('事件统计获取成功');
    });

    it('should filter by event type when provided', async () => {
      mockEventStoreService.countEvents.mockResolvedValue(25);

      const result = await controller.getEventStats('UserCreated');

      expect(mockEventStoreService.countEvents).toHaveBeenCalledWith(undefined, 'UserCreated');
    });

    it('should return zero counts when no events', async () => {
      mockEventStoreService.countEvents.mockResolvedValue(0);

      const result = await controller.getEventStats();

      expect(result.data.totalEvents).toBe(0);
      expect(result.data.eventsByType.UserCreated).toBe(0);
      expect(result.data.eventsByType.UserDeleted).toBe(0);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events', async () => {
      const mockEvents = [
        {
          id: 1,
          aggregateId: 'user-123',
          eventType: 'UserCreated',
          version: 1,
          createdAt: new Date('2024-01-01'),
          eventData: { username: 'test' },
        },
        {
          id: 2,
          aggregateId: 'user-456',
          eventType: 'UserCreated',
          version: 1,
          createdAt: new Date('2024-01-02'),
          eventData: { username: 'test2' },
        },
      ];

      mockEventStoreService.getEventsByType.mockResolvedValue(mockEvents);

      const result = await controller.getRecentEvents();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.message).toBe('最近事件获取成功');
      expect(mockEventStoreService.getEventsByType).toHaveBeenCalledWith('UserCreated', 50);
    });

    it('should filter by event type', async () => {
      const mockEvents = [
        {
          id: 3,
          aggregateId: 'user-789',
          eventType: 'UserUpdated',
          version: 2,
          createdAt: new Date('2024-01-03'),
          eventData: { email: 'new@example.com' },
        },
      ];

      mockEventStoreService.getEventsByType.mockResolvedValue(mockEvents);

      const result = await controller.getRecentEvents('UserUpdated', '10');

      expect(result.data).toHaveLength(1);
      expect(mockEventStoreService.getEventsByType).toHaveBeenCalledWith('UserUpdated', 10);
    });

    it('should respect limit parameter', async () => {
      mockEventStoreService.getEventsByType.mockResolvedValue([]);

      await controller.getRecentEvents('UserCreated', '100');

      expect(mockEventStoreService.getEventsByType).toHaveBeenCalledWith('UserCreated', 100);
    });

    it('should use default limit of 50', async () => {
      mockEventStoreService.getEventsByType.mockResolvedValue([]);

      await controller.getRecentEvents();

      expect(mockEventStoreService.getEventsByType).toHaveBeenCalledWith('UserCreated', 50);
    });

    it('should map event properties correctly', async () => {
      const mockEvent = {
        id: 10,
        aggregateId: 'user-999',
        eventType: 'PasswordChanged',
        version: 5,
        createdAt: new Date('2024-02-01'),
        eventData: { hashedPassword: 'xxx' },
        someOtherField: 'should-be-excluded',
      };

      mockEventStoreService.getEventsByType.mockResolvedValue([mockEvent]);

      const result = await controller.getRecentEvents();

      expect(result.data[0]).toEqual({
        id: 10,
        aggregateId: 'user-999',
        eventType: 'PasswordChanged',
        version: 5,
        createdAt: mockEvent.createdAt,
        eventData: { hashedPassword: 'xxx' },
      });
      expect(result.data[0]).not.toHaveProperty('someOtherField');
    });
  });

  describe('Response Format', () => {
    it('should return standard response format for getUserEventHistory', async () => {
      mockEventReplayService.getUserEventHistory.mockResolvedValue([]);

      const result = await controller.getUserEventHistory('user-123');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });

    it('should return standard response format for replayUserEvents', async () => {
      mockEventReplayService.replayUserEvents.mockResolvedValue({});

      const result = await controller.replayUserEvents('user-123');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
    });

    it('should return standard response format for getEventStats', async () => {
      mockEventStoreService.countEvents.mockResolvedValue(0);

      const result = await controller.getEventStats();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
    });
  });
});
