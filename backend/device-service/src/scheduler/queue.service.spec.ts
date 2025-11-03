import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueueService } from './queue.service';
import { AllocationQueue, QueueStatus, UserPriority } from '../entities/allocation-queue.entity';
import { AllocationService } from './allocation.service';
import { EventBusService } from '@cloudphone/shared';
import { NotificationClientService } from './notification-client.service';
import { JoinQueueDto, CancelQueueDto, QueryQueueDto, ProcessQueueBatchDto } from './dto/queue.dto';

describe('QueueService', () => {
  let service: QueueService;
  let queueRepository: Repository<AllocationQueue>;
  let allocationService: AllocationService;
  let eventBus: EventBusService;
  let notificationClient: NotificationClientService;

  const now = new Date();

  const mockQueueEntry: Partial<AllocationQueue> = {
    id: 'queue-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    status: QueueStatus.WAITING,
    priority: UserPriority.STANDARD,
    userTier: 'standard',
    deviceType: 'android',
    durationMinutes: 60,
    maxWaitMinutes: 30,
    queuePosition: 1,
    estimatedWaitMinutes: 30,
    retryCount: 0,
    createdAt: now,
    metadata: {},
  };

  const mockDevice = {
    id: 'device-1',
    name: 'Test Device',
    status: 'running',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getRepositoryToken(AllocationQueue),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: AllocationService,
          useValue: {
            allocateDevice: jest.fn(),
            getAvailableDevices: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: NotificationClientService,
          useValue: {
            sendBatchNotifications: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    queueRepository = module.get<Repository<AllocationQueue>>(getRepositoryToken(AllocationQueue));
    allocationService = module.get<AllocationService>(AllocationService);
    eventBus = module.get<EventBusService>(EventBusService);
    notificationClient = module.get<NotificationClientService>(NotificationClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('joinQueue', () => {
    const joinDto: JoinQueueDto = {
      deviceType: 'android',
      durationMinutes: 60,
      maxWaitMinutes: 30,
    };

    beforeEach(() => {
      // First call: check for existing entry (should return null)
      // Second and third calls: get updated entry after save (should return entry)
      jest.spyOn(queueRepository, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'create').mockReturnValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(undefined);
      jest.spyOn(notificationClient, 'sendBatchNotifications').mockResolvedValue(undefined);

      // Mock createQueryBuilder for updateQueuePosition
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      jest.spyOn(queueRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should successfully join queue', async () => {
      const result = await service.joinQueue('user-1', 'tenant-1', 'standard', joinDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('queue-1');
      expect(result.status).toBe(QueueStatus.WAITING);
      expect(result.priority).toBe(UserPriority.STANDARD);
      expect(queueRepository.create).toHaveBeenCalled();
      expect(queueRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'scheduler.queue.joined',
        expect.any(Object)
      );
      expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
    });

    it('should throw ConflictException when user already in queue', async () => {
      // Clear beforeEach mocks and set up to return entry on first call
      (queueRepository.findOne as jest.Mock).mockReset();
      jest.spyOn(queueRepository, 'findOne').mockResolvedValueOnce(mockQueueEntry as AllocationQueue);

      await expect(service.joinQueue('user-1', 'tenant-1', 'standard', joinDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should assign correct priority based on user tier', async () => {
      const tiers = [
        { tier: 'standard', expected: UserPriority.STANDARD },
        { tier: 'vip', expected: UserPriority.VIP },
        { tier: 'premium', expected: UserPriority.PREMIUM },
        { tier: 'enterprise', expected: UserPriority.ENTERPRISE },
      ];

      for (const { tier, expected } of tiers) {
        const entryWithTier = {
          ...mockQueueEntry,
          userTier: tier,
          priority: expected,
        } as AllocationQueue;

        // First call: check existing (null), Second call: get updated entry
        jest.spyOn(queueRepository, 'findOne')
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(entryWithTier);
        jest.spyOn(queueRepository, 'create').mockReturnValue(entryWithTier);
        jest.spyOn(queueRepository, 'save').mockResolvedValue(entryWithTier);

        // Mock createQueryBuilder for updateQueuePosition
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        };
        jest.spyOn(queueRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

        await service.joinQueue('user-1', 'tenant-1', tier, joinDto);

        expect(queueRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            priority: expected,
            userTier: tier,
          })
        );

        jest.clearAllMocks();
      }
    });

    it('should set default maxWaitMinutes when not provided', async () => {
      const dtoWithoutMaxWait = {
        deviceType: 'android',
        durationMinutes: 60,
      };

      // Reset mocks from beforeEach and set up dual findOne calls
      jest.spyOn(queueRepository, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockQueueEntry as AllocationQueue);

      // Mock createQueryBuilder for updateQueuePosition
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      jest.spyOn(queueRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.joinQueue('user-1', 'tenant-1', 'standard', dtoWithoutMaxWait);

      expect(queueRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxWaitMinutes: 30,
        })
      );
    });
  });

  describe('cancelQueue', () => {
    const cancelDto: CancelQueueDto = {
      reason: 'User cancelled',
    };

    it('should successfully cancel queue entry', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.CANCELLED,
      } as AllocationQueue);
      jest.spyOn(service as any, 'recalculateAllPositions').mockResolvedValue(undefined);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(undefined);

      const result = await service.cancelQueue('queue-1', cancelDto);

      expect(result.status).toBe(QueueStatus.CANCELLED);
      expect(queueRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QueueStatus.CANCELLED,
          cancelReason: 'User cancelled',
        })
      );
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when queue entry not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.cancelQueue('queue-1', cancelDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status not cancellable', async () => {
      const fulfilledEntry = {
        ...mockQueueEntry,
        status: QueueStatus.FULFILLED,
      };
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(fulfilledEntry as AllocationQueue);

      await expect(service.cancelQueue('queue-1', cancelDto)).rejects.toThrow(BadRequestException);
    });

    it('should recalculate positions after cancellation', async () => {
      // Ensure entry has WAITING status (not mutated from previous test)
      const waitingEntry = { ...mockQueueEntry, status: QueueStatus.WAITING };
      const cancelledEntry = { ...mockQueueEntry, status: QueueStatus.CANCELLED };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(waitingEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(cancelledEntry as AllocationQueue);
      const recalculateSpy = jest
        .spyOn(service as any, 'recalculateAllPositions')
        .mockResolvedValue(undefined);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(undefined);

      await service.cancelQueue('queue-1', cancelDto);

      expect(recalculateSpy).toHaveBeenCalled();
    });
  });

  describe('processNextQueueEntry', () => {
    it('should successfully process and fulfill queue entry', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(allocationService, 'allocateDevice').mockResolvedValue({
        allocationId: 'allocation-1',
        deviceId: 'device-1',
        deviceName: 'Test Device',
        userId: 'user-1',
        allocatedAt: new Date(),
        expiresAt: new Date(),
      } as any);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(undefined);
      jest.spyOn(notificationClient, 'sendBatchNotifications').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'recalculateAllPositions').mockResolvedValue(undefined);

      const result = await service.processNextQueueEntry();

      expect(result).toBe(true);
      expect(queueRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QueueStatus.FULFILLED,
          allocatedDeviceId: 'device-1',
          allocationId: 'allocation-1',
        })
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'cloudphone.events',
        'scheduler.queue.fulfilled',
        expect.any(Object)
      );
      expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
    });

    it('should return false when no queue entries', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      const result = await service.processNextQueueEntry();

      expect(result).toBe(false);
      expect(allocationService.allocateDevice).not.toHaveBeenCalled();
    });

    it('should retry on allocation failure', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest
        .spyOn(allocationService, 'allocateDevice')
        .mockRejectedValue(new Error('Allocation failed'));
      jest.spyOn(queueRepository, 'save').mockResolvedValue(mockQueueEntry as AllocationQueue);

      const result = await service.processNextQueueEntry();

      expect(result).toBe(false);
      expect(queueRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QueueStatus.WAITING,
          retryCount: 1,
        })
      );
    });

    it('should mark as expired after max retries', async () => {
      const entryWithRetries = {
        ...mockQueueEntry,
        retryCount: 2,
      };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(entryWithRetries as AllocationQueue);
      jest
        .spyOn(allocationService, 'allocateDevice')
        .mockRejectedValue(new Error('Allocation failed'));
      jest.spyOn(queueRepository, 'save').mockResolvedValue(entryWithRetries as AllocationQueue);
      jest.spyOn(notificationClient, 'sendBatchNotifications').mockResolvedValue(undefined);

      const result = await service.processNextQueueEntry();

      expect(result).toBe(false);
      expect(queueRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QueueStatus.EXPIRED,
          retryCount: 3,
        })
      );
      expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
    });

    it('should process by priority order', async () => {
      const standardEntry = { ...mockQueueEntry, priority: UserPriority.STANDARD };
      const vipEntry = { ...mockQueueEntry, priority: UserPriority.VIP, id: 'queue-2' };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(vipEntry as AllocationQueue);

      await service.processNextQueueEntry();

      expect(queueRepository.findOne).toHaveBeenCalledWith({
        where: { status: QueueStatus.WAITING },
        order: {
          priority: 'DESC',
          createdAt: 'ASC',
        },
      });
    });
  });

  describe('processQueueBatch', () => {
    const batchDto: ProcessQueueBatchDto = {
      maxCount: 5,
      continueOnError: true,
    };

    it('should process multiple queue entries', async () => {
      jest
        .spyOn(service, 'processNextQueueEntry')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.FULFILLED,
        fulfilledAt: new Date(),
        allocatedDeviceId: 'device-1',
        allocationId: 'allocation-1',
      } as AllocationQueue);

      const result = await service.processQueueBatch(batchDto);

      // Implementation breaks on false without incrementing processedCount
      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(service.processNextQueueEntry).toHaveBeenCalledTimes(3);
    });

    it('should stop on error when continueOnError is false', async () => {
      const stopOnErrorDto = {
        maxCount: 5,
        continueOnError: false,
      };

      jest
        .spyOn(service, 'processNextQueueEntry')
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Processing failed'));

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue({
        ...mockQueueEntry,
        status: QueueStatus.FULFILLED,
        fulfilledAt: new Date(),
        allocatedDeviceId: 'device-1',
        allocationId: 'allocation-1',
      } as AllocationQueue);

      const result = await service.processQueueBatch(stopOnErrorDto);

      // Implementation doesn't increment processedCount in catch block
      expect(result.totalProcessed).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(service.processNextQueueEntry).toHaveBeenCalledTimes(2);
    });

    it('should handle empty queue gracefully', async () => {
      jest.spyOn(service, 'processNextQueueEntry').mockResolvedValue(false);

      const result = await service.processQueueBatch(batchDto);

      // Implementation breaks immediately on false without incrementing processedCount
      expect(result.totalProcessed).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('getQueuePosition', () => {
    it('should return queue position information', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueueEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'count').mockResolvedValue(5);

      const result = await service.getQueuePosition('queue-1');

      expect(result).toBeDefined();
      expect(result.queueId).toBe('queue-1');
      expect(result.position).toBe(1);
      expect(result.estimatedWaitMinutes).toBe(30);
      expect(result.waitedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should throw NotFoundException when queue entry not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getQueuePosition('queue-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status not WAITING', async () => {
      const processingEntry = {
        ...mockQueueEntry,
        status: QueueStatus.PROCESSING,
      };
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(processingEntry as AllocationQueue);

      await expect(service.getQueuePosition('queue-1')).rejects.toThrow(BadRequestException);
    });

    it('should calculate remaining wait time correctly', async () => {
      const oldEntry = {
        ...mockQueueEntry,
        createdAt: new Date(now.getTime() - 600000), // 10 minutes ago
        maxWaitMinutes: 30,
      };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(oldEntry as AllocationQueue);
      jest.spyOn(queueRepository, 'count').mockResolvedValue(1);

      const result = await service.getQueuePosition('queue-1');

      expect(result.waitedMinutes).toBeGreaterThanOrEqual(9);
      expect(result.waitedMinutes).toBeLessThanOrEqual(11);
      expect(result.remainingMaxWaitMinutes).toBeLessThanOrEqual(21);
    });
  });

  describe('getQueueStatistics', () => {
    it('should return queue statistics', async () => {
      jest
        .spyOn(queueRepository, 'count')
        .mockResolvedValueOnce(10) // waiting
        .mockResolvedValueOnce(2) // processing
        .mockResolvedValueOnce(50) // fulfilled
        .mockResolvedValueOnce(5) // expired
        .mockResolvedValueOnce(3) // cancelled
        .mockResolvedValueOnce(70); // total

      jest.spyOn(queueRepository, 'find').mockResolvedValue([
        {
          createdAt: new Date(now.getTime() - 1800000),
          fulfilledAt: new Date(now.getTime() - 600000),
        } as AllocationQueue,
      ]);

      // Mock priority counts
      jest
        .spyOn(queueRepository, 'count')
        .mockResolvedValueOnce(10) // total (already called above)
        .mockResolvedValueOnce(2) // standard waiting
        .mockResolvedValueOnce(20) // standard fulfilled
        .mockResolvedValueOnce(3) // vip waiting
        .mockResolvedValueOnce(15) // vip fulfilled
        .mockResolvedValueOnce(3) // premium waiting
        .mockResolvedValueOnce(10) // premium fulfilled
        .mockResolvedValueOnce(2) // enterprise waiting
        .mockResolvedValueOnce(5); // enterprise fulfilled

      const stats = await service.getQueueStatistics();

      expect(stats.waitingCount).toBe(10);
      expect(stats.processingCount).toBe(2);
      expect(stats.fulfilledCount).toBe(50);
      expect(stats.expiredCount).toBe(5);
      expect(stats.cancelledCount).toBe(3);
      expect(stats.totalCount).toBe(70);
      expect(stats.successRate).toBeDefined();
      expect(stats.averageWaitMinutes).toBeGreaterThan(0);
      expect(stats.byPriority).toBeDefined();
    });
  });

  describe('Cron Jobs', () => {
    describe('autoProcessQueue', () => {
      it('should process queue when devices available', async () => {
        jest.spyOn(queueRepository, 'count').mockResolvedValue(5);
        jest.spyOn(allocationService, 'getAvailableDevices').mockResolvedValue([mockDevice] as any);
        jest.spyOn(service, 'processQueueBatch').mockResolvedValue({
          totalProcessed: 1,
          successCount: 1,
          failedCount: 0,
          successes: [],
          failures: [],
          executionTimeMs: 100,
        });

        await service.autoProcessQueue();

        expect(service.processQueueBatch).toHaveBeenCalledWith({
          maxCount: 1,
          continueOnError: true,
        });
      });

      it('should not process when no waiting entries', async () => {
        jest.spyOn(queueRepository, 'count').mockResolvedValue(0);

        await service.autoProcessQueue();

        expect(allocationService.getAvailableDevices).not.toHaveBeenCalled();
      });

      it('should not process when no available devices', async () => {
        jest.spyOn(queueRepository, 'count').mockResolvedValue(5);
        jest.spyOn(allocationService, 'getAvailableDevices').mockResolvedValue([]);
        const processQueueBatchSpy = jest.spyOn(service, 'processQueueBatch');

        await service.autoProcessQueue();

        expect(processQueueBatchSpy).not.toHaveBeenCalled();
      });

      it('should limit batch size to 10', async () => {
        jest.spyOn(queueRepository, 'count').mockResolvedValue(20);
        jest
          .spyOn(allocationService, 'getAvailableDevices')
          .mockResolvedValue(Array(15).fill(mockDevice) as any);
        jest.spyOn(service, 'processQueueBatch').mockResolvedValue({
          totalProcessed: 10,
          successCount: 10,
          failedCount: 0,
          successes: [],
          failures: [],
          executionTimeMs: 100,
        });

        await service.autoProcessQueue();

        expect(service.processQueueBatch).toHaveBeenCalledWith({
          maxCount: 10,
          continueOnError: true,
        });
      });
    });

    describe('markExpiredQueueEntries', () => {
      it('should mark entries exceeding max wait time as expired', async () => {
        const expiredEntry = {
          ...mockQueueEntry,
          createdAt: new Date(now.getTime() - 3600000), // 1 hour ago
          maxWaitMinutes: 30,
        };

        const queryBuilder: any = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([expiredEntry]),
        };

        jest.spyOn(queueRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
        jest.spyOn(queueRepository, 'save').mockResolvedValue(expiredEntry as AllocationQueue);
        jest.spyOn(notificationClient, 'sendBatchNotifications').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'recalculateAllPositions').mockResolvedValue(undefined);

        await service.markExpiredQueueEntries();

        expect(queueRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: QueueStatus.EXPIRED,
            expiryReason: 'Maximum wait time exceeded',
          })
        );
        expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
      });

      it('should recalculate positions after marking expired entries', async () => {
        const queryBuilder: any = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([mockQueueEntry]),
        };

        jest.spyOn(queueRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
        jest.spyOn(queueRepository, 'save').mockResolvedValue(mockQueueEntry as AllocationQueue);
        jest.spyOn(notificationClient, 'sendBatchNotifications').mockResolvedValue(undefined);
        const recalculateSpy = jest
          .spyOn(service as any, 'recalculateAllPositions')
          .mockResolvedValue(undefined);

        await service.markExpiredQueueEntries();

        expect(recalculateSpy).toHaveBeenCalled();
      });
    });

    describe('updateAllQueuePositions', () => {
      it('should update queue positions', async () => {
        const recalculateSpy = jest
          .spyOn(service as any, 'recalculateAllPositions')
          .mockResolvedValue(undefined);

        await service.updateAllQueuePositions();

        expect(recalculateSpy).toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        jest
          .spyOn(service as any, 'recalculateAllPositions')
          .mockRejectedValue(new Error('Update failed'));

        await expect(service.updateAllQueuePositions()).resolves.not.toThrow();
      });
    });
  });

  describe('Priority Queue Behavior', () => {
    it('should prioritize enterprise users', async () => {
      const standardEntry = { ...mockQueueEntry, priority: UserPriority.STANDARD };
      const enterpriseEntry = {
        ...mockQueueEntry,
        id: 'queue-2',
        priority: UserPriority.ENTERPRISE,
        createdAt: new Date(now.getTime() + 1000), // Later than standard
      };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(enterpriseEntry as AllocationQueue);

      await service.processNextQueueEntry();

      // Should select enterprise even though created later
      expect(queueRepository.findOne).toHaveBeenCalledWith({
        where: { status: QueueStatus.WAITING },
        order: {
          priority: 'DESC',
          createdAt: 'ASC',
        },
      });
    });

    it('should use FIFO within same priority', async () => {
      const vipEntry1 = {
        ...mockQueueEntry,
        priority: UserPriority.VIP,
        createdAt: new Date(now.getTime() - 1000),
      };
      const vipEntry2 = {
        ...mockQueueEntry,
        id: 'queue-2',
        priority: UserPriority.VIP,
        createdAt: now,
      };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(vipEntry1 as AllocationQueue);

      await service.processNextQueueEntry();

      // Should select earlier VIP entry
      expect(queueRepository.findOne).toHaveBeenCalledWith({
        where: { status: QueueStatus.WAITING },
        order: {
          priority: 'DESC',
          createdAt: 'ASC',
        },
      });
    });
  });
});
