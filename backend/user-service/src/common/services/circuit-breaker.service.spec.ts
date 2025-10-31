import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';

// Mock opossum
jest.mock('opossum');
import CircuitBreaker from 'opossum';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let mockBreaker: any;

  beforeEach(async () => {
    // Create mock breaker
    mockBreaker = {
      fire: jest.fn(),
      open: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      opened: false,
      halfOpen: false,
      stats: {
        fires: 0,
        successes: 0,
        failures: 0,
        rejects: 0,
        timeouts: 0,
      },
      fallback: jest.fn(),
    };

    // Mock CircuitBreaker constructor
    (CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mockImplementation(
      () => mockBreaker
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBreaker', () => {
    it('应该创建新的熔断器', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      const options = {
        timeout: 5000,
        errorThresholdPercentage: 50,
      };

      // Act
      const breaker = service.createBreaker(name, action, options);

      // Assert
      expect(CircuitBreaker).toHaveBeenCalledWith(
        action,
        expect.objectContaining({
          timeout: 5000,
          errorThresholdPercentage: 50,
        })
      );
      expect(breaker).toBe(mockBreaker);
    });

    it('应该使用默认配置', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();

      // Act
      service.createBreaker(name, action);

      // Assert
      expect(CircuitBreaker).toHaveBeenCalledWith(
        action,
        expect.objectContaining({
          timeout: 10000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          volumeThreshold: 10,
        })
      );
    });

    it('应该设置降级函数', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      const fallback = jest.fn();

      // Act
      service.createBreaker(name, action, { fallback });

      // Assert
      expect(mockBreaker.fallback).toHaveBeenCalledWith(fallback);
    });

    it('应该返回已存在的熔断器', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();

      // Act
      const breaker1 = service.createBreaker(name, action);
      const breaker2 = service.createBreaker(name, action);

      // Assert
      expect(breaker1).toBe(breaker2);
      expect(CircuitBreaker).toHaveBeenCalledTimes(1); // 只创建一次
    });

    it('应该设置事件监听器', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();

      // Act
      service.createBreaker(name, action);

      // Assert
      expect(mockBreaker.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('halfOpen', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('success', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('failure', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('timeout', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('reject', expect.any(Function));
      expect(mockBreaker.on).toHaveBeenCalledWith('fallback', expect.any(Function));
    });
  });

  describe('getBreaker', () => {
    it('应该获取已存在的熔断器', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      service.createBreaker(name, action);

      // Act
      const breaker = service.getBreaker(name);

      // Assert
      expect(breaker).toBe(mockBreaker);
    });

    it('应该对不存在的熔断器返回undefined', () => {
      // Act
      const breaker = service.getBreaker('nonexistent');

      // Assert
      expect(breaker).toBeUndefined();
    });
  });

  describe('fire', () => {
    it('应该执行熔断器保护的操作', async () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn().mockResolvedValue('success');
      const result = 'test-result';
      mockBreaker.fire.mockResolvedValue(result);

      service.createBreaker(name, action);

      // Act
      const response = await service.fire(name, 'arg1', 'arg2');

      // Assert
      expect(mockBreaker.fire).toHaveBeenCalledWith('arg1', 'arg2');
      expect(response).toBe(result);
    });

    it('应该在熔断器不存在时抛出错误', async () => {
      // Act & Assert
      await expect(service.fire('nonexistent')).rejects.toThrow('熔断器 nonexistent 不存在');
    });
  });

  describe('getBreakerStatus', () => {
    it('应该获取熔断器状态（CLOSED）', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      mockBreaker.opened = false;
      mockBreaker.halfOpen = false;
      mockBreaker.stats = {
        fires: 10,
        successes: 8,
        failures: 2,
      };

      service.createBreaker(name, action);

      // Act
      const status = service.getBreakerStatus(name);

      // Assert
      expect(status).toMatchObject({
        name: 'test-breaker',
        state: 'CLOSED',
        stats: expect.objectContaining({
          fires: 10,
          successes: 8,
          failures: 2,
        }),
      });
    });

    it('应该获取熔断器状态（OPEN）', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      mockBreaker.opened = true;
      mockBreaker.halfOpen = false;

      service.createBreaker(name, action);

      // Act
      const status = service.getBreakerStatus(name);

      // Assert
      expect(status?.state).toBe('OPEN');
    });

    it('应该获取熔断器状态（HALF_OPEN）', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      mockBreaker.opened = false;
      mockBreaker.halfOpen = true;

      service.createBreaker(name, action);

      // Act
      const status = service.getBreakerStatus(name);

      // Assert
      expect(status?.state).toBe('HALF_OPEN');
    });

    it('应该对不存在的熔断器返回null', () => {
      // Act
      const status = service.getBreakerStatus('nonexistent');

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('getAllBreakerStatus', () => {
    it('应该获取所有熔断器状态', () => {
      // Arrange
      const action = jest.fn();
      mockBreaker.opened = false;
      mockBreaker.halfOpen = false;

      service.createBreaker('breaker-1', action);
      service.createBreaker('breaker-2', action);

      // Act
      const statuses = service.getAllBreakerStatus();

      // Assert
      expect(statuses).toHaveLength(2);
      expect(statuses[0].name).toBe('breaker-1');
      expect(statuses[1].name).toBe('breaker-2');
      expect(statuses[0].state).toBe('CLOSED');
      expect(statuses[1].state).toBe('CLOSED');
    });

    it('应该返回空数组（无熔断器）', () => {
      // Act
      const statuses = service.getAllBreakerStatus();

      // Assert
      expect(statuses).toEqual([]);
    });
  });

  describe('openBreaker', () => {
    it('应该手动打开熔断器', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      service.createBreaker(name, action);

      // Act
      service.openBreaker(name);

      // Assert
      expect(mockBreaker.open).toHaveBeenCalled();
    });

    it('应该对不存在的熔断器不执行操作', () => {
      // Act
      service.openBreaker('nonexistent');

      // Assert
      expect(mockBreaker.open).not.toHaveBeenCalled();
    });
  });

  describe('closeBreaker', () => {
    it('应该手动关闭熔断器', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      service.createBreaker(name, action);

      // Act
      service.closeBreaker(name);

      // Assert
      expect(mockBreaker.close).toHaveBeenCalled();
    });

    it('应该对不存在的熔断器不执行操作', () => {
      // Act
      service.closeBreaker('nonexistent');

      // Assert
      expect(mockBreaker.close).not.toHaveBeenCalled();
    });
  });

  describe('clearStats', () => {
    it('应该清除熔断器统计（删除熔断器）', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      service.createBreaker(name, action);

      // Act
      service.clearStats(name);

      // Assert
      expect(service.getBreaker(name)).toBeUndefined();
    });

    it('应该对不存在的熔断器不执行操作', () => {
      // Act & Assert - 不应该抛出错误
      expect(() => service.clearStats('nonexistent')).not.toThrow();
    });
  });

  describe('事件监听', () => {
    it('应该正确处理所有熔断器事件', () => {
      // Arrange
      const name = 'test-breaker';
      const action = jest.fn();
      let eventHandlers: Record<string, Function> = {};

      // Capture event handlers
      mockBreaker.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockBreaker;
      });

      // Act
      service.createBreaker(name, action);

      // Assert - 验证事件处理器存在
      expect(eventHandlers['open']).toBeDefined();
      expect(eventHandlers['halfOpen']).toBeDefined();
      expect(eventHandlers['close']).toBeDefined();
      expect(eventHandlers['success']).toBeDefined();
      expect(eventHandlers['failure']).toBeDefined();
      expect(eventHandlers['timeout']).toBeDefined();
      expect(eventHandlers['reject']).toBeDefined();
      expect(eventHandlers['fallback']).toBeDefined();

      // Act - 触发事件（不应该抛出错误）
      expect(() => eventHandlers['open']()).not.toThrow();
      expect(() => eventHandlers['halfOpen']()).not.toThrow();
      expect(() => eventHandlers['close']()).not.toThrow();
      expect(() => eventHandlers['success']({}, 100)).not.toThrow();
      expect(() => eventHandlers['failure'](new Error('test'))).not.toThrow();
      expect(() => eventHandlers['timeout']()).not.toThrow();
      expect(() => eventHandlers['reject']()).not.toThrow();
      expect(() => eventHandlers['fallback']('fallback-result')).not.toThrow();
    });
  });

  describe('集成场景', () => {
    it('应该支持完整的熔断流程', async () => {
      // Arrange
      const name = 'integration-test';
      let callCount = 0;
      const action = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 5) {
          throw new Error('Service failed');
        }
        return 'success';
      });

      const fallback = jest.fn().mockReturnValue('fallback-response');

      // Act - 创建熔断器
      const breaker = service.createBreaker(name, action, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        fallback,
      });

      // Assert - 熔断器已创建
      expect(service.getBreaker(name)).toBe(breaker);
      expect(mockBreaker.fallback).toHaveBeenCalledWith(fallback);
    });

    it('应该支持多个熔断器独立运行', () => {
      // Arrange
      const action1 = jest.fn();
      const action2 = jest.fn();

      // Act
      service.createBreaker('breaker-1', action1);
      service.createBreaker('breaker-2', action2);

      // Assert
      expect(service.getBreaker('breaker-1')).toBeDefined();
      expect(service.getBreaker('breaker-2')).toBeDefined();

      const statuses = service.getAllBreakerStatus();
      expect(statuses).toHaveLength(2);
      expect(statuses.find((s) => s.name === 'breaker-1')).toBeDefined();
      expect(statuses.find((s) => s.name === 'breaker-2')).toBeDefined();
    });
  });
});
