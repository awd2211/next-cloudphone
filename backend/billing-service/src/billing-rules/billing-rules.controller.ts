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
  UseGuards,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingRulesService, CreateBillingRuleDto } from './billing-rules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ResourceType } from './entities/billing-rule.entity';
@ApiTags('billing-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing-rules')
export class BillingRulesController {
  private readonly logger = new Logger(BillingRulesController.name);
  constructor(private readonly rulesService: BillingRulesService) {}
  @Get('templates')
  @ApiOperation({ summary: '获取计费规则模板' })
  async getRuleTemplates() {
    return await this.rulesService.getRuleTemplates();
  }
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建计费规则' })
  async createRule(@Body() dto: CreateBillingRuleDto) {
    return await this.rulesService.createRule(dto);
  }
  @Get()
  @ApiOperation({ summary: '获取计费规则列表（支持分页和筛选）' })
  async listRules(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('resourceType') resourceType?: ResourceType,
    @Query('isActive') isActive?: string
  ) {
    // 支持 pageSize 或 limit 参数
    const itemsPerPage = pageSize || limit || '10';
    const result = await this.rulesService.listRules(
      parseInt(page),
      parseInt(itemsPerPage),
      resourceType,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined
    );
    // 返回标准格式：将 limit 转换为 pageSize
    const { limit: _, ...rest } = result;
    return {
      ...rest,
      pageSize: result.limit,
    };
  }
  @Get(':id')
  @ApiOperation({ summary: '获取计费规则详情' })
  async getRule(@Param('id') id: string) {
    return await this.rulesService.getRule(id);
  }
  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新计费规则' })
  async updateRule(@Param('id') id: string, @Body() updates: any) {
    return await this.rulesService.updateRule(id, updates);
  }
  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '删除计费规则' })
  async deleteRule(@Param('id') id: string) {
    await this.rulesService.deleteRule(id);
    return { message: '删除成功' };
  }
  @Patch(':id/toggle')
  @HttpCode(200)
  @Roles('admin')
  @ApiOperation({ summary: '启用/禁用计费规则' })
  async toggleRule(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    this.logger.log(`切换计费规则状态 - ID: ${id}, isActive: ${body.isActive}`);
    return await this.rulesService.toggleRule(id, body.isActive);
  }
  @Post(':id/test')
  @HttpCode(200)
  @ApiOperation({ summary: '测试计费规则' })
  async testRule(@Param('id') id: string, @Body() testData: any) {
    this.logger.log(`测试计费规则 - ID: ${id}`);
    return await this.rulesService.testRule(id, testData);
  }
  @Post('calculate')
  @ApiOperation({ summary: '计算价格' })
  async calculatePrice(
    @Body()
    body: {
      resourceType: ResourceType;
      quantity: number;
      context?: any;
    }
  ) {
    return await this.rulesService.calculatePrice(body.resourceType, body.quantity, body.context);
  }
}
