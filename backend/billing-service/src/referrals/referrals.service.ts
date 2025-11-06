import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ReferralConfig } from './entities/referral-config.entity';
import { ReferralRecord, ReferralStatus } from './entities/referral-record.entity';
import { WithdrawRecord, WithdrawStatus } from './entities/withdraw-record.entity';
import { EarningsRecord, EarningsType } from './entities/earnings-record.entity';
import {
  QueryReferralDto,
  QueryWithdrawDto,
  QueryEarningsDto,
  ApplyWithdrawDto,
  ShareDto,
} from './dto/referral.dto';

/**
 * 邀请返利服务
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  // 系统配置
  private readonly REWARD_PER_INVITE = 10; // 每邀请一人的奖励
  private readonly MIN_WITHDRAW_AMOUNT = 10; // 最低提现金额
  private readonly WITHDRAW_FEE_RATE = 0.01; // 提现手续费率 1%

  constructor(
    @InjectRepository(ReferralConfig)
    private readonly configRepository: Repository<ReferralConfig>,
    @InjectRepository(ReferralRecord)
    private readonly recordRepository: Repository<ReferralRecord>,
    @InjectRepository(WithdrawRecord)
    private readonly withdrawRepository: Repository<WithdrawRecord>,
    @InjectRepository(EarningsRecord)
    private readonly earningsRepository: Repository<EarningsRecord>,
    private readonly configService: ConfigService
  ) {}

  /**
   * 获取或创建用户的邀请配置
   */
  async getOrCreateConfig(userId: string): Promise<ReferralConfig> {
    let config = await this.configRepository.findOne({
      where: { userId },
    });

    if (!config) {
      // 生成邀请码
      const inviteCode = this.generateRandomCode();

      config = this.configRepository.create({
        userId,
        inviteCode,
      });

      await this.configRepository.save(config);
      this.logger.log(`Created referral config for user ${userId} with code ${inviteCode}`);
    }

    return config;
  }

  /**
   * 获取邀请配置
   */
  async getReferralConfig(userId: string) {
    const config = await this.getOrCreateConfig(userId);

    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5174');
    const inviteLink = `${baseUrl}/register?inviteCode=${config.inviteCode}`;
    const qrCodeUrl = `${baseUrl}/api/qrcode?text=${encodeURIComponent(inviteLink)}`;

    return {
      inviteCode: config.inviteCode,
      inviteLink,
      qrCodeUrl,
      rewardPerInvite: this.REWARD_PER_INVITE,
      minWithdrawAmount: this.MIN_WITHDRAW_AMOUNT,
      withdrawFeeRate: this.WITHDRAW_FEE_RATE,
      rules: this.getReferralRules(),
    };
  }

  /**
   * 生成新的邀请码
   */
  async generateInviteCode(userId: string) {
    const config = await this.getOrCreateConfig(userId);

    // 生成新的邀请码
    const newCode = this.generateRandomCode();
    config.inviteCode = newCode;
    await this.configRepository.save(config);

    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5174');
    const inviteLink = `${baseUrl}/register?inviteCode=${newCode}`;
    const qrCodeUrl = `${baseUrl}/api/qrcode?text=${encodeURIComponent(inviteLink)}`;

    return {
      code: newCode,
      link: inviteLink,
      qrCodeUrl,
    };
  }

  /**
   * 获取邀请统计
   */
  async getReferralStats(userId: string) {
    const config = await this.getOrCreateConfig(userId);

    const pendingInvites = await this.recordRepository.count({
      where: { referrerId: userId, status: ReferralStatus.PENDING },
    });

    return {
      totalInvites: config.totalInvites,
      confirmedInvites: config.confirmedInvites,
      pendingInvites,
      totalRewards: config.totalEarned,
      availableBalance: config.availableBalance,
      withdrawnAmount: config.totalWithdrawn,
      conversionRate: config.getConversionRate(),
    };
  }

  /**
   * 获取邀请记录
   */
  async getReferralRecords(userId: string, query: QueryReferralDto) {
    const { status, startDate, endDate, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.recordRepository
      .createQueryBuilder('record')
      .where('record.referrer_id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('record.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('record.registered_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    queryBuilder
      .orderBy('record.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取提现记录
   */
  async getWithdrawRecords(userId: string, query: QueryWithdrawDto) {
    const { status, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.withdrawRepository
      .createQueryBuilder('withdraw')
      .where('withdraw.user_id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('withdraw.status = :status', { status });
    }

    queryBuilder
      .orderBy('withdraw.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 申请提现
   */
  async applyWithdraw(userId: string, dto: ApplyWithdrawDto) {
    this.logger.log(`User ${userId} applying for withdraw: ${dto.amount}`);

    // 获取用户配置
    const config = await this.getOrCreateConfig(userId);

    // 验证金额
    if (dto.amount < this.MIN_WITHDRAW_AMOUNT) {
      throw new BadRequestException(`Minimum withdraw amount is ${this.MIN_WITHDRAW_AMOUNT}`);
    }

    if (dto.amount > config.availableBalance) {
      throw new BadRequestException('Insufficient balance');
    }

    // 计算手续费和实际到账金额
    const fee = WithdrawRecord.calculateFee(dto.amount, this.WITHDRAW_FEE_RATE);
    const actualAmount = WithdrawRecord.calculateActualAmount(dto.amount, this.WITHDRAW_FEE_RATE);

    // 冻结余额
    const frozen = config.freezeBalance(dto.amount);
    if (!frozen) {
      throw new BadRequestException('Failed to freeze balance');
    }

    // 创建提现记录
    const withdraw = this.withdrawRepository.create({
      userId,
      amount: dto.amount,
      method: dto.method,
      account: dto.account,
      accountName: dto.accountName,
      fee,
      actualAmount,
      remark: dto.remark,
    });

    await this.withdrawRepository.save(withdraw);
    await this.configRepository.save(config);

    this.logger.log(`Withdraw application created: ${withdraw.id}`);

    // 预计到账时间（3-5个工作日）
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + 5);

    return {
      withdrawId: withdraw.id,
      message: 'Withdraw application submitted successfully',
      estimatedArrival: estimatedArrival.toISOString(),
    };
  }

  /**
   * 取消提现
   */
  async cancelWithdraw(userId: string, withdrawId: string) {
    const withdraw = await this.withdrawRepository.findOne({
      where: { id: withdrawId, userId },
    });

    if (!withdraw) {
      throw new NotFoundException('Withdraw record not found');
    }

    if (!withdraw.canCancel()) {
      throw new BadRequestException('Cannot cancel this withdraw');
    }

    // 解冻余额
    const config = await this.getOrCreateConfig(userId);
    config.unfreezeBalance(withdraw.amount);

    // 取消提现
    withdraw.cancel();

    await this.withdrawRepository.save(withdraw);
    await this.configRepository.save(config);

    this.logger.log(`Withdraw ${withdrawId} cancelled by user ${userId}`);

    return {
      success: true,
      message: 'Withdraw cancelled successfully',
    };
  }

  /**
   * 获取收益明细
   */
  async getEarningsDetail(userId: string, query: QueryEarningsDto) {
    const { type, startDate, endDate, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.earningsRepository
      .createQueryBuilder('earnings')
      .where('earnings.user_id = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('earnings.type = :type', { type });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('earnings.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    queryBuilder
      .orderBy('earnings.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 生成邀请海报
   */
  async generatePoster(userId: string) {
    const config = await this.getOrCreateConfig(userId);
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5174');

    // 这里应该调用海报生成服务
    // 简化实现：返回一个占位符URL
    const posterUrl = `${baseUrl}/api/posters/${config.inviteCode}.png`;

    return {
      posterUrl,
    };
  }

  /**
   * 分享到社交平台
   */
  async shareToSocial(userId: string, dto: ShareDto) {
    const config = await this.getOrCreateConfig(userId);
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5174');
    const inviteLink = `${baseUrl}/register?inviteCode=${dto.inviteCode}`;

    const shareText = `我在使用云手机平台，邀请你一起加入！注册即送优惠券，使用我的邀请码：${dto.inviteCode}`;

    let shareUrl = inviteLink;

    // 根据不同平台生成分享URL
    switch (dto.platform) {
      case 'wechat':
        // 微信分享需要通过微信SDK
        shareUrl = inviteLink;
        break;
      case 'qq':
        shareUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(inviteLink)}&title=${encodeURIComponent(shareText)}`;
        break;
      case 'weibo':
        shareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(inviteLink)}&title=${encodeURIComponent(shareText)}`;
        break;
      case 'link':
        shareUrl = inviteLink;
        break;
    }

    return {
      shareUrl,
      shareText,
    };
  }

  /**
   * 生成随机邀请码
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 获取邀请返利规则
   */
  private getReferralRules(): string {
    return `
1. 邀请好友注册并首次充值后，您将获得 ${this.REWARD_PER_INVITE} 元奖励
2. 奖励金额将自动添加到您的可提现余额
3. 最低提现金额为 ${this.MIN_WITHDRAW_AMOUNT} 元
4. 提现手续费为 ${this.WITHDRAW_FEE_RATE * 100}%
5. 提现预计 3-5 个工作日到账
6. 邀请码永久有效，可重复使用
7. 平台保留最终解释权
    `.trim();
  }
}
