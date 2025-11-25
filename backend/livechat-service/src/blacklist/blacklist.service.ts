/**
 * 黑名单服务
 *
 * 提供访客封禁管理功能，支持 IP、设备、用户等多种封禁方式
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventBusService, UnifiedCacheService } from '@cloudphone/shared';

import { Blacklist, BlacklistType, BlacklistStatus } from '../entities/blacklist.entity';
import {
  CreateBlacklistDto,
  UpdateBlacklistDto,
  RevokeBlacklistDto,
  SearchBlacklistDto,
  CheckBlacklistDto,
} from './dto';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(
    @InjectRepository(Blacklist)
    private blacklistRepo: Repository<Blacklist>,

    private cacheService: UnifiedCacheService,

    private eventBus: EventBusService,
  ) {}

  /**
   * 检查是否在黑名单中
   */
  async isBlacklisted(dto: CheckBlacklistDto, tenantId: string): Promise<boolean> {
    const cacheKey = `blacklist:${tenantId}:${dto.type}:${dto.value}`;
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const entry = await this.blacklistRepo.findOne({
      where: {
        tenantId,
        type: dto.type,
        value: dto.value,
        status: BlacklistStatus.ACTIVE,
      },
    });

    // 检查是否已过期
    const isBlacklisted = !!(entry && (entry.isPermanent || !entry.expiresAt || entry.expiresAt > new Date()));

    await this.cacheService.set(cacheKey, isBlacklisted, 60); // 1分钟缓存
    return isBlacklisted;
  }

  /**
   * 搜索黑名单
   */
  async search(
    query: SearchBlacklistDto,
    tenantId: string,
  ): Promise<{ items: Blacklist[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = query;

    const qb = this.blacklistRepo.createQueryBuilder('bl');
    qb.where('bl.tenantId = :tenantId', { tenantId });

    if (query.keyword) {
      qb.andWhere('bl.value ILIKE :keyword', { keyword: `%${query.keyword}%` });
    }

    if (query.type) {
      qb.andWhere('bl.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('bl.status = :status', { status: query.status });
    }

    qb.orderBy('bl.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 获取黑名单详情
   */
  async getById(id: string, tenantId: string): Promise<Blacklist> {
    const entry = await this.blacklistRepo.findOne({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundException('黑名单记录不存在');
    }

    return entry;
  }

  /**
   * 添加到黑名单
   */
  async create(dto: CreateBlacklistDto, tenantId: string, userId: string): Promise<Blacklist> {
    // 检查是否已存在
    const existing = await this.blacklistRepo.findOne({
      where: {
        tenantId,
        type: dto.type,
        value: dto.value,
        status: BlacklistStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException('该项已在黑名单中');
    }

    const entry = this.blacklistRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    const saved = await this.blacklistRepo.save(entry);

    // 清除缓存
    await this.clearCache(tenantId, dto.type, dto.value);

    // 发送事件
    await this.eventBus.publish('cloudphone.events', 'livechat.blacklist_added', {
      blacklistId: saved.id,
      type: dto.type,
      value: dto.value,
      tenantId,
      userId,
    });

    this.logger.log(`Blacklist added: ${dto.type}:${dto.value} by user ${userId}`);
    return saved;
  }

  /**
   * 批量添加黑名单
   */
  async createBatch(
    items: CreateBlacklistDto[],
    tenantId: string,
    userId: string,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const dto of items) {
      try {
        await this.create(dto, tenantId, userId);
        created++;
      } catch {
        skipped++;
      }
    }

    return { created, skipped };
  }

  /**
   * 更新黑名单
   */
  async update(
    id: string,
    dto: UpdateBlacklistDto,
    tenantId: string,
    userId: string,
  ): Promise<Blacklist> {
    const entry = await this.getById(id, tenantId);

    Object.assign(entry, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : entry.expiresAt,
    });

    const saved = await this.blacklistRepo.save(entry);

    // 清除缓存
    await this.clearCache(tenantId, entry.type, entry.value);

    this.logger.log(`Blacklist updated: ${id} by user ${userId}`);
    return saved;
  }

  /**
   * 撤销黑名单
   */
  async revoke(
    id: string,
    dto: RevokeBlacklistDto,
    tenantId: string,
    userId: string,
  ): Promise<Blacklist> {
    const entry = await this.getById(id, tenantId);

    if (entry.status !== BlacklistStatus.ACTIVE) {
      throw new BadRequestException('该黑名单已不是激活状态');
    }

    entry.status = BlacklistStatus.REVOKED;
    entry.revokedBy = userId;
    entry.revokedAt = new Date();
    entry.revokeReason = dto.reason ?? '';

    const saved = await this.blacklistRepo.save(entry);

    // 清除缓存
    await this.clearCache(tenantId, entry.type, entry.value);

    // 发送事件
    await this.eventBus.publish('cloudphone.events', 'livechat.blacklist_revoked', {
      blacklistId: saved.id,
      type: entry.type,
      value: entry.value,
      tenantId,
      userId,
    });

    this.logger.log(`Blacklist revoked: ${id} by user ${userId}`);
    return saved;
  }

  /**
   * 删除黑名单（硬删除）
   */
  async delete(id: string, tenantId: string, userId: string): Promise<void> {
    const entry = await this.getById(id, tenantId);

    await this.blacklistRepo.remove(entry);

    // 清除缓存
    await this.clearCache(tenantId, entry.type, entry.value);

    this.logger.log(`Blacklist deleted: ${id} by user ${userId}`);
  }

  /**
   * 记录拦截
   */
  async recordBlock(type: BlacklistType, value: string, tenantId: string): Promise<void> {
    await this.blacklistRepo.update(
      { tenantId, type, value, status: BlacklistStatus.ACTIVE },
      {
        blockCount: () => 'block_count + 1',
        lastBlockedAt: new Date(),
      },
    );
  }

  /**
   * 获取统计信息
   */
  async getStats(tenantId: string): Promise<any> {
    const typeStats = await this.blacklistRepo
      .createQueryBuilder('bl')
      .select('bl.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('bl.tenantId = :tenantId', { tenantId })
      .andWhere('bl.status = :status', { status: BlacklistStatus.ACTIVE })
      .groupBy('bl.type')
      .getRawMany();

    const total = await this.blacklistRepo.count({
      where: { tenantId, status: BlacklistStatus.ACTIVE },
    });

    const totalBlocks = await this.blacklistRepo
      .createQueryBuilder('bl')
      .select('SUM(bl.blockCount)', 'total')
      .where('bl.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const recentBlocks = await this.blacklistRepo.find({
      where: {
        tenantId,
        status: BlacklistStatus.ACTIVE,
        lastBlockedAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
      order: { lastBlockedAt: 'DESC' },
      take: 10,
    });

    return {
      total,
      byType: typeStats.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count, 10);
        return acc;
      }, {}),
      totalBlocks: parseInt(totalBlocks?.total || '0', 10),
      recentBlocks,
    };
  }

  /**
   * 清除缓存
   */
  private async clearCache(tenantId: string, type: BlacklistType, value: string): Promise<void> {
    await this.cacheService.del(`blacklist:${tenantId}:${type}:${value}`);
  }

  /**
   * 定时任务：处理过期黑名单
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredBlacklist(): Promise<void> {
    const result = await this.blacklistRepo.update(
      {
        status: BlacklistStatus.ACTIVE,
        isPermanent: false,
        expiresAt: LessThan(new Date()),
      },
      { status: BlacklistStatus.EXPIRED },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} blacklist entries`);
    }
  }
}
