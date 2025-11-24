import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import {
  VisitorProfile,
  VisitorEvent,
  VisitorSource,
  VisitorEventType,
  Conversation,
  SatisfactionRating,
} from '../entities';
import {
  CreateVisitorProfileDto,
  UpdateVisitorProfileDto,
  TrackEventDto,
  QueryVisitorProfilesDto,
  QueryVisitorEventsDto,
  VisitorStats,
  VisitorTimeline,
} from './dto';

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);

  constructor(
    @InjectRepository(VisitorProfile)
    private profileRepository: Repository<VisitorProfile>,
    @InjectRepository(VisitorEvent)
    private eventRepository: Repository<VisitorEvent>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(SatisfactionRating)
    private ratingRepository: Repository<SatisfactionRating>,
  ) {}

  // ========== Profile Management ==========

  async createOrUpdateProfile(tenantId: string, dto: CreateVisitorProfileDto, ipAddress?: string): Promise<VisitorProfile> {
    let profile = await this.profileRepository.findOne({
      where: { tenantId, visitorId: dto.visitorId },
    });

    const now = new Date();

    if (profile) {
      // 更新现有访客
      profile.lastVisitAt = now;
      profile.totalVisits += 1;

      if (dto.deviceInfo) {
        profile.deviceInfo = { ...profile.deviceInfo, ...dto.deviceInfo };
      }
      if (dto.geoInfo) {
        profile.geoInfo = { ...profile.geoInfo, ...dto.geoInfo };
      }
      if (dto.customAttributes) {
        profile.customAttributes = { ...profile.customAttributes, ...dto.customAttributes };
      }
    } else {
      // 创建新访客
      profile = this.profileRepository.create({
        tenantId,
        visitorId: dto.visitorId,
        displayName: dto.displayName,
        email: dto.email,
        phone: dto.phone,
        avatar: dto.avatar,
        source: dto.source || VisitorSource.DIRECT,
        sourceDetail: dto.sourceDetail,
        initialUrl: dto.initialUrl,
        firstVisitAt: now,
        lastVisitAt: now,
        totalVisits: 1,
        deviceInfo: dto.deviceInfo,
        geoInfo: dto.geoInfo,
        customAttributes: dto.customAttributes,
      });
    }

    return this.profileRepository.save(profile);
  }

  async updateProfile(tenantId: string, profileId: string, dto: UpdateVisitorProfileDto): Promise<VisitorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Visitor profile not found');
    }

    if (dto.manualTags) {
      profile.manualTags = dto.manualTags;
    }
    if (dto.customAttributes) {
      profile.customAttributes = { ...profile.customAttributes, ...dto.customAttributes };
    }

    Object.assign(profile, {
      displayName: dto.displayName ?? profile.displayName,
      email: dto.email ?? profile.email,
      phone: dto.phone ?? profile.phone,
      intentLevel: dto.intentLevel ?? profile.intentLevel,
      valueLevel: dto.valueLevel ?? profile.valueLevel,
      notes: dto.notes ?? profile.notes,
    });

    return this.profileRepository.save(profile);
  }

  async addTags(tenantId: string, profileId: string, tags: string[]): Promise<VisitorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Visitor profile not found');
    }

    profile.manualTags = [...new Set([...profile.manualTags, ...tags])];
    return this.profileRepository.save(profile);
  }

  async removeTags(tenantId: string, profileId: string, tags: string[]): Promise<VisitorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Visitor profile not found');
    }

    profile.manualTags = profile.manualTags.filter((t) => !tags.includes(t));
    return this.profileRepository.save(profile);
  }

  async getProfile(tenantId: string, profileId: string): Promise<VisitorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Visitor profile not found');
    }

    return profile;
  }

  async getProfileByVisitorId(tenantId: string, visitorId: string): Promise<VisitorProfile | null> {
    return this.profileRepository.findOne({
      where: { tenantId, visitorId },
    });
  }

  async getProfiles(tenantId: string, query: QueryVisitorProfilesDto): Promise<{ items: VisitorProfile[]; total: number }> {
    const {
      search, source, valueLevel, tags, isBlocked,
      startDate, endDate, page = 1, pageSize = 20,
      sortBy = 'lastVisitAt', sortOrder = 'DESC',
    } = query;

    const qb = this.profileRepository.createQueryBuilder('profile')
      .where('profile.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(profile.displayName ILIKE :search OR profile.email ILIKE :search OR profile.phone ILIKE :search OR profile.visitorId ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (source) {
      qb.andWhere('profile.source = :source', { source });
    }

    if (valueLevel) {
      qb.andWhere('profile.valueLevel = :valueLevel', { valueLevel });
    }

    if (tags?.length) {
      qb.andWhere(
        '(profile.autoTags ?| :tags OR profile.manualTags ?| :tags)',
        { tags },
      );
    }

    if (isBlocked !== undefined) {
      qb.andWhere('profile.isBlocked = :isBlocked', { isBlocked });
    }

    if (startDate) {
      qb.andWhere('profile.lastVisitAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('profile.lastVisitAt <= :endDate', { endDate });
    }

    qb.orderBy(`profile.${sortBy}`, sortOrder)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  // ========== Event Tracking ==========

  async trackEvent(tenantId: string, dto: TrackEventDto, ipAddress?: string): Promise<VisitorEvent> {
    // 确保访客存在
    let profile = await this.getProfileByVisitorId(tenantId, dto.visitorId);

    if (!profile) {
      profile = await this.createOrUpdateProfile(tenantId, {
        visitorId: dto.visitorId,
        deviceInfo: dto.deviceInfo,
      }, ipAddress);
    } else {
      // 更新最后访问时间
      profile.lastVisitAt = new Date();
      await this.profileRepository.save(profile);
    }

    const event = this.eventRepository.create({
      tenantId,
      visitorProfileId: profile.id,
      sessionId: dto.sessionId,
      eventType: dto.eventType,
      eventName: dto.eventName,
      pageUrl: dto.pageUrl,
      pageTitle: dto.pageTitle,
      referrer: dto.referrer,
      eventData: dto.eventData,
      duration: dto.duration,
      deviceInfo: dto.deviceInfo,
      ipAddress,
    });

    return this.eventRepository.save(event);
  }

  async getEvents(tenantId: string, query: QueryVisitorEventsDto): Promise<{ items: VisitorEvent[]; total: number }> {
    const { visitorProfileId, sessionId, eventType, startDate, endDate, page = 1, pageSize = 50 } = query;

    const qb = this.eventRepository.createQueryBuilder('event')
      .where('event.tenantId = :tenantId', { tenantId });

    if (visitorProfileId) {
      qb.andWhere('event.visitorProfileId = :visitorProfileId', { visitorProfileId });
    }

    if (sessionId) {
      qb.andWhere('event.sessionId = :sessionId', { sessionId });
    }

    if (eventType) {
      qb.andWhere('event.eventType = :eventType', { eventType });
    }

    if (startDate) {
      qb.andWhere('event.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('event.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  // ========== Timeline ==========

  async getVisitorTimeline(tenantId: string, profileId: string): Promise<VisitorTimeline> {
    const profile = await this.getProfile(tenantId, profileId);

    // 获取最近事件
    const events = await this.eventRepository.find({
      where: { tenantId, visitorProfileId: profileId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    // 获取会话记录
    const conversations = await this.conversationRepository.find({
      where: { tenantId, visitorId: profile.visitorId },
      relations: ['agent', 'ratings'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.eventType,
        eventName: e.eventName,
        pageUrl: e.pageUrl,
        pageTitle: e.pageTitle,
        eventData: e.eventData,
        duration: e.duration,
        createdAt: e.createdAt.toISOString(),
      })),
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        agentName: c.agent?.displayName,
        messageCount: c.messageCount || 0,
        satisfactionScore: c.ratings?.[0]?.rating,
        createdAt: c.createdAt.toISOString(),
        resolvedAt: c.resolvedAt?.toISOString(),
      })),
    };
  }

  // ========== Statistics ==========

  async getStats(tenantId: string): Promise<VisitorStats> {
    const totalVisitors = await this.profileRepository.count({ where: { tenantId } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newVisitorsToday = await this.profileRepository.count({
      where: {
        tenantId,
        firstVisitAt: Between(today, new Date()),
      },
    });

    const returningVisitors = await this.profileRepository.count({
      where: {
        tenantId,
        totalVisits: In([2, 3, 4, 5, 6, 7, 8, 9, 10]), // 简化查询
      },
    });

    // 平均会话数
    const avgConversations = await this.profileRepository
      .createQueryBuilder('p')
      .select('AVG(p.totalConversations)', 'avg')
      .where('p.tenantId = :tenantId', { tenantId })
      .getRawOne();

    // 平均满意度
    const avgSatisfaction = await this.profileRepository
      .createQueryBuilder('p')
      .select('AVG(p.avgSatisfactionScore)', 'avg')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.avgSatisfactionScore IS NOT NULL')
      .getRawOne();

    // 来源分布
    const sourceDistribution = await this.profileRepository
      .createQueryBuilder('p')
      .select('p.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('p.tenantId = :tenantId', { tenantId })
      .groupBy('p.source')
      .getRawMany();

    const sourceTotal = sourceDistribution.reduce((sum, s) => sum + parseInt(s.count), 0);

    // 价值等级分布
    const valueLevelDistribution = await this.profileRepository
      .createQueryBuilder('p')
      .select('p.valueLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.valueLevel IS NOT NULL')
      .groupBy('p.valueLevel')
      .getRawMany();

    return {
      totalVisitors,
      newVisitorsToday,
      returningVisitors,
      avgConversationsPerVisitor: parseFloat(avgConversations?.avg) || 0,
      avgSatisfactionScore: parseFloat(avgSatisfaction?.avg) || 0,
      sourceDistribution: sourceDistribution.map((s) => ({
        source: s.source,
        count: parseInt(s.count),
        percentage: sourceTotal > 0 ? (parseInt(s.count) / sourceTotal) * 100 : 0,
      })),
      valueLevelDistribution: valueLevelDistribution.map((v) => ({
        level: v.level || 'unset',
        count: parseInt(v.count),
      })),
      topTags: [], // TODO: 从 JSONB 聚合
      deviceDistribution: [], // TODO: 从 deviceInfo 聚合
      geoDistribution: [], // TODO: 从 geoInfo 聚合
    };
  }

  // ========== Event Handlers ==========

  @OnEvent('conversation.created')
  async handleConversationCreated(payload: { conversation: any }) {
    const { conversation } = payload;

    const profile = await this.getProfileByVisitorId(conversation.tenantId, conversation.visitorId);
    if (profile) {
      profile.totalConversations += 1;
      profile.lastVisitAt = new Date();
      await this.profileRepository.save(profile);

      // 记录会话开始事件
      await this.trackEvent(conversation.tenantId, {
        visitorId: conversation.visitorId,
        sessionId: conversation.id,
        eventType: VisitorEventType.CHAT_START,
        eventData: { conversationId: conversation.id },
      });
    }
  }

  @OnEvent('conversation.resolved')
  async handleConversationResolved(payload: { conversation: any }) {
    const { conversation } = payload;

    const profile = await this.getProfileByVisitorId(conversation.tenantId, conversation.visitorId);
    if (profile) {
      // 记录会话结束事件
      await this.trackEvent(conversation.tenantId, {
        visitorId: conversation.visitorId,
        sessionId: conversation.id,
        eventType: VisitorEventType.CHAT_END,
        eventData: {
          conversationId: conversation.id,
          resolution: 'resolved',
        },
      });
    }
  }

  @OnEvent('survey.completed')
  async handleSurveyCompleted(payload: { surveyResponse: any }) {
    const { surveyResponse } = payload;

    // 更新访客平均满意度
    const profile = await this.getProfileByVisitorId(surveyResponse.tenantId, surveyResponse.userId);
    if (profile && surveyResponse.overallRating) {
      const ratings = await this.ratingRepository.find({
        where: { tenantId: surveyResponse.tenantId, userId: surveyResponse.userId },
      });

      if (ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        profile.avgSatisfactionScore = avg;
        await this.profileRepository.save(profile);
      }
    }
  }

  // ========== Auto Tagging ==========

  async applyAutoTags(tenantId: string, profileId: string): Promise<void> {
    const profile = await this.getProfile(tenantId, profileId);
    const autoTags: string[] = [];

    // 基于访问频率
    if (profile.totalVisits >= 10) {
      autoTags.push('frequent_visitor');
    }

    // 基于会话数
    if (profile.totalConversations >= 5) {
      autoTags.push('active_chatter');
    }

    // 基于满意度
    if (profile.avgSatisfactionScore && profile.avgSatisfactionScore >= 4.5) {
      autoTags.push('satisfied');
    } else if (profile.avgSatisfactionScore && profile.avgSatisfactionScore <= 2) {
      autoTags.push('needs_attention');
    }

    // 基于来源
    if (profile.source === VisitorSource.AD) {
      autoTags.push('from_ad');
    }

    profile.autoTags = [...new Set([...profile.autoTags, ...autoTags])];
    await this.profileRepository.save(profile);
  }
}
