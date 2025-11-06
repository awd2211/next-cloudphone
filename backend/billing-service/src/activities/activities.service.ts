import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Activity, ActivityStatus } from './entities/activity.entity';
import { Participation, ParticipationStatus } from './entities/participation.entity';
import { QueryActivityDto, QueryParticipationDto } from './dto/query-activity.dto';

/**
 * 营销活动服务
 */
@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>
  ) {}

  /**
   * 获取活动列表
   */
  async findAll(query: QueryActivityDto) {
    const { type, status, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.is_active = :isActive', { isActive: true });

    // 筛选条件
    if (type) {
      queryBuilder.andWhere('activity.type = :type', { type });
    }

    if (status) {
      const now = new Date();
      switch (status) {
        case ActivityStatus.UPCOMING:
          queryBuilder.andWhere('activity.start_time > :now', { now });
          break;
        case ActivityStatus.ONGOING:
          queryBuilder.andWhere('activity.start_time <= :now', { now });
          queryBuilder.andWhere('activity.end_time >= :now', { now });
          break;
        case ActivityStatus.ENDED:
          queryBuilder.andWhere('activity.end_time < :now', { now });
          break;
      }
    }

    // 分页
    queryBuilder
      .orderBy('activity.start_time', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    // 更新状态
    data.forEach((activity) => {
      activity.status = activity.calculateStatus();
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取活动详情
   */
  async findOne(id: string) {
    const activity = await this.activityRepository.findOne({
      where: { id, isActive: true },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    // 更新状态
    activity.status = activity.calculateStatus();

    return activity;
  }

  /**
   * 参与活动
   */
  async participate(activityId: string, userId: string) {
    this.logger.log(`User ${userId} participating in activity ${activityId}`);

    // 检查活动是否存在
    const activity = await this.findOne(activityId);

    // 检查是否可以参与
    if (!activity.canParticipate()) {
      throw new BadRequestException('Activity is not available for participation');
    }

    // 检查是否已经参与过
    const existingParticipation = await this.participationRepository.findOne({
      where: {
        activityId,
        userId,
      },
    });

    if (existingParticipation) {
      throw new BadRequestException('You have already participated in this activity');
    }

    // 创建参与记录
    const participation = this.participationRepository.create({
      activityId,
      userId,
      rewards: activity.rewards || [],
      status: ParticipationStatus.COMPLETED,
    });

    await this.participationRepository.save(participation);

    // 更新活动参与人数
    activity.currentParticipants += 1;
    await this.activityRepository.save(activity);

    this.logger.log(`User ${userId} successfully participated in activity ${activityId}`);

    return {
      participation: {
        ...participation,
        activityTitle: activity.title,
      },
      rewards: activity.rewards || [],
      message: 'Successfully participated in the activity',
    };
  }

  /**
   * 获取用户的参与记录
   */
  async getMyParticipations(userId: string, query: QueryParticipationDto) {
    const { activityId, page = 1, pageSize = 10 } = query;

    const queryBuilder = this.participationRepository
      .createQueryBuilder('participation')
      .leftJoinAndSelect('participation.activity', 'activity')
      .where('participation.user_id = :userId', { userId });

    if (activityId) {
      queryBuilder.andWhere('participation.activity_id = :activityId', { activityId });
    }

    queryBuilder
      .orderBy('participation.participated_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [participations, total] = await queryBuilder.getManyAndCount();

    // 格式化返回数据
    const data = participations.map((p) => ({
      id: p.id,
      activityId: p.activityId,
      activityTitle: p.activity?.title || '',
      userId: p.userId,
      participatedAt: p.participatedAt,
      rewards: p.rewards || [],
      status: p.status,
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 检查用户是否已参与活动
   */
  async hasUserParticipated(activityId: string, userId: string): Promise<boolean> {
    const participation = await this.participationRepository.findOne({
      where: {
        activityId,
        userId,
      },
    });

    return !!participation;
  }

  /**
   * 获取活动统计
   */
  async getStats(userId: string) {
    // 总活动数
    const totalActivities = await this.activityRepository.count({
      where: { isActive: true },
    });

    // 进行中的活动数
    const now = new Date();
    const ongoingActivities = await this.activityRepository.count({
      where: {
        isActive: true,
        startTime: LessThan(now),
        endTime: MoreThan(now),
      },
    });

    // 我的参与记录数
    const totalParticipations = await this.participationRepository.count({
      where: { userId },
    });

    // 获取奖励总数（简化计算）
    const participations = await this.participationRepository.find({
      where: { userId },
    });

    let totalRewards = 0;
    participations.forEach((p) => {
      if (p.rewards && Array.isArray(p.rewards)) {
        totalRewards += p.rewards.length;
      }
    });

    return {
      totalActivities,
      ongoingActivities,
      myCoupons: 0, // 需要从优惠券模块获取
      availableCoupons: 0, // 需要从优惠券模块获取
      totalParticipations,
      totalRewards,
    };
  }
}
