import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { QueryActivityDto, QueryParticipationDto } from './dto/query-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CouponsService } from '../coupons/coupons.service';
import { CouponType } from '../coupons/entities/coupon.entity';
/**
 * 营销活动控制器
 */
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  private readonly logger = new Logger(ActivitiesController.name);
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly couponsService: CouponsService
  ) {}
  /**
   * 获取活动列表
   * GET /api/activities
   */
  @Get()
  async findAll(@Query() query: QueryActivityDto) {
    this.logger.log(`Fetching activities list with query: ${JSON.stringify(query)}`);
    return this.activitiesService.findAll(query);
  }
  /**
   * 获取活动统计
   * GET /api/activities/stats
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching activity stats for user ${userId}`);
    return this.activitiesService.getStats(userId);
  }
  /**
   * 获取我的参与记录
   * GET /api/activities/my/participations
   */
  @Get('my/participations')
  async getMyParticipations(@Request() req: any, @Query() query: QueryParticipationDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching participations for user ${userId}`);
    return this.activitiesService.getMyParticipations(userId, query);
  }
  /**
   * 获取活动详情
   * GET /api/activities/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching activity detail for ID: ${id}`);
    return this.activitiesService.findOne(id);
  }
  /**
   * 参与活动
   * POST /api/activities/:id/participate
   */
  @Post(':id/participate')
  async participate(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`User ${userId} participating in activity ${id}`);
    return this.activitiesService.participate(id, userId);
  }
  /**
   * 领取优惠券（活动奖励）
   * POST /api/activities/:id/claim-coupon
   *
   * 注意：此接口将在优惠券模块中实现，这里暂时返回提示
   */
  @Post(':activityId/claim-coupon')
  async claimCoupon(@Param('activityId') activityId: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`User ${userId} claiming coupon from activity ${activityId}`);
    // 获取活动详情
    const activity = await this.activitiesService.findOne(activityId);
    // 检查用户是否已参与活动
    const hasParticipated = await this.activitiesService.hasUserParticipated(activityId, userId);
    if (!hasParticipated) {
      throw new BadRequestException('You must participate in the activity first');
    }
    // 配置优惠券（根据活动类型）
    const couponConfig = {
      name: `${activity.title} - 优惠券`,
      type: activity.discount ? CouponType.DISCOUNT : CouponType.GIFT,
      value: activity.discount || 0,
      minAmount: undefined,
      validDays: 30, // 默认30天有效期
    };
    // 从活动领取优惠券
    return this.couponsService.claimFromActivity(activityId, userId, activity.title, couponConfig);
  }
}
