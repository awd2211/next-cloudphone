import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { LifecycleRulesService } from './lifecycle-rules.service';

@ApiTags('lifecycle-history')
@Controller('devices/lifecycle')
export class LifecycleHistoryController {
  private readonly logger = new Logger(LifecycleHistoryController.name);

  constructor(private readonly lifecycleRulesService: LifecycleRulesService) {}

  /**
   * 获取规则执行历史列表
   * GET /devices/lifecycle/history
   */
  @Get('history')
  @ApiOperation({ summary: '获取生命周期规则执行历史', description: '获取规则执行的历史记录，支持分页和过滤' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'ruleId', required: false, description: '规则ID' })
  @ApiQuery({ name: 'status', required: false, description: '执行状态' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  async getHistory(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      ruleId,
      status,
      startDate,
      endDate,
    };

    this.logger.log(`获取执行历史 - 参数: ${JSON.stringify(params)}`);

    return await this.lifecycleRulesService.getExecutionHistory(params);
  }

  /**
   * 获取单个执行记录详情
   * GET /devices/lifecycle/history/:id
   */
  @Get('history/:id')
  @ApiOperation({ summary: '获取执行记录详情', description: '获取单个规则执行记录的详细信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '执行记录未找到' })
  @ApiParam({ name: 'id', description: '执行记录ID' })
  async getExecutionDetail(@Param('id') id: string) {
    this.logger.log(`获取执行详情 - ID: ${id}`);
    return await this.lifecycleRulesService.getExecutionDetail(id);
  }

  /**
   * 获取生命周期统计信息
   * GET /devices/lifecycle/stats
   */
  @Get('stats')
  @ApiOperation({ summary: '获取生命周期统计', description: '获取生命周期规则和执行的统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getLifecycleStats() {
    this.logger.log('获取生命周期统计信息');
    return await this.lifecycleRulesService.getLifecycleStats();
  }

  /**
   * 获取规则执行趋势
   * GET /devices/lifecycle/execution-trend
   */
  @Get('execution-trend')
  @ApiOperation({ summary: '获取执行趋势', description: '获取生命周期规则执行的趋势数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'type', required: false, description: '规则类型' })
  @ApiQuery({ name: 'days', required: false, description: '统计天数（默认30天）' })
  async getExecutionTrend(
    @Query('type') type?: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;

    this.logger.log(`获取执行趋势 - 类型: ${type || 'all'}, 天数: ${daysNum}`);

    return await this.lifecycleRulesService.getExecutionTrend(type, daysNum);
  }

  /**
   * 获取规则模板列表（兼容旧路径）
   * GET /devices/lifecycle/templates
   */
  @Get('templates')
  @ApiOperation({ summary: '获取规则模板列表', description: '获取预定义的生命周期规则模板' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTemplates() {
    this.logger.log('获取规则模板列表');
    return await this.lifecycleRulesService.getTemplates();
  }
}
