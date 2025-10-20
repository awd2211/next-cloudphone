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
import {
  BalanceService,
  CreateBalanceDto,
  RechargeBalanceDto,
  ConsumeBalanceDto,
  FreezeBalanceDto,
  AdjustBalanceDto,
} from './balance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TransactionType, TransactionStatus } from './entities/balance-transaction.entity';

@ApiTags('balance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('balance')
export class BalanceController {
  private readonly logger = new Logger(BalanceController.name);

  constructor(private readonly balanceService: BalanceService) {}

  /**
   * 创建用户余额账户
   */
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建用户余额账户' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createBalance(@Body() dto: CreateBalanceDto) {
    this.logger.log(`创建余额账户 - 用户: ${dto.userId}`);
    return await this.balanceService.createBalance(dto);
  }

  /**
   * 获取用户余额
   */
  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户余额' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserBalance(@Param('userId') userId: string) {
    return await this.balanceService.getUserBalance(userId);
  }

  /**
   * 充值
   */
  @Post('recharge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '余额充值' })
  @ApiResponse({ status: 200, description: '充值成功' })
  async recharge(@Body() dto: RechargeBalanceDto) {
    this.logger.log(`余额充值 - 用户: ${dto.userId}, 金额: ${dto.amount}`);
    return await this.balanceService.recharge(dto);
  }

  /**
   * 消费
   */
  @Post('consume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '余额消费' })
  @ApiResponse({ status: 200, description: '消费成功' })
  async consume(@Body() dto: ConsumeBalanceDto) {
    this.logger.log(`余额消费 - 用户: ${dto.userId}, 金额: ${dto.amount}`);
    return await this.balanceService.consume(dto);
  }

  /**
   * 冻结余额
   */
  @Post('freeze')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '冻结余额' })
  @ApiResponse({ status: 200, description: '冻结成功' })
  async freezeBalance(@Body() dto: FreezeBalanceDto) {
    this.logger.log(`冻结余额 - 用户: ${dto.userId}, 金额: ${dto.amount}`);
    return await this.balanceService.freezeBalance(dto);
  }

  /**
   * 解冻余额
   */
  @Post('unfreeze')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '解冻余额' })
  @ApiResponse({ status: 200, description: '解冻成功' })
  async unfreezeBalance(
    @Body() body: { userId: string; amount: number; reason: string },
  ) {
    this.logger.log(`解冻余额 - 用户: ${body.userId}, 金额: ${body.amount}`);
    return await this.balanceService.unfreezeBalance(
      body.userId,
      body.amount,
      body.reason,
    );
  }

  /**
   * 余额调整（管理员）
   */
  @Post('adjust')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '余额调整（管理员）' })
  @ApiResponse({ status: 200, description: '调整成功' })
  async adjustBalance(@Body() dto: AdjustBalanceDto) {
    this.logger.log(
      `余额调整 - 用户: ${dto.userId}, 金额: ${dto.amount}, 操作人: ${dto.operatorId}`,
    );
    return await this.balanceService.adjustBalance(dto);
  }

  /**
   * 获取交易记录
   */
  @Get('transactions/:userId')
  @ApiOperation({ summary: '获取交易记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTransactions(
    @Param('userId') userId: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.balanceService.getTransactions(userId, {
      type,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * 获取余额统计
   */
  @Get('statistics/:userId')
  @ApiOperation({ summary: '获取余额统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getBalanceStatistics(@Param('userId') userId: string) {
    return await this.balanceService.getBalanceStatistics(userId);
  }
}
