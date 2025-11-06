import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Coupon, CouponStatus, CouponType } from './entities/coupon.entity';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';

/**
 * 优惠券服务
 */
@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    private readonly dataSource: DataSource,
    private readonly lockService: DistributedLockService // ✅ K8s cluster safety
  ) {}

  /**
   * 获取用户的优惠券列表
   */
  async getMyCoupons(userId: string, query: QueryCouponDto) {
    const { status, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.user_id = :userId', { userId });

    // 筛选条件
    if (status) {
      queryBuilder.andWhere('coupon.status = :status', { status });
    }

    // 分页
    queryBuilder
      .orderBy('coupon.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    // 自动更新过期优惠券状态
    const now = new Date();
    let updated = false;
    data.forEach((coupon) => {
      if (coupon.status === CouponStatus.AVAILABLE && coupon.isExpired()) {
        coupon.markAsExpired();
        updated = true;
      }
    });

    // 如果有更新，批量保存
    if (updated) {
      await this.couponRepository.save(data.filter((c) => c.status === CouponStatus.EXPIRED));
    }

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取优惠券详情
   */
  async findOne(id: string, userId?: string) {
    const coupon = await this.couponRepository.findOne({
      where: userId ? { id, userId } : { id },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    // 自动更新过期状态
    if (coupon.status === CouponStatus.AVAILABLE && coupon.isExpired()) {
      coupon.markAsExpired();
      await this.couponRepository.save(coupon);
    }

    return coupon;
  }

  /**
   * 使用优惠券
   *
   * ✅ 事务保护：防止并发场景下同一优惠券被多次使用
   * ✅ 悲观锁：确保优惠券状态的一致性
   */
  async useCoupon(couponId: string, userId: string, orderId: string) {
    this.logger.log(`User ${userId} attempting to use coupon ${couponId} for order ${orderId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 使用悲观写锁获取优惠券，防止并发使用
      const coupon = await queryRunner.manager.findOne(Coupon, {
        where: { id: couponId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!coupon) {
        throw new NotFoundException(`Coupon ${couponId} not found for user ${userId}`);
      }

      // 检查是否可用
      if (!coupon.isAvailable()) {
        throw new BadRequestException(`Coupon is not available: status is ${coupon.status}`);
      }

      // 使用优惠券
      coupon.use(orderId);
      await queryRunner.manager.save(coupon);

      await queryRunner.commitTransaction();

      this.logger.log(`User ${userId} successfully used coupon ${couponId} for order ${orderId}`);

      return {
        success: true,
        message: 'Coupon applied successfully',
        discount: 0, // 需要订单金额才能计算具体折扣
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to use coupon ${couponId}: ${error.message}`, error.stack);
      throw error instanceof BadRequestException || error instanceof NotFoundException
        ? error
        : new BadRequestException(error.message);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 从活动领取优惠券
   * @param activityId 活动ID
   * @param userId 用户ID
   * @param activityTitle 活动标题
   * @param couponConfig 优惠券配置
   */
  async claimFromActivity(
    activityId: string,
    userId: string,
    activityTitle: string,
    couponConfig: {
      name: string;
      type: CouponType;
      value: number;
      minAmount?: number;
      validDays: number; // 有效天数
    }
  ) {
    this.logger.log(`User ${userId} claiming coupon from activity ${activityId}`);

    // 检查用户是否已经从该活动领取过优惠券
    const existingCoupon = await this.couponRepository.findOne({
      where: {
        userId,
        activityId,
      },
    });

    if (existingCoupon) {
      throw new BadRequestException('You have already claimed a coupon from this activity');
    }

    // 生成优惠券代码
    const code = this.generateCouponCode();

    // 计算有效期
    const now = new Date();
    const startTime = now;
    const endTime = new Date(now.getTime() + couponConfig.validDays * 24 * 60 * 60 * 1000);

    // 创建优惠券
    const coupon = this.couponRepository.create({
      code,
      name: couponConfig.name,
      type: couponConfig.type,
      value: couponConfig.value,
      minAmount: couponConfig.minAmount,
      status: CouponStatus.AVAILABLE,
      userId,
      activityId,
      activityTitle,
      startTime,
      endTime,
    });

    await this.couponRepository.save(coupon);

    this.logger.log(
      `User ${userId} successfully claimed coupon ${coupon.id} from activity ${activityId}`
    );

    return {
      coupon,
      message: 'Coupon claimed successfully',
    };
  }

  /**
   * 生成优惠券代码
   * 格式：CP-YYYYMMDD-随机6位大写字母数字
   */
  private generateCouponCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CP-${dateStr}-${randomStr}`;
  }

  /**
   * 定时任务：每天凌晨1点更新过期优惠券状态
   */
  @ClusterSafeCron(CronExpression.EVERY_DAY_AT_1AM)
  async updateExpiredCoupons() {
    this.logger.log('Running scheduled task: Update expired coupons');

    const now = new Date();

    // 查找所有已过期但状态仍为 AVAILABLE 的优惠券
    const expiredCoupons = await this.couponRepository.find({
      where: {
        status: CouponStatus.AVAILABLE,
        endTime: LessThan(now),
      },
    });

    if (expiredCoupons.length > 0) {
      // 批量更新状态
      expiredCoupons.forEach((coupon) => coupon.markAsExpired());
      await this.couponRepository.save(expiredCoupons);

      this.logger.log(`Updated ${expiredCoupons.length} expired coupons`);
    } else {
      this.logger.log('No expired coupons found');
    }
  }

  /**
   * 获取用户优惠券统计
   */
  async getUserCouponStats(userId: string) {
    const [available, used, expired] = await Promise.all([
      this.couponRepository.count({
        where: { userId, status: CouponStatus.AVAILABLE },
      }),
      this.couponRepository.count({
        where: { userId, status: CouponStatus.USED },
      }),
      this.couponRepository.count({
        where: { userId, status: CouponStatus.EXPIRED },
      }),
    ]);

    return {
      available,
      used,
      expired,
      total: available + used + expired,
    };
  }
}
