import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Agent } from '../entities/agent.entity';
import { SatisfactionRating } from '../entities/satisfaction-rating.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(SatisfactionRating)
    private ratingRepo: Repository<SatisfactionRating>,
  ) {}

  async getOverviewStats(tenantId: string, startDate: Date, endDate: Date) {
    const totalConversations = await this.conversationRepo.count({
      where: {
        tenantId,
        createdAt: Between(startDate, endDate),
      },
    });

    const resolvedConversations = await this.conversationRepo.count({
      where: {
        tenantId,
        status: ConversationStatus.RESOLVED,
        resolvedAt: Between(startDate, endDate),
      },
    });

    const avgResponseTime = await this.calculateAvgResponseTime(tenantId, startDate, endDate);
    const avgRating = await this.calculateAvgRating(tenantId, startDate, endDate);

    return {
      totalConversations,
      resolvedConversations,
      resolutionRate: totalConversations > 0 ? (resolvedConversations / totalConversations) * 100 : 0,
      avgResponseTime,
      avgRating,
    };
  }

  async getConversationTrends(tenantId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select("DATE(c.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect(`SUM(CASE WHEN c.status = '${ConversationStatus.RESOLVED}' THEN 1 ELSE 0 END)`, 'resolved')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.created_at >= :startDate', { startDate })
      .groupBy("DATE(c.created_at)")
      .orderBy("DATE(c.created_at)", 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
      resolved: parseInt(r.resolved, 10),
    }));
  }

  async getAgentPerformance(tenantId: string, startDate: Date, endDate: Date) {
    const agents = await this.agentRepo.find({
      where: { tenantId, isActive: true },
    });

    const performance = await Promise.all(
      agents.map(async (agent) => {
        const conversations = await this.conversationRepo.count({
          where: {
            agentId: agent.id,
            createdAt: Between(startDate, endDate),
          },
        });

        const resolved = await this.conversationRepo.count({
          where: {
            agentId: agent.id,
            status: ConversationStatus.RESOLVED,
            resolvedAt: Between(startDate, endDate),
          },
        });

        const avgRating = await this.ratingRepo
          .createQueryBuilder('r')
          .select('AVG(r.rating)', 'avg')
          .where('r.agentId = :agentId', { agentId: agent.id })
          .andWhere('r.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
          .getRawOne();

        return {
          agentId: agent.id,
          agentName: agent.name,
          totalConversations: conversations,
          resolvedConversations: resolved,
          resolutionRate: conversations > 0 ? (resolved / conversations) * 100 : 0,
          avgRating: parseFloat(avgRating?.avg) || 0,
          currentStatus: agent.status,
        };
      }),
    );

    return performance.sort((a, b) => b.totalConversations - a.totalConversations);
  }

  async getRatingDistribution(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('r.rating')
      .orderBy('r.rating', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      rating: r.rating,
      count: parseInt(r.count, 10),
    }));
  }

  async getPeakHours(tenantId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select("EXTRACT(HOUR FROM c.created_at)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.created_at >= :startDate', { startDate })
      .groupBy("EXTRACT(HOUR FROM c.created_at)")
      .orderBy("EXTRACT(HOUR FROM c.created_at)", 'ASC')
      .getRawMany();

    return result.map((r) => ({
      hour: parseInt(r.hour, 10),
      count: parseInt(r.count, 10),
    }));
  }

  private async calculateAvgResponseTime(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select('AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)))', 'avg')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('c.first_response_at IS NOT NULL')
      .getRawOne();

    return parseFloat(result?.avg) || 0;
  }

  private async calculateAvgRating(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result?.avg) || 0;
  }
}
