import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { QueryCouponDto, UseCouponDto } from './dto/query-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * 优惠券控制器
 */
@Controller('api/coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  private readonly logger = new Logger(CouponsController.name);

  constructor(private readonly couponsService: CouponsService) {}

  /**
   * 获取我的优惠券列表
   * GET /api/coupons/my
   */
  @Get('my')
  async getMyCoupons(@Request() req: any, @Query() query: QueryCouponDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching coupons for user ${userId} with query: ${JSON.stringify(query)}`);
    return this.couponsService.getMyCoupons(userId, query);
  }

  /**
   * 获取优惠券详情
   * GET /api/coupons/:id
   */
  @Get(':id')
  async getCouponDetail(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching coupon ${id} for user ${userId}`);
    return this.couponsService.findOne(id, userId);
  }

  /**
   * 使用优惠券
   * POST /api/coupons/:id/use
   */
  @Post(':id/use')
  async useCoupon(@Param('id') id: string, @Request() req: any, @Body() dto: UseCouponDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`User ${userId} using coupon ${id} for order ${dto.orderId}`);
    return this.couponsService.useCoupon(id, userId, dto.orderId);
  }

  /**
   * 获取优惠券统计
   * GET /api/coupons/stats
   */
  @Get('my/stats')
  async getCouponStats(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching coupon stats for user ${userId}`);
    return this.couponsService.getUserCouponStats(userId);
  }
}
