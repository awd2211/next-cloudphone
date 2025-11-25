import { Logger } from '@nestjs/common';
import { IdempotentConsumer } from './idempotent-consumer';
import { BaseEvent } from './schemas/base.event';

// Concrete implementation for testing
class TestConsumer extends IdempotentConsumer {
  public processedEvents: BaseEvent[] = [];
  public shouldThrow = false;

  protected async processEvent(event: BaseEvent): Promise<void> {
    if (this.shouldThrow) {
      throw new Error('Test error');
    }
    this.processedEvents.push(event);
  }
}

describe('IdempotentConsumer', () => {
  let consumer: TestConsumer;
  let mockRedis: any;
  let mockLogger: Logger;

  const createEvent = (eventId: string, eventType: string = 'test.event'): BaseEvent => ({
    eventId,
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'test-service',
    payload: { data: 'test' },
  });

  beforeEach(() => {
    mockRedis = {
      exists: jest.fn(),
      setex: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    consumer = new TestConsumer(mockRedis, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consumer.processedEvents = [];
    consumer.shouldThrow = false;
  });

  describe('handleEvent', () => {
    it('should process new event successfully', async () => {
      const event = createEvent('event-1');
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      await consumer.handleEvent(event);

      expect(consumer.processedEvents).toHaveLength(1);
      expect(consumer.processedEvents[0]).toBe(event);
      expect(mockRedis.setex).toHaveBeenCalled(); // Mark as processed
    });

    it('should skip already processed event', async () => {
      const event = createEvent('event-already-processed');
      mockRedis.exists.mockResolvedValue(1); // Already processed

      await consumer.handleEvent(event);

      expect(consumer.processedEvents).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('already processed'),
      );
    });

    it('should skip event if lock cannot be acquired', async () => {
      const event = createEvent('event-locked');
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.set.mockResolvedValue(null); // Lock not acquired

      await consumer.handleEvent(event);

      expect(consumer.processedEvents).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to acquire lock'),
      );
    });

    it('should process event without eventId with warning', async () => {
      const event = {
        eventType: 'test.event',
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'test-service',
        payload: {},
      } as BaseEvent;

      await consumer.handleEvent(event);

      expect(consumer.processedEvents).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('without eventId'),
      );
    });

    it('should release lock even if processing fails', async () => {
      const event = createEvent('event-will-fail');
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.set.mockResolvedValue('OK');
      consumer.shouldThrow = true;

      await expect(consumer.handleEvent(event)).rejects.toThrow('Test error');

      expect(mockRedis.del).toHaveBeenCalled(); // Lock released
    });

    it('should double-check after acquiring lock', async () => {
      const event = createEvent('event-race-condition');
      // First check: not processed
      // Second check (after lock): already processed
      mockRedis.exists
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      await consumer.handleEvent(event);

      expect(consumer.processedEvents).toHaveLength(0);
      expect(mockRedis.exists).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleEvents', () => {
    it('should process multiple events', async () => {
      const events = [
        createEvent('batch-1'),
        createEvent('batch-2'),
        createEvent('batch-3'),
      ];
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      await consumer.handleEvents(events);

      expect(consumer.processedEvents).toHaveLength(3);
    });

    it('should continue processing even if one event fails', async () => {
      const events = [
        createEvent('batch-ok-1'),
        createEvent('batch-fail'),
        createEvent('batch-ok-2'),
      ];
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      // Fail on second event
      let callCount = 0;
      consumer['processEvent'] = async (event: BaseEvent) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Processing failed');
        }
        consumer.processedEvents.push(event);
      };

      await consumer.handleEvents(events);

      expect(consumer.processedEvents).toHaveLength(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process event in batch'),
      );
    });
  });

  describe('skipEvent', () => {
    it('should mark event as skipped', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await consumer.skipEvent('event-to-skip', 'Manual skip for testing');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('event-to-skip'),
        expect.any(Number),
        expect.stringContaining('skipped'),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('marked as skipped'),
      );
    });
  });

  describe('getEventStatus', () => {
    it('should return processed status when event was processed', async () => {
      const details = { processedAt: '2024-01-01T00:00:00Z', instanceId: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(details));

      const status = await consumer.getEventStatus('processed-event');

      expect(status.processed).toBe(true);
      expect(status.details).toEqual(details);
    });

    it('should return not processed when event was not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const status = await consumer.getEventStatus('unknown-event');

      expect(status.processed).toBe(false);
      expect(status.details).toBeUndefined();
    });
  });
});
