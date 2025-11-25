import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  SurveyTemplate,
  SurveyTrigger,
  SurveyResponse,
  SurveyResponseStatus,
  Conversation,
} from '../entities';
import {
  CreateSurveyTemplateDto,
  UpdateSurveyTemplateDto,
  SubmitSurveyResponseDto,
  SendSurveyDto,
  QuerySurveyTemplatesDto,
  QuerySurveyResponsesDto,
  SurveyStats,
  AgentSurveyStats,
} from './dto';

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    @InjectRepository(SurveyTemplate)
    private templateRepository: Repository<SurveyTemplate>,
    @InjectRepository(SurveyResponse)
    private responseRepository: Repository<SurveyResponse>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ========== Template CRUD ==========

  async createTemplate(tenantId: string, dto: CreateSurveyTemplateDto, createdBy: string): Promise<SurveyTemplate> {
    if (dto.isDefault) {
      await this.templateRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const template = this.templateRepository.create({
      ...dto,
      tenantId,
      createdBy,
    });

    return this.templateRepository.save(template);
  }

  async updateTemplate(tenantId: string, templateId: string, dto: UpdateSurveyTemplateDto): Promise<SurveyTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Survey template not found');
    }

    if (dto.isDefault) {
      await this.templateRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const result = await this.templateRepository.delete({ id: templateId, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Survey template not found');
    }
  }

  async getTemplate(tenantId: string, templateId: string): Promise<SurveyTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Survey template not found');
    }

    return template;
  }

  async getTemplates(tenantId: string, query: QuerySurveyTemplatesDto): Promise<{ items: SurveyTemplate[]; total: number }> {
    const { isEnabled, trigger, page = 1, pageSize = 20 } = query;

    const qb = this.templateRepository.createQueryBuilder('template')
      .where('template.tenantId = :tenantId', { tenantId });

    if (isEnabled !== undefined) {
      qb.andWhere('template.isEnabled = :isEnabled', { isEnabled });
    }

    if (trigger) {
      qb.andWhere('template.trigger = :trigger', { trigger });
    }

    qb.orderBy('template.isDefault', 'DESC')
      .addOrderBy('template.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getDefaultTemplate(tenantId: string): Promise<SurveyTemplate | null> {
    return this.templateRepository.findOne({
      where: { tenantId, isDefault: true, isEnabled: true },
    });
  }

  // ========== Survey Sending ==========

  async sendSurvey(tenantId: string, dto: SendSurveyDto): Promise<SurveyResponse> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: dto.conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // 获取模板
    let template: SurveyTemplate | null;
    if (dto.templateId) {
      template = await this.templateRepository.findOne({
        where: { id: dto.templateId, tenantId },
      });
    } else {
      template = await this.getDefaultTemplate(tenantId);
    }

    if (!template) {
      throw new BadRequestException('No survey template available');
    }

    // 检查是否已经发送过调查
    const existingResponse = await this.responseRepository.findOne({
      where: { conversationId: dto.conversationId, status: SurveyResponseStatus.PENDING },
    });

    if (existingResponse) {
      throw new BadRequestException('Survey already sent for this conversation');
    }

    // 创建调查响应
    const now = new Date();
    const expiresAt = new Date(now.getTime() + template.expiresInHours * 60 * 60 * 1000);

    const response = this.responseRepository.create({
      tenantId,
      templateId: template.id,
      conversationId: conversation.id,
      userId: conversation.visitorId,
      agentId: conversation.agentId || '',
      status: SurveyResponseStatus.PENDING,
      sentAt: now,
      expiresAt,
    });

    const savedResponse = await this.responseRepository.save(response);

    // 更新模板发送计数
    await this.templateRepository.increment({ id: template.id }, 'sentCount', 1);

    // 发送调查邀请事件
    this.eventEmitter.emit('survey.sent', {
      surveyResponse: savedResponse,
      template,
      conversation,
    });

    this.logger.log(`Survey sent to conversation ${conversation.id}`);

    return savedResponse;
  }

  // ========== Survey Response ==========

  async submitResponse(tenantId: string, dto: SubmitSurveyResponseDto): Promise<SurveyResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: dto.surveyResponseId, tenantId },
      relations: ['template'],
    });

    if (!response) {
      throw new NotFoundException('Survey response not found');
    }

    if (response.status !== SurveyResponseStatus.PENDING) {
      throw new BadRequestException('Survey already submitted or expired');
    }

    if (new Date() > response.expiresAt) {
      response.status = SurveyResponseStatus.EXPIRED;
      await this.responseRepository.save(response);
      throw new BadRequestException('Survey has expired');
    }

    // 处理答案
    const template = response.template || await this.templateRepository.findOne({
      where: { id: response.templateId },
    });

    if (!template) {
      throw new NotFoundException('Survey template not found');
    }

    const answers = dto.answers.map((a) => {
      const question = template.questions.find((q) => q.id === a.questionId);
      return {
        questionId: a.questionId,
        questionText: question?.text || '',
        type: question?.type || '',
        value: a.value,
        category: question?.category,
      };
    });

    // 计算各类评分
    let overallRating: number | null = null;
    let npsScore: number | null = null;
    const categoryRatings: any = {};
    const selectedTags: string[] = [];

    for (const answer of answers) {
      if (answer.type === 'rating' && answer.category === 'overall') {
        overallRating = Number(answer.value);
      } else if (answer.type === 'nps') {
        npsScore = Number(answer.value);
      } else if (answer.type === 'rating' && answer.category) {
        categoryRatings[answer.category] = Number(answer.value);
      } else if (answer.type === 'tags') {
        selectedTags.push(...(Array.isArray(answer.value) ? answer.value : [answer.value]));
      }
    }

    // 如果没有单独的整体评分，计算分类评分平均值
    if (overallRating === null && Object.keys(categoryRatings).length > 0) {
      const ratings = Object.values(categoryRatings) as number[];
      overallRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }

    const now = new Date();
    response.answers = answers;
    response.overallRating = overallRating ?? 0;
    response.npsScore = npsScore ?? 0;
    response.categoryRatings = Object.keys(categoryRatings).length > 0 ? categoryRatings : {};
    response.selectedTags = selectedTags.length > 0 ? selectedTags : [];
    response.comment = dto.comment ?? '';
    response.status = SurveyResponseStatus.COMPLETED;
    response.completedAt = now;
    response.completionTimeSeconds = Math.floor((now.getTime() - response.sentAt.getTime()) / 1000);

    const savedResponse = await this.responseRepository.save(response);

    // 更新模板完成计数
    await this.templateRepository.increment({ id: template.id }, 'completedCount', 1);

    // 发送调查完成事件
    this.eventEmitter.emit('survey.completed', {
      surveyResponse: savedResponse,
      template,
    });

    this.logger.log(`Survey response submitted for conversation ${response.conversationId}`);

    return savedResponse;
  }

  async skipSurvey(tenantId: string, surveyResponseId: string): Promise<void> {
    const response = await this.responseRepository.findOne({
      where: { id: surveyResponseId, tenantId },
    });

    if (!response) {
      throw new NotFoundException('Survey response not found');
    }

    response.status = SurveyResponseStatus.SKIPPED;
    await this.responseRepository.save(response);
  }

  async getResponses(tenantId: string, query: QuerySurveyResponsesDto): Promise<{ items: SurveyResponse[]; total: number }> {
    const { templateId, agentId, status, startDate, endDate, minRating, maxRating, page = 1, pageSize = 20 } = query;

    const qb = this.responseRepository.createQueryBuilder('response')
      .where('response.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('response.template', 'template');

    if (templateId) {
      qb.andWhere('response.templateId = :templateId', { templateId });
    }

    if (agentId) {
      qb.andWhere('response.agentId = :agentId', { agentId });
    }

    if (status) {
      qb.andWhere('response.status = :status', { status });
    }

    if (startDate) {
      qb.andWhere('response.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('response.createdAt <= :endDate', { endDate });
    }

    if (minRating !== undefined) {
      qb.andWhere('response.overallRating >= :minRating', { minRating });
    }

    if (maxRating !== undefined) {
      qb.andWhere('response.overallRating <= :maxRating', { maxRating });
    }

    qb.orderBy('response.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  // ========== Statistics ==========

  async getStats(tenantId: string, startDate?: string, endDate?: string): Promise<SurveyStats> {
    const baseWhere: any = { tenantId };
    if (startDate && endDate) {
      baseWhere.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const totalSent = await this.responseRepository.count({ where: baseWhere });
    const totalCompleted = await this.responseRepository.count({
      where: { ...baseWhere, status: SurveyResponseStatus.COMPLETED },
    });

    // 平均评分
    const avgRating = await this.responseRepository
      .createQueryBuilder('r')
      .select('AVG(r.overallRating)', 'avg')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: SurveyResponseStatus.COMPLETED })
      .andWhere('r.overallRating IS NOT NULL')
      .getRawOne();

    // 平均 NPS
    const avgNps = await this.responseRepository
      .createQueryBuilder('r')
      .select('AVG(r.npsScore)', 'avg')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: SurveyResponseStatus.COMPLETED })
      .andWhere('r.npsScore IS NOT NULL')
      .getRawOne();

    // NPS 分布
    const npsDistribution = await this.responseRepository
      .createQueryBuilder('r')
      .select([
        'SUM(CASE WHEN r.npsScore >= 9 THEN 1 ELSE 0 END) as promoters',
        'SUM(CASE WHEN r.npsScore >= 7 AND r.npsScore <= 8 THEN 1 ELSE 0 END) as passives',
        'SUM(CASE WHEN r.npsScore <= 6 THEN 1 ELSE 0 END) as detractors',
        'COUNT(*) as total',
      ])
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: SurveyResponseStatus.COMPLETED })
      .andWhere('r.npsScore IS NOT NULL')
      .getRawOne();

    const promoters = parseInt(npsDistribution?.promoters) || 0;
    const passives = parseInt(npsDistribution?.passives) || 0;
    const detractors = parseInt(npsDistribution?.detractors) || 0;
    const npsTotal = parseInt(npsDistribution?.total) || 1;

    // 分类评分平均
    const categoryAvg = await this.responseRepository
      .createQueryBuilder('r')
      .select([
        "AVG((r.categoryRatings->>'responseSpeed')::float) as responseSpeed",
        "AVG((r.categoryRatings->>'professionalism')::float) as professionalism",
        "AVG((r.categoryRatings->>'problemSolving')::float) as problemSolving",
        "AVG((r.categoryRatings->>'attitude')::float) as attitude",
      ])
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: SurveyResponseStatus.COMPLETED })
      .andWhere('r.categoryRatings IS NOT NULL')
      .getRawOne();

    // 评分分布
    const ratingDist = await this.responseRepository
      .createQueryBuilder('r')
      .select('ROUND(r.overallRating) as rating, COUNT(*) as count')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: SurveyResponseStatus.COMPLETED })
      .andWhere('r.overallRating IS NOT NULL')
      .groupBy('ROUND(r.overallRating)')
      .orderBy('rating', 'ASC')
      .getRawMany();

    const ratingTotal = ratingDist.reduce((sum, r) => sum + parseInt(r.count), 0);

    return {
      totalSent,
      totalCompleted,
      completionRate: totalSent > 0 ? (totalCompleted / totalSent) * 100 : 0,
      avgOverallRating: parseFloat(avgRating?.avg) || 0,
      avgNpsScore: parseFloat(avgNps?.avg) || 0,
      npsBreakdown: {
        promoters,
        passives,
        detractors,
        nps: Math.round(((promoters - detractors) / npsTotal) * 100),
      },
      categoryAverages: {
        responseSpeed: parseFloat(categoryAvg?.responsespeed) || 0,
        professionalism: parseFloat(categoryAvg?.professionalism) || 0,
        problemSolving: parseFloat(categoryAvg?.problemsolving) || 0,
        attitude: parseFloat(categoryAvg?.attitude) || 0,
      },
      ratingDistribution: ratingDist.map((r) => ({
        rating: parseInt(r.rating),
        count: parseInt(r.count),
        percentage: ratingTotal > 0 ? (parseInt(r.count) / ratingTotal) * 100 : 0,
      })),
      topTags: [], // TODO: 从 selectedTags JSONB 聚合
      trendData: [], // TODO: 按日期聚合趋势数据
    };
  }

  async getAgentStats(tenantId: string, agentId: string): Promise<AgentSurveyStats> {
    const responses = await this.responseRepository.find({
      where: { tenantId, agentId, status: SurveyResponseStatus.COMPLETED },
    });

    if (responses.length === 0) {
      return {
        agentId,
        totalResponses: 0,
        avgOverallRating: 0,
        avgNpsScore: 0,
        categoryAverages: {
          responseSpeed: 0,
          professionalism: 0,
          problemSolving: 0,
          attitude: 0,
        },
      };
    }

    const totalResponses = responses.length;
    const avgOverallRating = responses.reduce((sum, r) => sum + (r.overallRating || 0), 0) / totalResponses;
    const npsResponses = responses.filter((r) => r.npsScore !== null);
    const avgNpsScore = npsResponses.length > 0
      ? npsResponses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / npsResponses.length
      : 0;

    // 分类评分
    const categoryResponses = responses.filter((r) => r.categoryRatings);
    const categoryAverages = {
      responseSpeed: 0,
      professionalism: 0,
      problemSolving: 0,
      attitude: 0,
    };

    if (categoryResponses.length > 0) {
      for (const r of categoryResponses) {
        if (r.categoryRatings) {
          categoryAverages.responseSpeed += r.categoryRatings.responseSpeed || 0;
          categoryAverages.professionalism += r.categoryRatings.professionalism || 0;
          categoryAverages.problemSolving += r.categoryRatings.problemSolving || 0;
          categoryAverages.attitude += r.categoryRatings.attitude || 0;
        }
      }
      const count = categoryResponses.length;
      categoryAverages.responseSpeed /= count;
      categoryAverages.professionalism /= count;
      categoryAverages.problemSolving /= count;
      categoryAverages.attitude /= count;
    }

    return {
      agentId,
      totalResponses,
      avgOverallRating,
      avgNpsScore,
      categoryAverages,
    };
  }

  // ========== Event Handlers ==========

  @OnEvent('conversation.resolved')
  async handleConversationResolved(payload: { conversation: any }) {
    const { conversation } = payload;

    // 查找适用的调查模板
    const template = await this.templateRepository.findOne({
      where: {
        tenantId: conversation.tenantId,
        trigger: SurveyTrigger.CONVERSATION_RESOLVED,
        isEnabled: true,
      },
      order: { isDefault: 'DESC' },
    });

    if (template) {
      // 延迟发送调查
      setTimeout(async () => {
        try {
          await this.sendSurvey(conversation.tenantId, {
            conversationId: conversation.id,
            templateId: template.id,
          });
        } catch (error) {
          this.logger.warn(`Failed to send survey for conversation ${conversation.id}: ${error.message}`);
        }
      }, template.delaySeconds * 1000);
    }
  }
}
