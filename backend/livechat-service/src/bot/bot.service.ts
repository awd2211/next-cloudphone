import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  Bot,
  BotIntent,
  BotConversation,
  BotConversationStatus,
  IntentMatchType,
  IntentResponseType,
  Conversation,
  Message,
  KnowledgeArticle,
} from '../entities';
import {
  CreateBotDto,
  UpdateBotDto,
  CreateIntentDto,
  UpdateIntentDto,
  BotMessageDto,
  TransferToAgentDto,
  BotFeedbackDto,
  QueryBotsDto,
  QueryBotConversationsDto,
  BotResponse,
  BotStats,
} from './dto';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    @InjectRepository(BotIntent)
    private intentRepository: Repository<BotIntent>,
    @InjectRepository(BotConversation)
    private botConversationRepository: Repository<BotConversation>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(KnowledgeArticle)
    private knowledgeRepository: Repository<KnowledgeArticle>,
    @InjectRedis() private redis: Redis,
    private eventEmitter: EventEmitter2,
  ) {}

  // ========== Bot CRUD ==========

  async createBot(tenantId: string, dto: CreateBotDto, createdBy: string): Promise<Bot> {
    // 如果设置为默认，先取消其他默认
    if (dto.isDefault) {
      await this.botRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const bot = this.botRepository.create({
      ...dto,
      tenantId,
      createdBy,
    });

    return this.botRepository.save(bot);
  }

  async updateBot(tenantId: string, botId: string, dto: UpdateBotDto): Promise<Bot> {
    const bot = await this.botRepository.findOne({
      where: { id: botId, tenantId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // 如果设置为默认，先取消其他默认
    if (dto.isDefault) {
      await this.botRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(bot, dto);
    return this.botRepository.save(bot);
  }

  async deleteBot(tenantId: string, botId: string): Promise<void> {
    const result = await this.botRepository.delete({ id: botId, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Bot not found');
    }
  }

  async getBot(tenantId: string, botId: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({
      where: { id: botId, tenantId },
      relations: ['intents'],
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return bot;
  }

  async getBots(tenantId: string, query: QueryBotsDto): Promise<{ items: Bot[]; total: number }> {
    const { isEnabled, page = 1, pageSize = 20 } = query;

    const qb = this.botRepository.createQueryBuilder('bot')
      .where('bot.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('bot.intents', 'intents');

    if (isEnabled !== undefined) {
      qb.andWhere('bot.isEnabled = :isEnabled', { isEnabled });
    }

    qb.orderBy('bot.isDefault', 'DESC')
      .addOrderBy('bot.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getDefaultBot(tenantId: string): Promise<Bot | null> {
    return this.botRepository.findOne({
      where: { tenantId, isDefault: true, isEnabled: true },
      relations: ['intents'],
    });
  }

  // ========== Intent CRUD ==========

  async createIntent(tenantId: string, botId: string, dto: CreateIntentDto): Promise<BotIntent> {
    const bot = await this.botRepository.findOne({ where: { id: botId, tenantId } });
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const intent = this.intentRepository.create({
      ...dto,
      botId,
    });

    return this.intentRepository.save(intent);
  }

  async updateIntent(tenantId: string, intentId: string, dto: UpdateIntentDto): Promise<BotIntent> {
    const intent = await this.intentRepository.findOne({
      where: { id: intentId },
      relations: ['bot'],
    });

    if (!intent || intent.bot.tenantId !== tenantId) {
      throw new NotFoundException('Intent not found');
    }

    Object.assign(intent, dto);
    return this.intentRepository.save(intent);
  }

  async deleteIntent(tenantId: string, intentId: string): Promise<void> {
    const intent = await this.intentRepository.findOne({
      where: { id: intentId },
      relations: ['bot'],
    });

    if (!intent || intent.bot.tenantId !== tenantId) {
      throw new NotFoundException('Intent not found');
    }

    await this.intentRepository.delete(intentId);
  }

  async getIntents(tenantId: string, botId: string): Promise<BotIntent[]> {
    const bot = await this.botRepository.findOne({ where: { id: botId, tenantId } });
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return this.intentRepository.find({
      where: { botId },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  // ========== Core Bot Logic ==========

  /**
   * 处理用户消息，返回机器人回复
   */
  async processMessage(
    tenantId: string,
    dto: BotMessageDto,
    userId: string,
  ): Promise<BotResponse> {
    const { conversationId, content } = dto;

    // 获取或创建机器人会话记录
    let botConversation = await this.botConversationRepository.findOne({
      where: { conversationId },
      relations: ['bot'],
    });

    if (!botConversation) {
      // 获取默认机器人
      const bot = await this.getDefaultBot(tenantId);
      if (!bot) {
        throw new BadRequestException('No bot configured for this tenant');
      }

      botConversation = this.botConversationRepository.create({
        tenantId,
        botId: bot.id,
        conversationId,
        userId,
        status: BotConversationStatus.BOT_HANDLING,
        lastActivityAt: new Date(),
      });
      await this.botConversationRepository.save(botConversation);
    }

    // 如果已转人工，不再处理
    if (botConversation.status === BotConversationStatus.TRANSFERRED) {
      return {
        type: 'text',
        content: '',
      };
    }

    const bot = botConversation.bot || await this.botRepository.findOne({
      where: { id: botConversation.botId },
      relations: ['intents'],
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // 更新会话统计
    botConversation.userMessageCount += 1;
    botConversation.lastActivityAt = new Date();

    // 检查是否超过最大轮数
    if (botConversation.botRounds >= bot.maxBotRounds) {
      return this.triggerTransfer(botConversation, 'max_rounds_exceeded');
    }

    // 意图识别
    const matchResult = await this.matchIntent(bot, content, botConversation);

    if (matchResult) {
      // 记录命中的意图
      botConversation.matchedIntents = [
        ...botConversation.matchedIntents,
        {
          intentId: matchResult.intent.id,
          intentName: matchResult.intent.name,
          userMessage: content,
          matchedAt: new Date(),
          confidence: matchResult.confidence,
        },
      ];

      // 更新意图命中次数
      await this.intentRepository.increment({ id: matchResult.intent.id }, 'hitCount', 1);

      // 处理后置动作
      if (matchResult.intent.postActions) {
        if (matchResult.intent.postActions.setSessionTags) {
          botConversation.sessionTags = [
            ...new Set([...botConversation.sessionTags, ...matchResult.intent.postActions.setSessionTags]),
          ];
        }
      }

      // 根据回复类型生成响应
      const response = await this.generateResponse(bot, matchResult.intent, tenantId);

      botConversation.botRounds += 1;
      await this.botConversationRepository.save(botConversation);

      // 如果是转人工类型
      if (matchResult.intent.responseType === IntentResponseType.TRANSFER) {
        return this.triggerTransfer(botConversation, 'user_requested');
      }

      // 发送机器人消息事件
      this.eventEmitter.emit('bot.message', {
        conversationId,
        botId: bot.id,
        content: response.content,
        responseType: response.type,
        quickReplies: response.quickReplies,
      });

      return response;
    }

    // 无法识别意图，返回兜底回复
    botConversation.botRounds += 1;
    await this.botConversationRepository.save(botConversation);

    this.eventEmitter.emit('bot.message', {
      conversationId,
      botId: bot.id,
      content: bot.fallbackMessage,
      responseType: 'fallback',
    });

    return {
      type: 'text',
      content: bot.fallbackMessage,
    };
  }

  /**
   * 意图匹配
   */
  private async matchIntent(
    bot: Bot,
    userMessage: string,
    botConversation: BotConversation,
  ): Promise<{ intent: BotIntent; confidence: number } | null> {
    const intents = bot.intents?.filter((i) => i.isEnabled) ||
      await this.intentRepository.find({
        where: { botId: bot.id, isEnabled: true },
        order: { priority: 'DESC' },
      });

    const normalizedMessage = userMessage.toLowerCase().trim();

    for (const intent of intents) {
      // 检查上下文条件
      if (intent.contextConditions) {
        const { previousIntent, sessionTags } = intent.contextConditions;

        if (previousIntent) {
          const lastIntent = botConversation.matchedIntents[botConversation.matchedIntents.length - 1];
          if (!lastIntent || lastIntent.intentName !== previousIntent) {
            continue;
          }
        }

        if (sessionTags?.length) {
          const hasAllTags = sessionTags.every((tag) => botConversation.sessionTags.includes(tag));
          if (!hasAllTags) {
            continue;
          }
        }
      }

      // 根据匹配类型进行匹配
      let matched = false;
      let confidence = 1.0;

      switch (intent.matchType) {
        case IntentMatchType.KEYWORD:
          matched = intent.matchRules.some((keyword) =>
            normalizedMessage.includes(keyword.toLowerCase()),
          );
          break;

        case IntentMatchType.EXACT:
          matched = intent.matchRules.some((rule) =>
            normalizedMessage === rule.toLowerCase(),
          );
          break;

        case IntentMatchType.REGEX:
          for (const pattern of intent.matchRules) {
            try {
              const regex = new RegExp(pattern, 'i');
              if (regex.test(userMessage)) {
                matched = true;
                break;
              }
            } catch (e) {
              this.logger.warn(`Invalid regex pattern: ${pattern}`);
            }
          }
          break;

        case IntentMatchType.SIMILARITY:
          const similarity = this.calculateSimilarity(normalizedMessage, intent.matchRules);
          if (similarity >= intent.similarityThreshold) {
            matched = true;
            confidence = similarity;
          }
          break;
      }

      if (matched) {
        return { intent, confidence };
      }
    }

    return null;
  }

  /**
   * 计算字符串相似度（简单的 Jaccard 相似度）
   */
  private calculateSimilarity(input: string, examples: string[]): number {
    const inputWords = new Set(input.split(/\s+/));
    let maxSimilarity = 0;

    for (const example of examples) {
      const exampleWords = new Set(example.toLowerCase().split(/\s+/));
      const intersection = new Set([...inputWords].filter((x) => exampleWords.has(x)));
      const union = new Set([...inputWords, ...exampleWords]);
      const similarity = intersection.size / union.size;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * 生成回复
   */
  private async generateResponse(
    bot: Bot,
    intent: BotIntent,
    tenantId: string,
  ): Promise<BotResponse> {
    const responseContent = intent.responseContent;

    // 如果有多个备选回复，随机选择
    let content = responseContent;
    if (intent.alternativeResponses?.length) {
      const allResponses = [responseContent, ...intent.alternativeResponses];
      content = allResponses[Math.floor(Math.random() * allResponses.length)];
    }

    switch (intent.responseType) {
      case IntentResponseType.TEXT:
        return {
          type: 'text',
          content: typeof content === 'string' ? content : content.text,
        };

      case IntentResponseType.QUICK_REPLIES:
        return {
          type: 'quick_replies',
          content: content.text,
          quickReplies: content.quickReplies,
        };

      case IntentResponseType.CARD:
        return {
          type: 'card',
          content: content.title,
          card: {
            title: content.title,
            description: content.description,
            image: content.image,
            buttons: content.buttons,
          },
        };

      case IntentResponseType.KNOWLEDGE_BASE:
        // 从知识库查询相关文章
        const articles = await this.searchKnowledgeBase(tenantId, content.searchQuery || '', content.categoryId);
        if (articles.length > 0) {
          return {
            type: 'knowledge',
            content: '以下是相关的帮助文章：',
            knowledgeArticles: articles.map((a) => ({
              id: a.id,
              title: a.title,
              summary: a.content.substring(0, 100),
            })),
          };
        }
        return {
          type: 'text',
          content: bot.fallbackMessage,
        };

      case IntentResponseType.TRANSFER:
        return {
          type: 'transfer',
          content: content.message || bot.transferMessage,
          transferTo: content.skillGroup,
        };

      default:
        return {
          type: 'text',
          content: typeof content === 'string' ? content : JSON.stringify(content),
        };
    }
  }

  /**
   * 搜索知识库
   */
  private async searchKnowledgeBase(
    tenantId: string,
    query: string,
    categoryId?: string,
  ): Promise<KnowledgeArticle[]> {
    const qb = this.knowledgeRepository.createQueryBuilder('article')
      .where('article.tenantId = :tenantId', { tenantId })
      .andWhere('article.status = :status', { status: 'published' });

    if (categoryId) {
      qb.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    if (query) {
      qb.andWhere(
        '(article.title ILIKE :query OR article.content ILIKE :query OR :query = ANY(article.tags))',
        { query: `%${query}%` },
      );
    }

    return qb.orderBy('article.viewCount', 'DESC').take(5).getMany();
  }

  /**
   * 触发转人工
   */
  private async triggerTransfer(
    botConversation: BotConversation,
    reason: string,
  ): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { id: botConversation.botId } });

    botConversation.status = BotConversationStatus.TRANSFERRED;
    botConversation.transferReason = reason;
    botConversation.transferredAt = new Date();
    await this.botConversationRepository.save(botConversation);

    // 发送转人工事件
    this.eventEmitter.emit('bot.transfer', {
      conversationId: botConversation.conversationId,
      botConversationId: botConversation.id,
      reason,
      userId: botConversation.userId,
    });

    return {
      type: 'transfer',
      content: bot?.transferMessage || '正在为您转接人工客服，请稍候...',
    };
  }

  /**
   * 手动转人工
   */
  async transferToAgent(tenantId: string, dto: TransferToAgentDto): Promise<void> {
    const botConversation = await this.botConversationRepository.findOne({
      where: { conversationId: dto.conversationId, tenantId },
    });

    if (!botConversation) {
      throw new NotFoundException('Bot conversation not found');
    }

    botConversation.status = BotConversationStatus.TRANSFERRED;
    botConversation.transferReason = dto.reason || 'user_requested';
    botConversation.transferredAt = new Date();
    if (dto.preferredAgentId) {
      botConversation.transferredToAgentId = dto.preferredAgentId;
    }
    await this.botConversationRepository.save(botConversation);

    this.eventEmitter.emit('bot.transfer', {
      conversationId: dto.conversationId,
      botConversationId: botConversation.id,
      reason: dto.reason,
      preferredAgentId: dto.preferredAgentId,
      skillGroup: dto.skillGroup,
    });
  }

  /**
   * 获取欢迎消息
   */
  async getWelcomeMessage(tenantId: string): Promise<BotResponse | null> {
    const bot = await this.getDefaultBot(tenantId);
    if (!bot) {
      return null;
    }

    // 检查是否在工作时间
    if (bot.workingHours && !this.isWithinWorkingHours(bot.workingHours)) {
      return {
        type: 'text',
        content: bot.offlineMessage,
      };
    }

    return {
      type: 'text',
      content: bot.welcomeMessage,
      quickReplies: bot.settings?.enableQuickReplies
        ? ['咨询产品', '技术支持', '投诉建议', '转人工']
        : undefined,
    };
  }

  private isWithinWorkingHours(workingHours: Record<string, { start: string; end: string }>): boolean {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    const hours = workingHours[today];

    if (!hours) {
      return false;
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= hours.start && currentTime <= hours.end;
  }

  // ========== Bot Conversation Management ==========

  async getBotConversations(
    tenantId: string,
    query: QueryBotConversationsDto,
  ): Promise<{ items: BotConversation[]; total: number }> {
    const { botId, status, resolvedByBot, startDate, endDate, page = 1, pageSize = 20 } = query;

    const qb = this.botConversationRepository.createQueryBuilder('bc')
      .where('bc.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('bc.bot', 'bot');

    if (botId) {
      qb.andWhere('bc.botId = :botId', { botId });
    }

    if (status) {
      qb.andWhere('bc.status = :status', { status });
    }

    if (resolvedByBot !== undefined) {
      qb.andWhere('bc.resolvedByBot = :resolvedByBot', { resolvedByBot });
    }

    if (startDate) {
      qb.andWhere('bc.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('bc.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('bc.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async submitFeedback(tenantId: string, dto: BotFeedbackDto): Promise<void> {
    const botConversation = await this.botConversationRepository.findOne({
      where: { id: dto.botConversationId, tenantId },
    });

    if (!botConversation) {
      throw new NotFoundException('Bot conversation not found');
    }

    botConversation.satisfactionScore = dto.score;
    botConversation.userFeedback = dto.feedback ?? '';
    await this.botConversationRepository.save(botConversation);
  }

  async markAsResolved(tenantId: string, botConversationId: string): Promise<void> {
    const botConversation = await this.botConversationRepository.findOne({
      where: { id: botConversationId, tenantId },
    });

    if (!botConversation) {
      throw new NotFoundException('Bot conversation not found');
    }

    botConversation.status = BotConversationStatus.BOT_RESOLVED;
    botConversation.resolvedByBot = true;
    await this.botConversationRepository.save(botConversation);
  }

  // ========== Statistics ==========

  async getBotStats(tenantId: string, botId?: string): Promise<BotStats> {
    const whereCondition: any = { tenantId };
    if (botId) {
      whereCondition.botId = botId;
    }

    const total = await this.botConversationRepository.count({ where: whereCondition });
    const resolved = await this.botConversationRepository.count({
      where: { ...whereCondition, resolvedByBot: true },
    });
    const transferred = await this.botConversationRepository.count({
      where: { ...whereCondition, status: BotConversationStatus.TRANSFERRED },
    });

    // 平均轮数
    const avgRounds = await this.botConversationRepository
      .createQueryBuilder('bc')
      .select('AVG(bc.botRounds)', 'avg')
      .where('bc.tenantId = :tenantId', { tenantId })
      .getRawOne();

    // 平均满意度
    const avgSatisfaction = await this.botConversationRepository
      .createQueryBuilder('bc')
      .select('AVG(bc.satisfactionScore)', 'avg')
      .where('bc.tenantId = :tenantId', { tenantId })
      .andWhere('bc.satisfactionScore IS NOT NULL')
      .getRawOne();

    // 热门意图
    const topIntents = await this.intentRepository
      .createQueryBuilder('intent')
      .innerJoin('intent.bot', 'bot')
      .where('bot.tenantId = :tenantId', { tenantId })
      .orderBy('intent.hitCount', 'DESC')
      .take(10)
      .getMany();

    return {
      totalConversations: total,
      botResolvedCount: resolved,
      transferredCount: transferred,
      avgBotRounds: parseFloat(avgRounds?.avg) || 0,
      avgSatisfactionScore: parseFloat(avgSatisfaction?.avg) || 0,
      topIntents: topIntents.map((i) => ({
        intentId: i.id,
        intentName: i.displayName,
        hitCount: i.hitCount,
      })),
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
    };
  }
}
