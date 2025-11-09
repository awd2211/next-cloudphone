import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InvoicesService, CreateInvoiceDto, PayInvoiceDto } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceStatus, InvoiceType } from './entities/invoice.entity';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * 获取所有账单列表（管理员）
   */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '获取所有账单列表（管理员 - 支持分页和筛选）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllInvoices(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('type') type?: InvoiceType,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string
  ) {
    // 支持 pageSize 或 limit 参数
    const itemsPerPage = pageSize || limit || '10';

    const result = await this.invoicesService.getAllInvoices({
      page: parseInt(page),
      limit: parseInt(itemsPerPage),
      status,
      type,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
    });

    // 返回标准格式：将 limit 转换为 pageSize
    const { limit: _, ...rest } = result;
    return {
      success: true,
      ...rest,
      pageSize: result.limit,
    };
  }

  /**
   * 创建账单
   */
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建账单' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    this.logger.log(`创建账单 - 用户: ${dto.userId}`);
    return await this.invoicesService.createInvoice(dto);
  }

  /**
   * 获取账单详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取账单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getInvoice(@Param('id') id: string) {
    return await this.invoicesService.getInvoice(id);
  }

  /**
   * 获取用户账单列表
   */
  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户账单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserInvoices(
    @Param('userId') userId: string,
    @Query('status') status?: InvoiceStatus,
    @Query('type') type?: InvoiceType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return await this.invoicesService.getUserInvoices(userId, {
      status,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * 发布账单
   */
  @Put(':id/publish')
  @Roles('admin')
  @ApiOperation({ summary: '发布账单' })
  @ApiResponse({ status: 200, description: '发布成功' })
  async publishInvoice(@Param('id') id: string) {
    this.logger.log(`发布账单 - ID: ${id}`);
    return await this.invoicesService.publishInvoice(id);
  }

  /**
   * 支付账单
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付账单' })
  @ApiResponse({ status: 200, description: '支付成功' })
  async payInvoice(
    @Param('id') id: string,
    @Body() body: { paymentId: string; paymentMethod: string }
  ) {
    this.logger.log(`支付账单 - ID: ${id}`);
    return await this.invoicesService.payInvoice({
      invoiceId: id,
      ...body,
    });
  }

  /**
   * 取消账单
   */
  @Put(':id/cancel')
  @Roles('admin')
  @ApiOperation({ summary: '取消账单' })
  @ApiResponse({ status: 200, description: '取消成功' })
  async cancelInvoice(@Param('id') id: string, @Body() body: { reason: string }) {
    this.logger.log(`取消账单 - ID: ${id}`);
    return await this.invoicesService.cancelInvoice(id, body.reason);
  }

  /**
   * 获取账单统计
   */
  @Get('statistics/:userId')
  @ApiOperation({ summary: '获取账单统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getInvoiceStatistics(@Param('userId') userId: string) {
    return await this.invoicesService.getInvoiceStatistics(userId);
  }
}
