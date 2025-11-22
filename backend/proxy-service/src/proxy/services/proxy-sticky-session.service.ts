import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { ProxyStickySession, ProxySessionRenewal } from '../entities';
import { ProxyPoolManager } from '../../pool/pool-manager.service';
import { ProxyAlertService } from './proxy-alert.service';

/**
 * 代理粘性会话服务
 *
 * 功能：
 * 1. 创建长期IP绑定会话（最长30天）
 * 2. 自动续期机制
 * 3. 会话状态管理
 * 4. 会话查询和统计
 */
@Injectable()
export class ProxyStickySessionService {
  private readonly logger = new Logger(ProxyStickySessionService.name);

  constructor(
    @InjectRepository(ProxyStickySession)
    private sessionRepo: Repository<ProxyStickySession>,
    @InjectRepository(ProxySessionRenewal)
    private renewalRepo: Repository<ProxySessionRenewal>,
    private poolManager: ProxyPoolManager,
    @Optional() private readonly lockService: DistributedLockService, // ✅ Optional: proxy-service 暂未配置 Redis 分布式锁模块
    private readonly alertService: ProxyAlertService, // ✅ 告警服务
  ) {}

  /**
   * 创建粘性会话
   */
  async createStickySession(params: {
    deviceId: string;
    userId: string;
    proxyId: string;
    durationSeconds: number;
    priority?: number;
    autoRenew?: boolean;
    metadata?: Record<string, any>;
  }): Promise<ProxyStickySession> {
    const {
      deviceId,
      userId,
      proxyId,
      durationSeconds,
      priority = 5,
      autoRenew = true,
      metadata = {},
    } = params;

    // 验证代理是否存在且可用
    const proxy = this.poolManager.getProxyByIdFromPool(proxyId);
    if (!proxy) {
      throw new NotFoundException(`Proxy ${proxyId} not found`);
    }

    if (proxy.inUse && !metadata.allowShared) {
      throw new Error(`Proxy ${proxyId} is already in use`);
    }

    // 计算过期时间
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    // 创建会话
    const session = this.sessionRepo.create({
      deviceId,
      userId,
      proxyId,
      proxyHost: proxy.host,
      proxyPort: proxy.port,
      status: 'active',
      priority,
      autoRenew,
      expiresAt,
      renewalCount: 0,
      metadata,
    });

    await this.sessionRepo.save(session);

    // 标记代理为使用中
    this.poolManager.markProxyInUse(proxyId, session.id, userId, deviceId);

    this.logger.log(
      `Created sticky session ${session.id} for device ${deviceId}, proxy ${proxyId}, expires at ${expiresAt.toISOString()}`,
    );

    return session;
  }

  /**
   * 续期会话
   */
  async renewSession(
    sessionId: string,
    extensionSeconds: number,
  ): Promise<ProxyStickySession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status === 'expired' || session.status === 'terminated') {
      throw new Error(`Cannot renew ${session.status} session`);
    }

    // 计算新的过期时间
    const oldExpiresAt = session.expiresAt;
    const newExpiresAt = new Date(
      session.expiresAt.getTime() + extensionSeconds * 1000,
    );

    // 检查是否超过最大续期限制（30天）
    const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30天
    const totalDuration = newExpiresAt.getTime() - session.createdAt.getTime();

    if (totalDuration > maxDuration) {
      throw new Error(
        'Session duration cannot exceed 30 days. Please create a new session.',
      );
    }

    // 更新会话
    session.expiresAt = newExpiresAt;
    session.renewalCount += 1;
    session.lastRenewedAt = new Date();

    await this.sessionRepo.save(session);

    // 记录续期历史
    await this.recordRenewal(sessionId, oldExpiresAt, newExpiresAt, 'manual');

    this.logger.log(
      `Renewed session ${sessionId}, new expiration: ${newExpiresAt.toISOString()}`,
    );

    return session;
  }

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 更新会话状态
    session.status = 'terminated';
    session.terminatedAt = new Date();
    await this.sessionRepo.save(session);

    // 释放代理
    this.poolManager.releaseProxy(session.proxyId);

    this.logger.log(`Terminated session ${sessionId}`);
  }

  /**
   * 获取设备的活跃会话
   */
  async getDeviceSessions(deviceId: string): Promise<ProxyStickySession[]> {
    return this.sessionRepo.find({
      where: {
        deviceId,
        status: 'active',
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(
    userId: string,
    includeExpired = false,
  ): Promise<ProxyStickySession[]> {
    const query = this.sessionRepo
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC');

    if (!includeExpired) {
      query.andWhere('session.status IN (:...statuses)', {
        statuses: ['active', 'expiring_soon'],
      });
    }

    return query.getMany();
  }

  /**
   * 获取会话详情
   */
  async getSessionDetails(sessionId: string): Promise<{
    session: ProxyStickySession;
    renewalHistory: ProxySessionRenewal[];
    proxyInfo: any;
  }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const renewalHistory = await this.renewalRepo.find({
      where: { sessionId },
      order: { renewedAt: 'DESC' },
    });

    const proxyInfo = this.poolManager.getProxyByIdFromPool(session.proxyId);

    return {
      session,
      renewalHistory,
      proxyInfo,
    };
  }

  /**
   * 定时任务：自动续期即将过期的会话
   * 每小时执行一次
   */
  @ClusterSafeCron(CronExpression.EVERY_HOUR)
  async autoRenewExpiringSessions() {
    this.logger.log('Starting auto-renewal of expiring sessions');

    // 查找即将在24小时内过期的会话
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const expiringSessions = await this.sessionRepo.find({
      where: {
        autoRenew: true,
        status: 'active',
        expiresAt: LessThan(threshold),
      },
    });

    let renewedCount = 0;
    let failedCount = 0;

    for (const session of expiringSessions) {
      try {
        // 自动续期24小时
        await this.renewSession(session.id, 24 * 60 * 60);
        renewedCount++;

        // 更新状态
        session.status = 'active';
        await this.sessionRepo.save(session);
      } catch (error) {
        this.logger.error(
          `Failed to auto-renew session ${session.id}: ${error.message}`,
        );
        failedCount++;
      }
    }

    this.logger.log(
      `Auto-renewal completed: ${renewedCount} renewed, ${failedCount} failed`,
    );
  }

  /**
   * 定时任务：清理过期会话
   * 每6小时执行一次
   */
  @ClusterSafeCron(CronExpression.EVERY_6_HOURS)
  async cleanupExpiredSessions() {
    this.logger.log('Starting cleanup of expired sessions');

    const now = new Date();

    const expiredSessions = await this.sessionRepo.find({
      where: {
        status: 'active',
        expiresAt: LessThan(now),
      },
    });

    for (const session of expiredSessions) {
      session.status = 'expired';
      await this.sessionRepo.save(session);

      // 释放代理
      this.poolManager.releaseProxy(session.proxyId);

      this.logger.log(`Expired session ${session.id}`);
    }

    this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
  }

  /**
   * 定时任务：检测即将过期的会话并发送警告
   * 每小时执行一次
   */
  @ClusterSafeCron(CronExpression.EVERY_HOUR)
  async detectExpiringSessions() {
    const threshold = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2小时

    const expiringSessions = await this.sessionRepo.find({
      where: {
        status: 'active',
        expiresAt: LessThan(threshold),
      },
    });

    for (const session of expiringSessions) {
      session.status = 'expiring_soon';
      await this.sessionRepo.save(session);

      this.logger.warn(
        `Session ${session.id} is expiring soon (${session.expiresAt.toISOString()})`,
      );

      // ✅ 发送告警通知
      try {
        const hoursUntilExpiry = Math.ceil(
          (session.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60),
        );
        await this.alertService.createAlertHistory({
          ruleId: 'session_expiring_soon',
          userId: session.userId,
          deviceId: session.deviceId,
          ruleName: '会话即将过期',
          ruleType: 'session_expiring',
          alertLevel: 'warning',
          alertTitle: '代理会话即将过期',
          alertMessage: `代理会话 ${session.id} 将在 ${hoursUntilExpiry} 小时后过期（${session.expiresAt.toISOString()}）`,
          triggerMetric: 'session_expiry_hours',
          triggerValue: hoursUntilExpiry,
          thresholdValue: 24, // 24小时阈值
          notificationChannels: [], // 使用默认通知渠道
        });
      } catch (alertError) {
        this.logger.error(`Failed to send session expiring alert: ${alertError.message}`);
      }
    }
  }

  /**
   * 记录续期历史
   */
  private async recordRenewal(
    sessionId: string,
    oldExpiresAt: Date,
    newExpiresAt: Date,
    renewalType: 'manual' | 'auto',
  ): Promise<void> {
    const renewal = this.renewalRepo.create({
      sessionId,
      oldExpiresAt,
      newExpiresAt,
      renewalType,
      extensionSeconds: Math.floor(
        (newExpiresAt.getTime() - oldExpiresAt.getTime()) / 1000,
      ),
    });

    await this.renewalRepo.save(renewal);
  }

  /**
   * 获取会话统计
   */
  async getSessionStats(userId?: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiringSoon: number;
    expiredSessions: number;
    totalRenewals: number;
    avgSessionDuration: number;
  }> {
    const queryBuilder = this.sessionRepo.createQueryBuilder('session');

    if (userId) {
      queryBuilder.where('session.userId = :userId', { userId });
    }

    const [sessions, totalSessions] = await queryBuilder.getManyAndCount();

    const activeSessions = sessions.filter((s) => s.status === 'active').length;
    const expiringSoon = sessions.filter(
      (s) => s.status === 'expiring_soon',
    ).length;
    const expiredSessions = sessions.filter(
      (s) => s.status === 'expired',
    ).length;

    const totalRenewals = sessions.reduce(
      (sum, s) => sum + s.renewalCount,
      0,
    );

    const avgSessionDuration =
      sessions.reduce((sum, s) => {
        const duration = s.expiresAt.getTime() - s.createdAt.getTime();
        return sum + duration;
      }, 0) /
      (totalSessions || 1) /
      1000; // 转换为秒

    return {
      totalSessions,
      activeSessions,
      expiringSoon,
      expiredSessions,
      totalRenewals,
      avgSessionDuration,
    };
  }
}
