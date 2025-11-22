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
import { ReferralsService } from './referrals.service';
import {
  QueryReferralDto,
  QueryWithdrawDto,
  QueryEarningsDto,
  ApplyWithdrawDto,
  ShareDto,
} from './dto/referral.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
/**
 * 邀请返利控制器
 */
@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  private readonly logger = new Logger(ReferralsController.name);
  constructor(private readonly referralsService: ReferralsService) {}
  /**
   * 获取邀请配置
   * GET /api/referral/config
   */
  @Get('config')
  async getReferralConfig(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching referral config for user ${userId}`);
    return this.referralsService.getReferralConfig(userId);
  }
  /**
   * 生成邀请码
   * POST /api/referral/generate-code
   */
  @Post('generate-code')
  async generateInviteCode(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Generating invite code for user ${userId}`);
    return this.referralsService.generateInviteCode(userId);
  }
  /**
   * 获取邀请统计
   * GET /api/referral/stats
   */
  @Get('stats')
  async getReferralStats(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching referral stats for user ${userId}`);
    return this.referralsService.getReferralStats(userId);
  }
  /**
   * 获取邀请记录
   * GET /api/referral/records
   */
  @Get('records')
  async getReferralRecords(@Request() req: any, @Query() query: QueryReferralDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching referral records for user ${userId}`);
    return this.referralsService.getReferralRecords(userId, query);
  }
  /**
   * 获取提现记录
   * GET /api/referral/withdrawals
   */
  @Get('withdrawals')
  async getWithdrawRecords(@Request() req: any, @Query() query: QueryWithdrawDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching withdraw records for user ${userId}`);
    return this.referralsService.getWithdrawRecords(userId, query);
  }
  /**
   * 申请提现
   * POST /api/referral/withdraw
   */
  @Post('withdraw')
  async applyWithdraw(@Request() req: any, @Body() dto: ApplyWithdrawDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`User ${userId} applying for withdraw: ${dto.amount}`);
    return this.referralsService.applyWithdraw(userId, dto);
  }
  /**
   * 取消提现
   * POST /api/referral/withdrawals/:id/cancel
   */
  @Post('withdrawals/:id/cancel')
  async cancelWithdraw(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`User ${userId} cancelling withdraw ${id}`);
    return this.referralsService.cancelWithdraw(userId, id);
  }
  /**
   * 生成邀请海报
   * POST /api/referral/generate-poster
   */
  @Post('generate-poster')
  async generatePoster(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Generating poster for user ${userId}`);
    return this.referralsService.generatePoster(userId);
  }
  /**
   * 获取收益明细
   * GET /api/referral/earnings
   */
  @Get('earnings')
  async getEarningsDetail(@Request() req: any, @Query() query: QueryEarningsDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`Fetching earnings detail for user ${userId}`);
    return this.referralsService.getEarningsDetail(userId, query);
  }
  /**
   * 分享到社交平台
   * POST /api/referral/share
   */
  @Post('share')
  async shareToSocial(@Request() req: any, @Body() dto: ShareDto) {
    const userId = req.user?.id || req.user?.sub;
    this.logger.log(`User ${userId} sharing to ${dto.platform}`);
    return this.referralsService.shareToSocial(userId, dto);
  }
}
