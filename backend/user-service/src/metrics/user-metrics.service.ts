/**
 * 用户服务业务指标服务
 * 统一管理用户相关的 Prometheus 指标记录
 */

import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserMetrics } from '@cloudphone/shared';
import { User } from '../entities/user.entity';

@Injectable()
export class UserMetricsService {
  private readonly logger = new Logger(UserMetricsService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * 记录用户注册尝试
   */
  recordRegistrationAttempt(): void {
    UserMetrics.registrationAttempts.inc();
    this.logger.debug('User registration attempt recorded');
  }

  /**
   * 记录注册失败
   */
  recordRegistrationFailure(reason: string): void {
    UserMetrics.registrationFailures.inc({ reason });
    this.logger.debug(`User registration failure recorded: ${reason}`);
  }

  /**
   * 记录用户注册成功
   */
  recordRegistrationSuccess(): void {
    UserMetrics.registrationSuccess.inc();
    this.logger.debug('User registration success recorded');
  }

  /**
   * 记录登录尝试
   */
  recordLoginAttempt(username: string): void {
    UserMetrics.loginAttempts.inc({ username });
    this.logger.debug(`Login attempt recorded: ${username}`);
  }

  /**
   * 记录登录失败
   */
  recordLoginFailure(username: string, reason: string): void {
    UserMetrics.loginFailures.inc({ username, reason });
    this.logger.debug(`Login failure recorded: ${username}, reason: ${reason}`);
  }

  /**
   * 记录登录成功
   */
  recordLoginSuccess(username: string): void {
    UserMetrics.loginSuccess.inc({ username });
    this.logger.debug(`Login success recorded: ${username}`);
  }

  /**
   * 记录用户锁定
   */
  recordUserLocked(userId: string, reason: string): void {
    UserMetrics.usersLocked.inc({ userId, reason });
    this.logger.debug(`User locked recorded: ${userId}, reason: ${reason}`);
  }

  /**
   * 记录角色分配
   */
  recordRoleAssigned(userId: string, role: string): void {
    UserMetrics.roleAssignment.inc({ userId, role });
    this.logger.debug(`Role assigned recorded: ${userId}, role: ${role}`);
  }

  /**
   * 每分钟更新在线用户数
   *
   * 查询条件: 最近 5 分钟内有活动的用户数
   */
  @ClusterSafeCron(CronExpression.EVERY_MINUTE)
  async updateOnlineUsersMetrics(): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // 统计最近 5 分钟内登录的用户数
      const onlineCount = await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastLoginAt > :fiveMinutesAgo', { fiveMinutesAgo })
        .getCount();

      UserMetrics.usersOnline.set(onlineCount);

      this.logger.debug(`Online users metric updated: ${onlineCount} users`);
    } catch (error) {
      this.logger.error('Failed to update online users metrics', error.stack);
    }
  }

  /**
   * 每 5 分钟更新总用户数
   */
  @ClusterSafeCron(CronExpression.EVERY_5_MINUTES)
  async updateTotalUsersMetrics(): Promise<void> {
    try {
      const totalUsersCount = await this.userRepository.count();

      UserMetrics.totalUsers.set(totalUsersCount);

      this.logger.debug(`Total users metric updated: ${totalUsersCount} users`);
    } catch (error) {
      this.logger.error('Failed to update total users metrics', error.stack);
    }
  }

  /**
   * 每天凌晨统计昨日用户注册/登录指标
   */
  @ClusterSafeCron('0 0 * * *') // 每天 00:00
  async recordDailyUserStats(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 统计昨日新注册用户数
      const newUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :yesterday', { yesterday })
        .andWhere('user.createdAt < :today', { today })
        .getCount();

      // 统计昨日活跃用户数（有登录记录）
      const activeUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastLoginAt >= :yesterday', { yesterday })
        .andWhere('user.lastLoginAt < :today', { today })
        .getCount();

      this.logger.log(`Daily user stats (${yesterday.toISOString().split('T')[0]}):`);
      this.logger.log(`  - New registrations: ${newUsers}`);
      this.logger.log(`  - Active users: ${activeUsers}`);
    } catch (error) {
      this.logger.error('Failed to record daily user stats', error.stack);
    }
  }
}
