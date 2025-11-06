import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulingStrategy } from './entities/scheduling-strategy.entity';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/strategy.dto';

/**
 * 调度策略服务
 * 负责调度策略的 CRUD 操作和激活管理
 */
@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(
    @InjectRepository(SchedulingStrategy)
    private readonly strategyRepository: Repository<SchedulingStrategy>,
  ) {}

  /**
   * 获取所有调度策略
   */
  async getAll(): Promise<SchedulingStrategy[]> {
    return this.strategyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取当前激活的策略
   */
  async getActive(): Promise<SchedulingStrategy> {
    const active = await this.strategyRepository.findOne({
      where: { isActive: true },
    });

    if (!active) {
      throw new NotFoundException('No active scheduling strategy found');
    }

    return active;
  }

  /**
   * 根据ID获取策略
   */
  async getById(id: string): Promise<SchedulingStrategy> {
    const strategy = await this.strategyRepository.findOne({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    return strategy;
  }

  /**
   * 创建新策略
   */
  async create(dto: CreateStrategyDto): Promise<SchedulingStrategy> {
    this.logger.log(`Creating new strategy: ${dto.name}`);

    const strategy = this.strategyRepository.create({
      ...dto,
      config: dto.config || {},
    });

    return this.strategyRepository.save(strategy);
  }

  /**
   * 更新策略
   */
  async update(id: string, dto: UpdateStrategyDto): Promise<SchedulingStrategy> {
    const strategy = await this.getById(id);

    this.logger.log(`Updating strategy: ${id}`);

    // 如果要激活此策略，需要先停用其他策略
    if (dto.isActive === true && !strategy.isActive) {
      await this.deactivateAll();
    }

    Object.assign(strategy, dto);
    return this.strategyRepository.save(strategy);
  }

  /**
   * 删除策略
   */
  async delete(id: string): Promise<void> {
    const strategy = await this.getById(id);

    if (strategy.isActive) {
      throw new BadRequestException('Cannot delete active strategy. Please activate another strategy first.');
    }

    this.logger.log(`Deleting strategy: ${id}`);
    await this.strategyRepository.delete(id);
  }

  /**
   * 激活指定策略
   */
  async activate(id: string): Promise<void> {
    const strategy = await this.getById(id);

    if (strategy.isActive) {
      this.logger.log(`Strategy ${id} is already active`);
      return;
    }

    this.logger.log(`Activating strategy: ${id}`);

    // 停用所有其他策略
    await this.deactivateAll();

    // 激活当前策略
    strategy.isActive = true;
    await this.strategyRepository.save(strategy);

    this.logger.log(`Strategy ${strategy.name} is now active`);
  }

  /**
   * 停用所有策略
   */
  private async deactivateAll(): Promise<void> {
    await this.strategyRepository.update(
      { isActive: true },
      { isActive: false },
    );
  }

  /**
   * 初始化默认策略
   * 如果数据库为空，创建默认策略
   */
  async initializeDefaultStrategies(): Promise<void> {
    const count = await this.strategyRepository.count();

    if (count > 0) {
      return;
    }

    this.logger.log('Initializing default scheduling strategies');

    const defaultStrategies = [
      {
        name: 'Round Robin',
        type: 'round-robin',
        description: '轮询调度策略，按顺序分配设备到各个节点',
        config: {},
        isActive: true,
      },
      {
        name: 'Least Loaded',
        type: 'least-loaded',
        description: '最少负载策略，优先分配到负载最低的节点',
        config: {
          weightCpu: 0.4,
          weightMemory: 0.3,
          weightStorage: 0.3,
        },
        isActive: false,
      },
      {
        name: 'Priority Based',
        type: 'priority',
        description: '基于优先级的调度策略，高优先级用户优先分配',
        config: {
          vipPriority: 10,
          normalPriority: 5,
          freePriority: 1,
        },
        isActive: false,
      },
    ];

    for (const strategyData of defaultStrategies) {
      const strategy = this.strategyRepository.create(strategyData as any);
      await this.strategyRepository.save(strategy);
    }

    this.logger.log('Default strategies initialized');
  }
}
