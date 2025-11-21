import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LifecycleRulesService } from './lifecycle-rules.service';
import { CreateLifecycleRuleDto } from './dto/create-lifecycle-rule.dto';
import { UpdateLifecycleRuleDto } from './dto/update-lifecycle-rule.dto';

@ApiTags('lifecycle-rules')
@Controller('devices/lifecycle/rules')
export class LifecycleRulesController {
  private readonly logger = new Logger(LifecycleRulesController.name);

  constructor(private readonly lifecycleRulesService: LifecycleRulesService) {}

  /**
   * 获取规则统计 (必须放在 :id 路由之前)
   */
  @Get('stats')
  @ApiOperation({ summary: '获取生命周期规则统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStats() {
    return await this.lifecycleRulesService.getStats();
  }

  /**
   * 获取规则列表
   */
  @Get()
  @ApiOperation({ summary: '获取生命周期规则列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'type', required: false, description: '规则类型' })
  @ApiQuery({ name: 'enabled', required: false, description: '是否启用' })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('enabled') enabled?: string,
  ) {
    const params = {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      type,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    };

    return await this.lifecycleRulesService.findAll(params);
  }

  /**
   * 获取规则详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取生命周期规则详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async findOne(@Param('id') id: string) {
    return await this.lifecycleRulesService.findOne(id);
  }

  /**
   * 创建规则
   */
  @Post()
  @ApiOperation({ summary: '创建生命周期规则' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async create(@Body() createDto: CreateLifecycleRuleDto) {
    this.logger.log(`创建生命周期规则 - 名称: ${createDto.name}, 类型: ${createDto.type}`);
    return await this.lifecycleRulesService.create(createDto);
  }

  /**
   * 更新规则
   */
  @Put(':id')
  @ApiOperation({ summary: '更新生命周期规则' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateLifecycleRuleDto) {
    this.logger.log(`更新生命周期规则 - ID: ${id}`);
    return await this.lifecycleRulesService.update(id, updateDto);
  }

  /**
   * 删除规则
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除生命周期规则' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async remove(@Param('id') id: string) {
    this.logger.log(`删除生命周期规则 - ID: ${id}`);
    await this.lifecycleRulesService.remove(id);
    return { message: '删除成功' };
  }

  /**
   * 启用/禁用规则
   */
  @Patch(':id/toggle')
  @HttpCode(200)
  @ApiOperation({ summary: '启用/禁用生命周期规则' })
  @ApiResponse({ status: 200, description: '状态切换成功' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async toggle(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    this.logger.log(`切换生命周期规则状态 - ID: ${id}, 启用: ${body.enabled}`);
    return await this.lifecycleRulesService.toggle(id, body.enabled);
  }

  /**
   * 批量删除规则
   */
  @Post('batch-delete')
  @HttpCode(200)
  @ApiOperation({ summary: '批量删除生命周期规则' })
  @ApiResponse({ status: 200, description: '批量删除完成' })
  async batchDelete(@Body() body: { ids: string[] }) {
    this.logger.log(`批量删除生命周期规则 - 数量: ${body.ids.length}`);
    const results = await this.lifecycleRulesService.batchDelete(body.ids);
    return {
      ...results,
      message: `批量删除完成：成功 ${results.success} 个，失败 ${results.failed} 个`,
    };
  }

  /**
   * 手动执行规则
   */
  @Post(':id/execute')
  @HttpCode(200)
  @ApiOperation({ summary: '手动执行生命周期规则' })
  @ApiResponse({ status: 200, description: '执行成功' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  @ApiResponse({ status: 400, description: '无法执行已禁用的规则' })
  async execute(@Param('id') id: string) {
    this.logger.log(`手动执行生命周期规则 - ID: ${id}`);
    return await this.lifecycleRulesService.execute(id);
  }

  /**
   * 获取执行历史
   */
  @Get(':id/executions')
  @ApiOperation({ summary: '获取规则执行历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async getExecutions(@Param('id') id: string) {
    await this.lifecycleRulesService.findOne(id); // 验证规则存在
    return await this.lifecycleRulesService.getExecutions(id);
  }

  /**
   * 验证规则
   */
  @Get(':id/validate')
  @ApiOperation({ summary: '验证生命周期规则配置' })
  @ApiResponse({ status: 200, description: '验证完成' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async validate(@Param('id') id: string) {
    return await this.lifecycleRulesService.validate(id);
  }

  /**
   * 导入规则
   */
  @Post('import')
  @HttpCode(200)
  @ApiOperation({ summary: '批量导入生命周期规则' })
  @ApiResponse({ status: 200, description: '导入完成' })
  async importRules(@Body() body: { rules: CreateLifecycleRuleDto[] }) {
    this.logger.log(`批量导入生命周期规则 - 数量: ${body.rules.length}`);
    const results = await this.lifecycleRulesService.importRules(body.rules);
    return {
      ...results,
      message: `批量导入完成：成功 ${results.success} 个，失败 ${results.failed} 个`,
    };
  }

  /**
   * 测试生命周期规则
   */
  @Post(':id/test')
  @HttpCode(200)
  @ApiOperation({ summary: '测试生命周期规则', description: '在不实际执行的情况下，测试规则匹配哪些设备' })
  @ApiResponse({ status: 200, description: '测试完成' })
  @ApiResponse({ status: 404, description: '规则未找到' })
  async testRule(@Param('id') id: string, @Body() testData?: { dryRun?: boolean }) {
    this.logger.log(`测试生命周期规则 - ID: ${id}`);
    return await this.lifecycleRulesService.testRule(id, testData?.dryRun !== false);
  }

  /**
   * 获取规则模板列表
   */
  @Get('templates')
  @ApiOperation({ summary: '获取生命周期规则模板', description: '获取预定义的规则模板，用于快速创建常用规则' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTemplates() {
    return await this.lifecycleRulesService.getTemplates();
  }

  /**
   * 从模板创建规则
   * 注意：这个路由必须定义在其他包含 :id 的路由之后
   */
  @Post('templates/:templateId/create')
  @ApiOperation({ summary: '从模板创建生命周期规则', description: '基于预定义模板快速创建规则' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 404, description: '模板未找到' })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() customConfig?: { config?: Record<string, any> }
  ) {
    this.logger.log(`从模板创建规则 - 模板ID: ${templateId}`);
    return await this.lifecycleRulesService.createFromTemplate(templateId, customConfig?.config);
  }
}
