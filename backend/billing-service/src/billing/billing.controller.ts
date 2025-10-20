import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Post('orders')
  async createOrder(@Body() createOrderDto: any) {
    return this.billingService.createOrder(createOrderDto);
  }

  @Get('orders/:userId')
  async getUserOrders(@Param('userId') userId: string) {
    return this.billingService.getUserOrders(userId);
  }

  @Get('usage/:userId')
  async getUserUsage(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.billingService.getUserUsage(userId, startDate, endDate);
  }

  @Post('usage/start')
  async startUsage(@Body() body: { userId: string; deviceId: string; tenantId: string }) {
    return this.billingService.startUsage(body);
  }

  @Post('usage/stop')
  async stopUsage(@Body() body: { recordId: string }) {
    return this.billingService.stopUsage(body.recordId);
  }
}
