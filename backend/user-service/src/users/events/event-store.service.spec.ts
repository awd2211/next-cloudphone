import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { EventStoreService } from './event-store.service';
import { UserEvent } from '../../entities/user-event.entity';
import { UserCreatedEvent, UserUpdatedEvent } from './user.events';

/**
 * Event Store Service 单元测试
 */
describe('EventStoreService', () => {
  let service: EventStoreService;
  let repository: jest.Mocked<Repository<UserEvent>>;
  let eventBus: jest.Mocked<EventBus>;

  const mockTransactionalEntityManager = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn(async (callback) => {
        return await callback(mockTransactionalEntityManager);
      }),
      find: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventStoreService,
        {
          provide: getRepositoryToken(UserEvent),
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<EventStoreService>(EventStoreService);
    repository = module.get(getRepositoryToken(UserEvent));
    eventBus = module.get(EventBus);

    jest.clearAllMocks();
  });

  describe('saveEvent', () => {
    it('should save event successfully when no version conflict', async () => {
      const userId = 'test-user-id';
      const event = new UserCreatedEvent(userId, 1, 'testuser', 'test@example.com', 'Test User');

      const metadata = { userId: 'admin', ipAddress: '127.0.0.1' };

      repository.findOne.mockResolvedValue(null); // No conflict
      repository.create.mockReturnValue({
        id: 'event-id',
        aggregateId: userId,
        eventType: 'UserCreated',
        eventData: event.getEventData(),
        version: 1,
        metadata,
        createdAt: new Date(),
      } as UserEvent);

      repository.save.mockResolvedValue({
        id: 'event-id',
        aggregateId: userId,
        eventType: 'UserCreated',
        eventData: event.getEventData(),
        version: 1,
        metadata,
        createdAt: new Date(),
      } as UserEvent);

      const result = await service.saveEvent(event, metadata);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { aggregateId: userId, version: 1 },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(event);
      expect(result.aggregateId).toBe(userId);
      expect(result.version).toBe(1);
    });

    it('should throw ConflictException when version conflict exists', async () => {
      const userId = 'test-user-id';
      const event = new UserCreatedEvent(userId, 1, 'testuser', 'test@example.com', 'Test User');

      // Simulate existing event with same version
      repository.findOne.mockResolvedValue({
        id: 'existing-event-id',
        aggregateId: userId,
        version: 1,
      } as UserEvent);

      await expect(service.saveEvent(event)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should publish event to EventBus after saving', async () => {
      const userId = 'test-user-id';
      const event = new UserUpdatedEvent(userId, 2, { fullName: 'Updated Name' });

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({} as UserEvent);
      repository.save.mockResolvedValue({} as UserEvent);

      await service.saveEvent(event);

      expect(eventBus.publish).toHaveBeenCalledWith(event);
    });
  });

  describe('getEventsForAggregate', () => {
    it('should return events ordered by version', async () => {
      const userId = 'test-user-id';
      const mockEvents = [
        { id: '1', version: 1, eventType: 'UserCreated' },
        { id: '2', version: 2, eventType: 'UserUpdated' },
        { id: '3', version: 3, eventType: 'PasswordChanged' },
      ] as UserEvent[];

      repository.find.mockResolvedValue(mockEvents);

      const result = await service.getEventsForAggregate(userId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { aggregateId: userId },
        order: { version: 'ASC' },
      });
      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(3);
    });

    it('should return empty array for non-existent aggregate', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getEventsForAggregate('non-existent-id');

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version number', async () => {
      const userId = 'test-user-id';

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxVersion: 5 }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const version = await service.getCurrentVersion(userId);

      expect(version).toBe(5);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('MAX(event.version)', 'maxVersion');
    });

    it('should return 0 for new aggregate with no events', async () => {
      const userId = 'new-user-id';

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const version = await service.getCurrentVersion(userId);

      expect(version).toBe(0);
    });
  });

  describe('getEventsFromVersion', () => {
    it('should return events starting from specified version', async () => {
      const userId = 'test-user-id';
      const fromVersion = 3;

      const mockEvents = [
        { version: 3, eventType: 'UserUpdated' },
        { version: 4, eventType: 'PasswordChanged' },
        { version: 5, eventType: 'AccountLocked' },
      ] as UserEvent[];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockEvents),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEventsFromVersion(userId, fromVersion);

      expect(result).toEqual(mockEvents);
      // Note: The implementation uses '>' not '>=' to get events AFTER fromVersion
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.version > :fromVersion', {
        fromVersion,
      });
    });
  });

  describe('countEvents', () => {
    it('should count all events for aggregate', async () => {
      const userId = 'test-user-id';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const count = await service.countEvents(userId);

      expect(count).toBe(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('event.aggregateId = :aggregateId', {
        aggregateId: userId,
      });
    });

    it('should count events by type', async () => {
      const userId = 'test-user-id';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const count = await service.countEvents(userId, 'UserUpdated');

      expect(count).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('event.aggregateId = :aggregateId', {
        aggregateId: userId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.eventType = :eventType', {
        eventType: 'UserUpdated',
      });
    });
  });

  describe('saveEvents (batch)', () => {
    it('should save multiple events in batch', async () => {
      const userId = 'test-user-id';
      const events = [
        new UserCreatedEvent(userId, 1, 'user', 'user@test.com', 'User'),
        new UserUpdatedEvent(userId, 2, { fullName: 'Updated' }),
      ];

      // Setup transaction mocks
      mockTransactionalEntityManager.find.mockResolvedValue([]); // No conflicts

      const mockEventEntities = events.map((event, index) => ({
        id: `event-${index}`,
        aggregateId: event.aggregateId,
        eventType: event.getEventType(),
        eventData: event.getEventData(),
        version: event.version,
        createdAt: new Date(),
      } as UserEvent));

      repository.create.mockImplementation((data: any) => data as UserEvent);
      mockTransactionalEntityManager.save.mockResolvedValue(mockEventEntities);

      const results = await service.saveEvents(events);

      expect(results).toHaveLength(2);
      expect(mockTransactionalEntityManager.save).toHaveBeenCalledTimes(1); // Batch save
      expect(eventBus.publish).toHaveBeenCalledTimes(2);
    });
  });
});
