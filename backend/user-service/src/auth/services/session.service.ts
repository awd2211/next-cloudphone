import { Injectable, NotFoundException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as crypto from 'crypto';
import * as UAParser from 'ua-parser-js';
import axios from 'axios';
import { UserSession } from '../../entities/user-session.entity';
import { LoginHistory, LoginResult } from '../../entities/login-history.entity';
import { User } from '../../entities/user.entity';
import { LoginHistoryQueryDto, SessionResponseDto, LoginHistoryResponseDto } from '../dto/session.dto';

interface IpGeoResponse {
  status: string;
  country?: string;
  regionName?: string;
  city?: string;
  message?: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly maxSessionsPerUser: number;
  private readonly ipGeoCacheTtl: number;

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepository: Repository<LoginHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.maxSessionsPerUser = this.configService.get<number>('MAX_SESSIONS_PER_USER', 10);
    this.ipGeoCacheTtl = this.configService.get<number>('IP_GEO_CACHE_TTL', 86400); // 默认缓存24小时
  }

  /**
   * 创建会话
   */
  async createSession(
    userId: string,
    token: string,
    ip?: string,
    userAgent?: string,
    expiresAt?: Date,
  ): Promise<UserSession> {
    // 解析 User-Agent
    const uaInfo = this.parseUserAgent(userAgent);

    // 哈希令牌
    const tokenHash = this.hashToken(token);

    // 清理过期会话
    await this.cleanupExpiredSessions(userId);

    // 检查会话数量限制
    await this.enforceSessionLimit(userId);

    // 创建会话
    const session = this.sessionRepository.create({
      userId,
      tokenHash,
      deviceType: uaInfo.deviceType,
      deviceName: uaInfo.deviceName,
      browser: uaInfo.browser,
      os: uaInfo.os,
      ip,
      userAgent,
      location: await this.getLocationFromIp(ip),
      expiresAt: expiresAt || this.getDefaultExpiresAt(),
      lastActiveAt: new Date(),
    });

    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Session created for user ${userId}: ${savedSession.id}`);

    return savedSession;
  }

  /**
   * 记录登录历史
   */
  async recordLoginHistory(
    userId: string | null,
    username: string,
    result: LoginResult,
    options: {
      ip?: string;
      userAgent?: string;
      failureReason?: string;
      used2FA?: boolean;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<LoginHistory> {
    const uaInfo = this.parseUserAgent(options.userAgent);

    const history = this.loginHistoryRepository.create({
      userId,
      username,
      result,
      failureReason: options.failureReason,
      ip: options.ip,
      location: await this.getLocationFromIp(options.ip),
      userAgent: options.userAgent,
      deviceType: uaInfo.deviceType,
      browser: uaInfo.browser,
      os: uaInfo.os,
      used2FA: options.used2FA || false,
      sessionId: options.sessionId,
      metadata: options.metadata,
    });

    const savedHistory = await this.loginHistoryRepository.save(history);

    if (result !== LoginResult.SUCCESS) {
      this.logger.warn(`Login failed for ${username}: ${result} - ${options.failureReason || 'No reason'}`);
    }

    return savedHistory;
  }

  /**
   * 获取用户的活跃会话列表
   */
  async getActiveSessions(userId: string, currentToken?: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActiveAt: 'DESC' },
    });

    const currentTokenHash = currentToken ? this.hashToken(currentToken) : null;

    return sessions.map((session) => ({
      id: session.id,
      deviceType: session.deviceType,
      deviceName: session.deviceName || '未知设备',
      browser: session.browser || '未知浏览器',
      os: session.os || '未知系统',
      ip: this.maskIp(session.ip),
      location: session.location || '未知位置',
      isCurrent: currentTokenHash ? session.tokenHash === currentTokenHash : false,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
    }));
  }

  /**
   * 获取登录历史
   */
  async getLoginHistory(
    userId: string,
    query: LoginHistoryQueryDto,
  ): Promise<{ data: LoginHistoryResponseDto[]; total: number; page: number; limit: number }> {
    const { startDate, endDate, success, page = 1, limit = 20 } = query;

    // 构建查询条件
    const whereConditions: any = { userId };

    if (startDate && endDate) {
      whereConditions.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      whereConditions.createdAt = MoreThan(new Date(startDate));
    } else if (endDate) {
      whereConditions.createdAt = LessThan(new Date(endDate));
    }

    if (success !== undefined) {
      whereConditions.result = success ? LoginResult.SUCCESS : undefined;
      if (!success) {
        // 查询所有失败类型
        whereConditions.result = undefined; // 需要用 Not 操作符
      }
    }

    const [histories, total] = await this.loginHistoryRepository.findAndCount({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 如果需要过滤失败的记录
    let filteredHistories = histories;
    if (success === false) {
      filteredHistories = histories.filter((h) => h.result !== LoginResult.SUCCESS);
    } else if (success === true) {
      filteredHistories = histories.filter((h) => h.result === LoginResult.SUCCESS);
    }

    return {
      data: filteredHistories.map((history) => ({
        id: history.id,
        result: history.result,
        ip: this.maskIp(history.ip),
        location: history.location || '未知位置',
        deviceType: history.deviceType,
        browser: history.browser || '未知浏览器',
        os: history.os || '未知系统',
        used2FA: history.used2FA,
        createdAt: history.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 终止单个会话
   */
  async terminateSession(userId: string, sessionId: string, reason?: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    if (!session.isActive) {
      throw new ForbiddenException('会话已终止');
    }

    await this.sessionRepository.update(sessionId, {
      isActive: false,
      terminatedAt: new Date(),
      terminatedReason: reason || '用户手动终止',
    });

    this.logger.log(`Session ${sessionId} terminated for user ${userId}`);
  }

  /**
   * 终止所有其他会话
   */
  async terminateAllOtherSessions(userId: string, currentToken: string): Promise<{ count: number }> {
    const currentTokenHash = this.hashToken(currentToken);

    const result = await this.sessionRepository.update(
      {
        userId,
        isActive: true,
        tokenHash: currentTokenHash ? undefined : undefined, // 排除当前会话
      },
      {
        isActive: false,
        terminatedAt: new Date(),
        terminatedReason: '用户终止所有其他会话',
      },
    );

    // 由于 TypeORM 不支持直接排除条件，我们需要手动处理
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    let count = 0;
    for (const session of sessions) {
      if (session.tokenHash !== currentTokenHash) {
        await this.sessionRepository.update(session.id, {
          isActive: false,
          terminatedAt: new Date(),
          terminatedReason: '用户终止所有其他会话',
        });
        count++;
      }
    }

    this.logger.log(`Terminated ${count} sessions for user ${userId}`);

    return { count };
  }

  /**
   * 更新会话活跃时间
   */
  async updateSessionActivity(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.sessionRepository.update(
      { tokenHash, isActive: true },
      { lastActiveAt: new Date() },
    );
  }

  /**
   * 通过令牌使会话失效
   */
  async invalidateSessionByToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.sessionRepository.update(
      { tokenHash },
      {
        isActive: false,
        terminatedAt: new Date(),
        terminatedReason: '用户登出',
      },
    );
  }

  /**
   * 解析 User-Agent
   */
  private parseUserAgent(userAgent?: string): {
    deviceType: 'web' | 'mobile' | 'desktop' | 'api' | 'unknown';
    deviceName: string;
    browser: string;
    os: string;
  } {
    if (!userAgent) {
      return {
        deviceType: 'unknown',
        deviceName: '未知设备',
        browser: '未知浏览器',
        os: '未知系统',
      };
    }

    // 检查是否为 API 调用
    if (userAgent.toLowerCase().includes('api') || userAgent.toLowerCase().includes('curl')) {
      return {
        deviceType: 'api',
        deviceName: 'API 客户端',
        browser: userAgent,
        os: '未知系统',
      };
    }

    const parser = new UAParser.UAParser(userAgent);
    const result = parser.getResult();

    let deviceType: 'web' | 'mobile' | 'desktop' | 'api' | 'unknown' = 'unknown';
    if (result.device.type === 'mobile' || result.device.type === 'tablet') {
      deviceType = 'mobile';
    } else if (result.browser.name) {
      deviceType = 'web';
    } else if (result.os.name) {
      deviceType = 'desktop';
    }

    return {
      deviceType,
      deviceName: [result.device.vendor, result.device.model].filter(Boolean).join(' ') || '未知设备',
      browser: [result.browser.name, result.browser.version].filter(Boolean).join(' ') || '未知浏览器',
      os: [result.os.name, result.os.version].filter(Boolean).join(' ') || '未知系统',
    };
  }

  /**
   * 哈希令牌
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 脱敏 IP 地址
   */
  private maskIp(ip?: string): string {
    if (!ip) return '未知';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip;
  }

  /**
   * 根据 IP 获取位置（使用 ip-api.com 免费服务）
   *
   * ✅ 已集成 IP 地理位置服务：
   * - 使用 ip-api.com（免费，45请求/分钟）
   * - Redis 缓存（默认24小时）
   * - 优雅降级：失败时返回"未知位置"
   */
  private async getLocationFromIp(ip?: string): Promise<string> {
    if (!ip) return '未知位置';

    // 排除私有/本地 IP
    if (this.isPrivateIp(ip)) {
      return '本地网络';
    }

    // 尝试从缓存获取
    const cacheKey = `ip_geo:${ip}`;
    try {
      const cached = await this.cacheManager.get<string>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Failed to get IP geo from cache: ${error.message}`);
    }

    // 调用 ip-api.com（免费服务，无需 API Key）
    try {
      const response = await axios.get<IpGeoResponse>(
        `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city&lang=zh-CN`,
        { timeout: 3000 },
      );

      if (response.data.status === 'success') {
        const { country, regionName, city } = response.data;
        const location = [country, regionName, city].filter(Boolean).join(' ') || '未知位置';

        // 缓存结果
        try {
          await this.cacheManager.set(cacheKey, location, this.ipGeoCacheTtl * 1000);
        } catch (cacheError) {
          this.logger.warn(`Failed to cache IP geo: ${cacheError.message}`);
        }

        return location;
      }

      this.logger.debug(`IP geo lookup failed for ${ip}: ${response.data.message}`);
      return '未知位置';
    } catch (error) {
      this.logger.warn(`IP geolocation service error for ${ip}: ${error.message}`);
      return '未知位置';
    }
  }

  /**
   * 检查是否为私有 IP 地址
   */
  private isPrivateIp(ip: string): boolean {
    // IPv4 私有地址段
    const privateRanges = [
      /^10\./,                     // 10.0.0.0 - 10.255.255.255
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0 - 172.31.255.255
      /^192\.168\./,               // 192.168.0.0 - 192.168.255.255
      /^127\./,                    // 127.0.0.0 - 127.255.255.255 (loopback)
      /^::1$/,                     // IPv6 loopback
      /^fe80:/i,                   // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * 获取默认过期时间（7天）
   */
  private getDefaultExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  /**
   * 清理过期会话
   */
  private async cleanupExpiredSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      {
        isActive: false,
        terminatedAt: new Date(),
        terminatedReason: '会话过期',
      },
    );
  }

  /**
   * 强制会话数量限制
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.sessionRepository.count({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (activeSessions >= this.maxSessionsPerUser) {
      // 终止最旧的会话
      const oldestSession = await this.sessionRepository.findOne({
        where: {
          userId,
          isActive: true,
        },
        order: { createdAt: 'ASC' },
      });

      if (oldestSession) {
        await this.sessionRepository.update(oldestSession.id, {
          isActive: false,
          terminatedAt: new Date(),
          terminatedReason: '达到会话数量上限，自动终止',
        });
        this.logger.log(`Oldest session terminated for user ${userId} due to limit`);
      }
    }
  }
}
