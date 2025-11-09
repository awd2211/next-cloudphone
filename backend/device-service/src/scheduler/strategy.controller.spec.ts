import { Test, TestingModule } from '@nestjs/testing';
import { StrategyController } from './strategy.controller';
import { StrategyService } from './strategy.service';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/strategy.dto';
import { SchedulingStrategy } from './entities/scheduling-strategy.entity';

describe('StrategyController', () => {
  let controller: StrategyController;
  let strategyService: any;

  const mockStrategyService = {
    getAll: jest.fn(),
    getActive: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    activate: jest.fn(),
  };

  const mockStrategy: Partial<SchedulingStrategy> = {
    id: 'strategy-123',
    name: 'Load Balancing Strategy',
    type: 'load_balancing',
    description: 'Distributes devices based on resource load',
    config: {
      algorithm: 'round_robin',
      threshold: 0.8,
    },
    isActive: true,
    priority: 10,
    createdAt: new Date('2025-01-06T00:00:00.000Z'),
    updatedAt: new Date('2025-01-06T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrategyController],
      providers: [
        {
          provide: StrategyService,
          useValue: mockStrategyService,
        },
      ],
    }).compile();

    controller = module.get<StrategyController>(StrategyController);
    strategyService = module.get(StrategyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStrategies', () => {
    it('should return all scheduling strategies', async () => {
      const mockStrategies = [
        { ...mockStrategy, id: 'strategy-1', name: 'Strategy 1' },
        { ...mockStrategy, id: 'strategy-2', name: 'Strategy 2', isActive: false },
        { ...mockStrategy, id: 'strategy-3', name: 'Strategy 3', isActive: false },
      ];

      mockStrategyService.getAll.mockResolvedValue(mockStrategies);

      const result = await controller.getStrategies();

      expect(result).toEqual(mockStrategies);
      expect(result).toHaveLength(3);
      expect(strategyService.getAll).toHaveBeenCalled();
    });

    it('should return empty array when no strategies exist', async () => {
      mockStrategyService.getAll.mockResolvedValue([]);

      const result = await controller.getStrategies();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return strategies with different types', async () => {
      const mockStrategies = [
        { ...mockStrategy, id: 'strategy-1', type: 'load_balancing' },
        { ...mockStrategy, id: 'strategy-2', type: 'cost_optimized' },
        { ...mockStrategy, id: 'strategy-3', type: 'high_availability' },
      ];

      mockStrategyService.getAll.mockResolvedValue(mockStrategies);

      const result = await controller.getStrategies();

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('load_balancing');
      expect(result[1].type).toBe('cost_optimized');
      expect(result[2].type).toBe('high_availability');
    });
  });

  describe('getActiveStrategy', () => {
    it('should return the active scheduling strategy', async () => {
      mockStrategyService.getActive.mockResolvedValue(mockStrategy);

      const result = await controller.getActiveStrategy();

      expect(result).toEqual(mockStrategy);
      expect(result.isActive).toBe(true);
      expect(strategyService.getActive).toHaveBeenCalled();
    });

    it('should handle when no active strategy exists', async () => {
      mockStrategyService.getActive.mockResolvedValue(null);

      const result = await controller.getActiveStrategy();

      expect(result).toBeNull();
    });
  });

  describe('getStrategy', () => {
    it('should return a strategy by ID', async () => {
      const strategyId = 'strategy-123';

      mockStrategyService.getById.mockResolvedValue(mockStrategy);

      const result = await controller.getStrategy(strategyId);

      expect(result).toEqual(mockStrategy);
      expect(strategyService.getById).toHaveBeenCalledWith(strategyId);
    });

    it('should fetch different strategies by different IDs', async () => {
      const strategy1 = { ...mockStrategy, id: 'strategy-1', name: 'Strategy 1' };
      const strategy2 = { ...mockStrategy, id: 'strategy-2', name: 'Strategy 2' };

      mockStrategyService.getById
        .mockResolvedValueOnce(strategy1)
        .mockResolvedValueOnce(strategy2);

      const result1 = await controller.getStrategy('strategy-1');
      const result2 = await controller.getStrategy('strategy-2');

      expect(result1.id).toBe('strategy-1');
      expect(result2.id).toBe('strategy-2');
      expect(strategyService.getById).toHaveBeenCalledTimes(2);
    });
  });

  describe('createStrategy', () => {
    it('should create a new scheduling strategy', async () => {
      const createDto: CreateStrategyDto = {
        name: 'New Strategy',
        type: 'load_balancing',
        description: 'A new load balancing strategy',
        config: {
          algorithm: 'least_connections',
          threshold: 0.75,
        },
        priority: 5,
      };

      const createdStrategy = {
        ...mockStrategy,
        ...createDto,
        id: 'strategy-new-123',
      };

      mockStrategyService.create.mockResolvedValue(createdStrategy);

      const result = await controller.createStrategy(createDto);

      expect(result).toEqual(createdStrategy);
      expect(result.name).toBe('New Strategy');
      expect(strategyService.create).toHaveBeenCalledWith(createDto);
    });

    it('should create strategy with minimal required fields', async () => {
      const createDto: CreateStrategyDto = {
        name: 'Minimal Strategy',
        type: 'basic',
      };

      const createdStrategy = {
        ...mockStrategy,
        ...createDto,
        id: 'strategy-minimal',
      };

      mockStrategyService.create.mockResolvedValue(createdStrategy);

      const result = await controller.createStrategy(createDto);

      expect(result.name).toBe('Minimal Strategy');
      expect(result.type).toBe('basic');
    });
  });

  describe('updateStrategy', () => {
    it('should update an existing strategy', async () => {
      const strategyId = 'strategy-123';
      const updateDto: UpdateStrategyDto = {
        name: 'Updated Strategy',
        description: 'Updated description',
        config: {
          algorithm: 'weighted_round_robin',
        },
      };

      const updatedStrategy = {
        ...mockStrategy,
        ...updateDto,
      };

      mockStrategyService.update.mockResolvedValue(updatedStrategy);

      const result = await controller.updateStrategy(strategyId, updateDto);

      expect(result).toEqual(updatedStrategy);
      expect(result.name).toBe('Updated Strategy');
      expect(strategyService.update).toHaveBeenCalledWith(strategyId, updateDto);
    });

    it('should update only specific fields', async () => {
      const strategyId = 'strategy-123';
      const updateDto: UpdateStrategyDto = {
        priority: 15,
      };

      const updatedStrategy = {
        ...mockStrategy,
        priority: 15,
      };

      mockStrategyService.update.mockResolvedValue(updatedStrategy);

      const result = await controller.updateStrategy(strategyId, updateDto);

      expect(result.priority).toBe(15);
      expect(strategyService.update).toHaveBeenCalledWith(strategyId, updateDto);
    });
  });

  describe('deleteStrategy', () => {
    it('should delete a strategy', async () => {
      const strategyId = 'strategy-123';

      mockStrategyService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteStrategy(strategyId);

      expect(result.message).toBe('Strategy deleted successfully');
      expect(strategyService.delete).toHaveBeenCalledWith(strategyId);
    });

    it('should delete multiple strategies sequentially', async () => {
      const strategyIds = ['strategy-1', 'strategy-2', 'strategy-3'];

      for (const id of strategyIds) {
        await controller.deleteStrategy(id);
        expect(strategyService.delete).toHaveBeenCalledWith(id);
      }

      expect(strategyService.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('activateStrategy', () => {
    it('should activate a strategy', async () => {
      const strategyId = 'strategy-123';

      mockStrategyService.activate.mockResolvedValue(undefined);

      const result = await controller.activateStrategy(strategyId);

      expect(result.message).toBe('Strategy activated successfully');
      expect(strategyService.activate).toHaveBeenCalledWith(strategyId);
    });

    it('should switch active strategy from one to another', async () => {
      const oldStrategyId = 'strategy-old';
      const newStrategyId = 'strategy-new';

      await controller.activateStrategy(oldStrategyId);
      await controller.activateStrategy(newStrategyId);

      expect(strategyService.activate).toHaveBeenCalledWith(oldStrategyId);
      expect(strategyService.activate).toHaveBeenCalledWith(newStrategyId);
      expect(strategyService.activate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Format', () => {
    it('should return proper response for query endpoints', async () => {
      mockStrategyService.getAll.mockResolvedValue([mockStrategy]);
      mockStrategyService.getActive.mockResolvedValue(mockStrategy);
      mockStrategyService.getById.mockResolvedValue(mockStrategy);

      const allResult = await controller.getStrategies();
      const activeResult = await controller.getActiveStrategy();
      const byIdResult = await controller.getStrategy('strategy-123');

      expect(Array.isArray(allResult)).toBe(true);
      expect(activeResult).toBeDefined();
      expect(byIdResult).toBeDefined();
    });

    it('should return proper response for mutation endpoints', async () => {
      mockStrategyService.create.mockResolvedValue(mockStrategy);
      mockStrategyService.update.mockResolvedValue(mockStrategy);
      mockStrategyService.delete.mockResolvedValue(undefined);
      mockStrategyService.activate.mockResolvedValue(undefined);

      const createResult = await controller.createStrategy({ name: 'Test', type: 'test' });
      const updateResult = await controller.updateStrategy('id', { name: 'Test' });
      const deleteResult = await controller.deleteStrategy('id');
      const activateResult = await controller.activateStrategy('id');

      expect(createResult).toBeDefined();
      expect(updateResult).toBeDefined();
      expect(deleteResult.message).toBeDefined();
      expect(activateResult.message).toBeDefined();
    });

    it('should return success messages for action endpoints', async () => {
      mockStrategyService.delete.mockResolvedValue(undefined);
      mockStrategyService.activate.mockResolvedValue(undefined);

      const deleteResult = await controller.deleteStrategy('strategy-123');
      const activateResult = await controller.activateStrategy('strategy-123');

      expect(deleteResult.message).toContain('deleted successfully');
      expect(activateResult.message).toContain('activated successfully');
    });
  });
});
