import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StrategyService } from './strategy.service';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/strategy.dto';
import { SchedulingStrategy } from './entities/scheduling-strategy.entity';

/**
 * 调度策略管理控制器
 * 提供调度策略的 CRUD 和激活管理接口
 */
@Controller('scheduler/strategies')
@UseGuards(JwtAuthGuard)
export class StrategyController {
  private readonly logger = new Logger(StrategyController.name);

  constructor(private readonly strategyService: StrategyService) {}

  /**
   * 获取所有调度策略
   * GET /scheduler/strategies
   */
  @Get()
  async getStrategies(): Promise<SchedulingStrategy[]> {
    this.logger.log('Fetching all scheduling strategies');
    return this.strategyService.getAll();
  }

  /**
   * 获取当前激活的策略
   * GET /scheduler/strategies/active
   */
  @Get('active')
  async getActiveStrategy(): Promise<SchedulingStrategy> {
    this.logger.log('Fetching active scheduling strategy');
    return this.strategyService.getActive();
  }

  /**
   * 获取指定策略详情
   * GET /scheduler/strategies/:id
   */
  @Get(':id')
  async getStrategy(@Param('id') id: string): Promise<SchedulingStrategy> {
    this.logger.log(`Fetching strategy: ${id}`);
    return this.strategyService.getById(id);
  }

  /**
   * 创建新策略
   * POST /scheduler/strategies
   */
  @Post()
  async createStrategy(@Body() dto: CreateStrategyDto): Promise<SchedulingStrategy> {
    this.logger.log(`Creating new strategy: ${dto.name}`);
    return this.strategyService.create(dto);
  }

  /**
   * 更新策略
   * PUT /scheduler/strategies/:id
   */
  @Put(':id')
  async updateStrategy(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
  ): Promise<SchedulingStrategy> {
    this.logger.log(`Updating strategy: ${id}`);
    return this.strategyService.update(id, dto);
  }

  /**
   * 删除策略
   * DELETE /scheduler/strategies/:id
   */
  @Delete(':id')
  async deleteStrategy(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting strategy: ${id}`);
    await this.strategyService.delete(id);
    return { message: 'Strategy deleted successfully' };
  }

  /**
   * 激活指定策略
   * POST /scheduler/strategies/:id/activate
   */
  @Post(':id/activate')
  async activateStrategy(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Activating strategy: ${id}`);
    await this.strategyService.activate(id);
    return { message: 'Strategy activated successfully' };
  }
}
