import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('stats')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '获取计费统计', description: '获取计费和收入统计信息' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStats(@Query('tenantId') tenantId?: string) {
    const stats = await this.billingService.getStats(tenantId);
    return {
      success: true,
      data: stats,
      message: '计费统计获取成功',
    };
  }

  @Get('plans')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '获取套餐列表', description: '获取所有可用的套餐计划' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPlans(@Query('page') page: string = '1', @Query('pageSize') pageSize: string = '10') {
    return this.billingService.getPlans(+page, +pageSize);
  }

  @Get('plans/:id')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '获取套餐详情', description: '根据ID获取套餐详情' })
  @ApiParam({ name: 'id', description: '套餐 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPlan(@Param('id') id: string) {
    return this.billingService.getPlan(id);
  }

  @Post('plans')
  @RequirePermission('billing:create')
  @ApiOperation({ summary: '创建套餐', description: '创建新的套餐' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createPlan(@Body() data: any) {
    return this.billingService.createPlan(data);
  }

  @Patch('plans/:id')
  @RequirePermission('billing:update')
  @ApiOperation({ summary: '更新套餐', description: '更新套餐信息' })
  @ApiParam({ name: 'id', description: '套餐 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updatePlan(@Param('id') id: string, @Body() data: any) {
    return this.billingService.updatePlan(id, data);
  }

  @Delete('plans/:id')
  @RequirePermission('billing:delete')
  @ApiOperation({ summary: '删除套餐', description: '删除指定套餐' })
  @ApiParam({ name: 'id', description: '套餐 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deletePlan(@Param('id') id: string) {
    return this.billingService.deletePlan(id);
  }

  @Post('orders')
  @RequirePermission('billing:create')
  @ApiOperation({ summary: '创建订单', description: '创建新的套餐订单' })
  @ApiBody({
    description: '订单创建信息',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: '用户 ID' },
        planId: { type: 'string', description: '套餐 ID' },
        tenantId: { type: 'string', description: '租户 ID' },
      },
      required: ['userId', 'planId'],
    },
  })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createOrder(@Body() createOrderDto: any) {
    return this.billingService.createOrder(createOrderDto);
  }

  @Get('orders/:userId')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '获取用户订单', description: '获取指定用户的所有订单' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUserOrders(@Param('userId') userId: string) {
    return this.billingService.getUserOrders(userId);
  }

  @Post('orders/:orderId/cancel')
  @RequirePermission('billing:update')
  @ApiOperation({ summary: '取消订单', description: '取消待支付的订单' })
  @ApiParam({ name: 'orderId', description: '订单 ID' })
  @ApiBody({
    description: '取消原因（可选）',
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: '取消原因' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '订单已取消' })
  @ApiResponse({ status: 400, description: '订单状态不允许取消' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async cancelOrder(@Param('orderId') orderId: string, @Body() body: { reason?: string }) {
    const order = await this.billingService.cancelOrder(orderId, body.reason);
    return {
      success: true,
      data: order,
      message: '订单已取消',
    };
  }

  @Get('usage/:userId')
  @RequirePermission('billing:read')
  @ApiOperation({ summary: '获取用户使用记录', description: '获取指定时间范围内的使用记录' })
  @ApiParam({ name: 'userId', description: '用户 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（YYYY-MM-DD）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（YYYY-MM-DD）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUserUsage(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.billingService.getUserUsage(userId, startDate, endDate);
  }

  @Post('usage/start')
  @RequirePermission('billing:create')
  @ApiOperation({ summary: '开始使用记录', description: '开始记录设备使用时间' })
  @ApiBody({
    description: '使用记录开始信息',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: '用户 ID' },
        deviceId: { type: 'string', description: '设备 ID' },
        tenantId: { type: 'string', description: '租户 ID' },
      },
      required: ['userId', 'deviceId', 'tenantId'],
    },
  })
  @ApiResponse({ status: 201, description: '使用记录已创建' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async startUsage(@Body() body: { userId: string; deviceId: string; tenantId: string }) {
    return this.billingService.startUsage(body);
  }

  @Post('usage/stop')
  @RequirePermission('billing:update')
  @ApiOperation({ summary: '停止使用记录', description: '停止记录设备使用时间并计算费用' })
  @ApiBody({
    description: '使用记录停止信息',
    schema: {
      type: 'object',
      properties: {
        recordId: { type: 'string', description: '使用记录 ID' },
      },
      required: ['recordId'],
    },
  })
  @ApiResponse({ status: 200, description: '使用记录已停止' })
  @ApiResponse({ status: 404, description: '使用记录不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async stopUsage(@Body() body: { recordId: string }) {
    return this.billingService.stopUsage(body.recordId);
  }
}
