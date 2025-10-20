import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
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

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建计费规则' })
  async createRule(@Body() dto: CreateBillingRuleDto) {
    return await this.rulesService.createRule(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取计费规则列表' })
  async listRules(@Query('resourceType') resourceType?: ResourceType) {
    return await this.rulesService.listRules(resourceType);
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

  @Post('calculate')
  @ApiOperation({ summary: '计算价格' })
  async calculatePrice(
    @Body()
    body: {
      resourceType: ResourceType;
      quantity: number;
      context?: any;
    },
  ) {
    return await this.rulesService.calculatePrice(
      body.resourceType,
      body.quantity,
      body.context,
    );
  }
}
