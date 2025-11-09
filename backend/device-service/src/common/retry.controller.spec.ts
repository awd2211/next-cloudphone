import { Test, TestingModule } from '@nestjs/testing';
import { RetryController } from './retry.controller';
import { RetryService } from './retry.service';

describe('RetryController', () => {
  let controller: RetryController;
  let retryService: any;

  const mockRetryService = {
    getStatisticsSummary: jest.fn(),
    getStatistics: jest.fn(),
    resetStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetryController],
      providers: [
        {
          provide: RetryService,
          useValue: mockRetryService,
        },
      ],
    }).compile();

    controller = module.get<RetryController>(RetryController);
    retryService = module.get(RetryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatisticsSummary', () => {
    it('should return retry statistics summary', async () => {
      const mockSummary = {
        totalOperations: 10,
        totalRetries: 45,
        totalSuccesses: 38,
        totalFailures: 7,
        averageRetries: 4.5,
      };

      mockRetryService.getStatisticsSummary.mockReturnValue(mockSummary);

      const result = await controller.getStatisticsSummary();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSummary);
      expect(retryService.getStatisticsSummary).toHaveBeenCalled();
    });

    it('should handle empty summary', async () => {
      const mockSummary = {
        totalOperations: 0,
        totalRetries: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        averageRetries: 0,
      };

      mockRetryService.getStatisticsSummary.mockReturnValue(mockSummary);

      const result = await controller.getStatisticsSummary();

      expect(result.success).toBe(true);
      expect(result.data.totalOperations).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for a specific operation', async () => {
      const operation = 'startContainer';
      const mockStats = {
        totalAttempts: 100,
        successfulAttempts: 95,
        failedAttempts: 5,
        totalRetries: 15,
        averageRetries: 0.15,
      };

      mockRetryService.getStatistics.mockReturnValue(mockStats);

      const result = await controller.getStatistics(operation);

      expect(result.success).toBe(true);
      expect(result.data.operation).toBe(operation);
      expect(result.data.statistics).toEqual(mockStats);
      expect(retryService.getStatistics).toHaveBeenCalledWith(operation);
    });

    it('should return all operations statistics when operation is not provided', async () => {
      const mockStatsMap = new Map([
        [
          'startContainer',
          {
            totalAttempts: 100,
            successfulAttempts: 95,
            failedAttempts: 5,
            totalRetries: 15,
          },
        ],
        [
          'stopContainer',
          {
            totalAttempts: 50,
            successfulAttempts: 48,
            failedAttempts: 2,
            totalRetries: 5,
          },
        ],
      ]);

      mockRetryService.getStatistics.mockReturnValue(mockStatsMap);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data.operations).toBe(2);
      expect(result.data.statistics).toHaveProperty('startContainer');
      expect(result.data.statistics).toHaveProperty('stopContainer');
      expect(retryService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should handle empty statistics map', async () => {
      const mockStatsMap = new Map();

      mockRetryService.getStatistics.mockReturnValue(mockStatsMap);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data.operations).toBe(0);
      expect(Object.keys(result.data.statistics).length).toBe(0);
    });

    it('should convert Map to object correctly for multiple operations', async () => {
      const mockStatsMap = new Map([
        ['operation1', { count: 10 }],
        ['operation2', { count: 20 }],
        ['operation3', { count: 30 }],
      ]);

      mockRetryService.getStatistics.mockReturnValue(mockStatsMap);

      const result = await controller.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data.operations).toBe(3);
      expect(result.data.statistics.operation1).toEqual({ count: 10 });
      expect(result.data.statistics.operation2).toEqual({ count: 20 });
      expect(result.data.statistics.operation3).toEqual({ count: 30 });
    });
  });

  describe('resetStatistics', () => {
    it('should reset statistics for a specific operation', async () => {
      const operation = 'startContainer';

      const result = await controller.resetStatistics(operation);

      expect(result.success).toBe(true);
      expect(result.message).toBe(`已重置操作 "${operation}" 的重试统计`);
      expect(retryService.resetStatistics).toHaveBeenCalledWith(operation);
    });

    it('should reset all operations statistics when operation is not provided', async () => {
      const result = await controller.resetStatistics();

      expect(result.success).toBe(true);
      expect(result.message).toBe('已重置所有操作的重试统计');
      expect(retryService.resetStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should handle reset with empty string operation', async () => {
      const result = await controller.resetStatistics('');

      expect(result.success).toBe(true);
      expect(result.message).toBe('已重置所有操作的重试统计');
      expect(retryService.resetStatistics).toHaveBeenCalledWith('');
    });

    it('should handle reset for different operation names', async () => {
      const operations = ['createDevice', 'deleteDevice', 'updateDevice'];

      for (const operation of operations) {
        await controller.resetStatistics(operation);

        expect(retryService.resetStatistics).toHaveBeenCalledWith(operation);
      }

      expect(retryService.resetStatistics).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Format', () => {
    it('should return success flag in all responses', async () => {
      mockRetryService.getStatisticsSummary.mockReturnValue({});
      mockRetryService.getStatistics.mockReturnValue(new Map());

      const summaryResult = await controller.getStatisticsSummary();
      const statsResult = await controller.getStatistics();
      const resetResult = await controller.resetStatistics();

      expect(summaryResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
      expect(resetResult.success).toBe(true);
    });

    it('should return data property for query endpoints', async () => {
      mockRetryService.getStatisticsSummary.mockReturnValue({
        totalOperations: 5,
      });
      mockRetryService.getStatistics.mockReturnValue({ count: 10 });

      const summaryResult = await controller.getStatisticsSummary();
      const statsResult = await controller.getStatistics('test');

      expect(summaryResult.data).toBeDefined();
      expect(statsResult.data).toBeDefined();
    });

    it('should return message property for action endpoints', async () => {
      const resetResult = await controller.resetStatistics();

      expect(resetResult.message).toBeDefined();
      expect(typeof resetResult.message).toBe('string');
    });
  });
});
