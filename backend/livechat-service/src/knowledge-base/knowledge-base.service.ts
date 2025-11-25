/**
 * 知识库服务
 *
 * 提供知识库文章和分类的 CRUD 操作，以及智能搜索和推荐功能
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, IsNull, Not, ILike } from 'typeorm';
import { EventBusService, UnifiedCacheService } from '@cloudphone/shared';

import {
  KnowledgeCategory,
  KnowledgeArticle,
  ArticleStatus,
  ArticleVisibility,
  KnowledgeUsage,
  UsageType,
} from '../entities';

import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateArticleDto,
  UpdateArticleDto,
  SearchArticlesDto,
  RecommendArticlesDto,
  RecordUsageDto,
  ArticleStatsQueryDto,
} from './dto';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeCategory)
    private categoryRepo: Repository<KnowledgeCategory>,

    @InjectRepository(KnowledgeArticle)
    private articleRepo: Repository<KnowledgeArticle>,

    @InjectRepository(KnowledgeUsage)
    private usageRepo: Repository<KnowledgeUsage>,

    private cacheService: UnifiedCacheService,

    private eventBus: EventBusService,
  ) {}

  // ============ 分类管理 ============

  /**
   * 获取所有分类（树形结构）
   */
  async getCategories(tenantId: string, includeInactive = false): Promise<KnowledgeCategory[]> {
    const cacheKey = `kb:categories:${tenantId}:${includeInactive}`;
    const cached = await this.cacheService.get<KnowledgeCategory[]>(cacheKey);
    if (cached) return cached;

    const where: any = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await this.categoryRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    // 构建树形结构
    const tree = this.buildCategoryTree(categories);

    await this.cacheService.set(cacheKey, tree, 300); // 5分钟缓存
    return tree;
  }

  /**
   * 构建分类树
   */
  private buildCategoryTree(categories: KnowledgeCategory[]): KnowledgeCategory[] {
    const map = new Map<string, KnowledgeCategory>();
    const roots: KnowledgeCategory[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * 获取分类详情
   */
  async getCategory(id: string, tenantId: string): Promise<KnowledgeCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id, tenantId },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return category;
  }

  /**
   * 创建分类
   */
  async createCategory(
    dto: CreateCategoryDto,
    tenantId: string,
    userId: string,
  ): Promise<KnowledgeCategory> {
    // 检查父分类
    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new BadRequestException('父分类不存在');
      }
    }

    const category = this.categoryRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.categoryRepo.save(category);

    // 清除缓存
    await this.clearCategoryCache(tenantId);

    // 发送事件
    await this.eventBus.publish('cloudphone.events', 'livechat.knowledge_category_created', {
      categoryId: saved.id,
      tenantId,
      userId,
    });

    this.logger.log(`Category created: ${saved.id} by user ${userId}`);
    return saved;
  }

  /**
   * 更新分类
   */
  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    tenantId: string,
    userId: string,
  ): Promise<KnowledgeCategory> {
    const category = await this.getCategory(id, tenantId);

    // 防止循环引用
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('不能将分类设为自己的子分类');
    }

    Object.assign(category, dto, { updatedBy: userId });
    const saved = await this.categoryRepo.save(category);

    await this.clearCategoryCache(tenantId);

    this.logger.log(`Category updated: ${id} by user ${userId}`);
    return saved;
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string, tenantId: string, userId: string): Promise<void> {
    const category = await this.getCategory(id, tenantId);

    // 检查是否有子分类
    const childCount = await this.categoryRepo.count({
      where: { parentId: id, tenantId },
    });
    if (childCount > 0) {
      throw new BadRequestException('请先删除子分类');
    }

    // 检查是否有文章
    if (category.articleCount > 0) {
      throw new BadRequestException('请先移除或删除该分类下的文章');
    }

    await this.categoryRepo.remove(category);
    await this.clearCategoryCache(tenantId);

    this.logger.log(`Category deleted: ${id} by user ${userId}`);
  }

  // ============ 文章管理 ============

  /**
   * 搜索文章
   */
  async searchArticles(
    query: SearchArticlesDto,
    tenantId: string,
    forAgent = true,
  ): Promise<{ items: KnowledgeArticle[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, sortBy = 'sortOrder', sortOrder = 'ASC' } = query;

    const qb = this.articleRepo.createQueryBuilder('article');
    qb.where('article.tenantId = :tenantId', { tenantId });

    // 可见性过滤
    if (forAgent) {
      qb.andWhere('article.visibility IN (:...visibility)', {
        visibility: [ArticleVisibility.PUBLIC, ArticleVisibility.INTERNAL],
      });
      qb.andWhere('article.status = :status', { status: ArticleStatus.PUBLISHED });
    } else {
      if (query.status) {
        qb.andWhere('article.status = :status', { status: query.status });
      }
      if (query.visibility) {
        qb.andWhere('article.visibility = :visibility', { visibility: query.visibility });
      }
    }

    // 分类过滤
    if (query.categoryId) {
      qb.andWhere('article.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    // 关键词搜索
    if (query.keyword) {
      qb.andWhere(
        '(article.title ILIKE :keyword OR article.summary ILIKE :keyword OR article.content ILIKE :keyword OR :keyword = ANY(article.tags) OR :keyword = ANY(article.keywords))',
        { keyword: `%${query.keyword}%` },
      );
    }

    // 标签过滤
    if (query.tag) {
      qb.andWhere(':tag = ANY(article.tags)', { tag: query.tag });
    }

    // 置顶/精选过滤
    if (query.isPinned !== undefined) {
      qb.andWhere('article.isPinned = :isPinned', { isPinned: query.isPinned });
    }
    if (query.isFeatured !== undefined) {
      qb.andWhere('article.isFeatured = :isFeatured', { isFeatured: query.isFeatured });
    }

    // 排序
    const validSortFields = ['createdAt', 'updatedAt', 'viewCount', 'useCount', 'sortOrder', 'title'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'sortOrder';
    qb.orderBy(`article.isPinned`, 'DESC'); // 置顶优先
    qb.addOrderBy(`article.${orderField}`, sortOrder);

    // 分页
    qb.skip((page - 1) * limit).take(limit);

    // 关联分类
    qb.leftJoinAndSelect('article.category', 'category');

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 获取文章详情
   */
  async getArticle(id: string, tenantId: string): Promise<KnowledgeArticle> {
    const article = await this.articleRepo.findOne({
      where: { id, tenantId },
      relations: ['category'],
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    return article;
  }

  /**
   * 创建文章
   */
  async createArticle(
    dto: CreateArticleDto,
    tenantId: string,
    userId: string,
    userName?: string,
  ): Promise<KnowledgeArticle> {
    // 验证分类
    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException('分类不存在');
      }
    }

    const article = this.articleRepo.create({
      ...dto,
      tenantId,
      authorId: userId,
      authorName: userName,
      createdBy: userId,
      updatedBy: userId,
      publishedAt: dto.status === ArticleStatus.PUBLISHED ? new Date() : undefined,
    });

    const saved = await this.articleRepo.save(article);

    // 更新分类文章数
    if (dto.categoryId) {
      await this.updateCategoryArticleCount(dto.categoryId);
    }

    // 发送事件
    await this.eventBus.publish('cloudphone.events', 'livechat.knowledge_article_created', {
      articleId: saved.id,
      tenantId,
      userId,
    });

    this.logger.log(`Article created: ${saved.id} by user ${userId}`);
    return saved;
  }

  /**
   * 更新文章
   */
  async updateArticle(
    id: string,
    dto: UpdateArticleDto,
    tenantId: string,
    userId: string,
  ): Promise<KnowledgeArticle> {
    const article = await this.getArticle(id, tenantId);
    const oldCategoryId = article.categoryId;

    // 验证新分类
    if (dto.categoryId && dto.categoryId !== oldCategoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException('分类不存在');
      }
    }

    // 处理发布状态变更
    const updates: Partial<KnowledgeArticle> = { ...dto, updatedBy: userId };
    if (dto.status === ArticleStatus.PUBLISHED && article.status !== ArticleStatus.PUBLISHED) {
      updates.publishedAt = new Date();
      updates.version = article.version + 1;
    }

    Object.assign(article, updates);
    const saved = await this.articleRepo.save(article);

    // 更新分类文章数
    if (dto.categoryId && dto.categoryId !== oldCategoryId) {
      if (oldCategoryId) {
        await this.updateCategoryArticleCount(oldCategoryId);
      }
      await this.updateCategoryArticleCount(dto.categoryId);
    }

    this.logger.log(`Article updated: ${id} by user ${userId}`);
    return saved;
  }

  /**
   * 删除文章
   */
  async deleteArticle(id: string, tenantId: string, userId: string): Promise<void> {
    const article = await this.getArticle(id, tenantId);
    const categoryId = article.categoryId;

    await this.articleRepo.remove(article);

    // 更新分类文章数
    if (categoryId) {
      await this.updateCategoryArticleCount(categoryId);
    }

    this.logger.log(`Article deleted: ${id} by user ${userId}`);
  }

  /**
   * 批量发布文章
   */
  async publishArticles(ids: string[], tenantId: string, userId: string): Promise<number> {
    const result = await this.articleRepo.update(
      { id: In(ids), tenantId, status: Not(ArticleStatus.PUBLISHED) },
      {
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedBy: userId,
      },
    );

    this.logger.log(`${result.affected} articles published by user ${userId}`);
    return result.affected || 0;
  }

  /**
   * 批量归档文章
   */
  async archiveArticles(ids: string[], tenantId: string, userId: string): Promise<number> {
    const result = await this.articleRepo.update(
      { id: In(ids), tenantId },
      {
        status: ArticleStatus.ARCHIVED,
        updatedBy: userId,
      },
    );

    this.logger.log(`${result.affected} articles archived by user ${userId}`);
    return result.affected || 0;
  }

  // ============ 智能推荐 ============

  /**
   * 根据会话内容推荐文章
   */
  async recommendArticles(
    dto: RecommendArticlesDto,
    tenantId: string,
    agentId: string,
  ): Promise<KnowledgeArticle[]> {
    const { conversationId, message, limit = 5 } = dto;

    if (!message) {
      // 没有消息，返回热门文章
      return this.getPopularArticles(tenantId, limit);
    }

    // 基于关键词搜索
    const keywords = this.extractKeywords(message);

    if (keywords.length === 0) {
      return this.getPopularArticles(tenantId, limit);
    }

    const qb = this.articleRepo.createQueryBuilder('article');
    qb.where('article.tenantId = :tenantId', { tenantId });
    qb.andWhere('article.status = :status', { status: ArticleStatus.PUBLISHED });
    qb.andWhere('article.visibility IN (:...visibility)', {
      visibility: [ArticleVisibility.PUBLIC, ArticleVisibility.INTERNAL],
    });

    // 关键词匹配
    const keywordConditions = keywords.map((_, i) => {
      return `(article.title ILIKE :kw${i} OR article.summary ILIKE :kw${i} OR :kwExact${i} = ANY(article.keywords))`;
    });
    qb.andWhere(`(${keywordConditions.join(' OR ')})`);

    keywords.forEach((kw, i) => {
      qb.setParameter(`kw${i}`, `%${kw}%`);
      qb.setParameter(`kwExact${i}`, kw);
    });

    qb.orderBy('article.useCount', 'DESC');
    qb.addOrderBy('article.helpfulCount', 'DESC');
    qb.take(limit);

    const articles = await qb.getMany();

    // 记录 AI 推荐使用
    for (const article of articles) {
      await this.recordUsage({
        articleId: article.id,
        conversationId,
        type: 'ai_recommend',
        searchQuery: message,
      }, tenantId, agentId);
    }

    return articles;
  }

  /**
   * 获取热门文章
   */
  async getPopularArticles(tenantId: string, limit = 10): Promise<KnowledgeArticle[]> {
    const cacheKey = `kb:popular:${tenantId}:${limit}`;
    const cached = await this.cacheService.get<KnowledgeArticle[]>(cacheKey);
    if (cached) return cached;

    const articles = await this.articleRepo.find({
      where: {
        tenantId,
        status: ArticleStatus.PUBLISHED,
        visibility: In([ArticleVisibility.PUBLIC, ArticleVisibility.INTERNAL]),
      },
      order: {
        isPinned: 'DESC',
        isFeatured: 'DESC',
        useCount: 'DESC',
        viewCount: 'DESC',
      },
      take: limit,
    });

    await this.cacheService.set(cacheKey, articles, 300); // 5分钟
    return articles;
  }

  /**
   * 提取关键词（简单实现）
   */
  private extractKeywords(text: string): string[] {
    // 移除常见停用词，分词
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '怎么', '如何', '请问', '帮忙', '可以', '能', '吗', '呢'];

    const words = text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.includes(w));

    return [...new Set(words)].slice(0, 5);
  }

  // ============ 使用记录 ============

  /**
   * 记录使用情况
   */
  async recordUsage(
    dto: RecordUsageDto,
    tenantId: string,
    agentId: string,
  ): Promise<void> {
    const usage = this.usageRepo.create({
      articleId: dto.articleId,
      agentId,
      conversationId: dto.conversationId,
      tenantId,
      type: dto.type as UsageType,
      searchQuery: dto.searchQuery,
    });

    await this.usageRepo.save(usage);

    // 更新文章计数
    const updateField = this.getUpdateFieldByType(dto.type);
    if (updateField) {
      await this.articleRepo.increment({ id: dto.articleId }, updateField, 1);
    }
  }

  private getUpdateFieldByType(type: string): string | null {
    const mapping: Record<string, string> = {
      view: 'viewCount',
      send: 'useCount',
      copy: 'useCount',
      helpful: 'helpfulCount',
      not_helpful: 'notHelpfulCount',
    };
    return mapping[type] || null;
  }

  // ============ 统计 ============

  /**
   * 获取知识库统计
   */
  async getStats(tenantId: string, query?: ArticleStatsQueryDto): Promise<any> {
    const categoryCount = await this.categoryRepo.count({
      where: { tenantId, isActive: true },
    });

    const articleStats = await this.articleRepo
      .createQueryBuilder('article')
      .select('article.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('article.tenantId = :tenantId', { tenantId })
      .groupBy('article.status')
      .getRawMany();

    const totalViews = await this.articleRepo
      .createQueryBuilder('article')
      .select('SUM(article.viewCount)', 'total')
      .where('article.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const totalUses = await this.articleRepo
      .createQueryBuilder('article')
      .select('SUM(article.useCount)', 'total')
      .where('article.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const topArticles = await this.articleRepo.find({
      where: { tenantId, status: ArticleStatus.PUBLISHED },
      order: { useCount: 'DESC' },
      take: 10,
      select: ['id', 'title', 'viewCount', 'useCount', 'helpfulCount'],
    });

    return {
      categoryCount,
      articleStats: articleStats.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      }, {}),
      totalViews: parseInt(totalViews?.total || '0', 10),
      totalUses: parseInt(totalUses?.total || '0', 10),
      topArticles,
    };
  }

  // ============ 辅助方法 ============

  /**
   * 更新分类文章数
   */
  private async updateCategoryArticleCount(categoryId: string): Promise<void> {
    const count = await this.articleRepo.count({
      where: { categoryId, status: Not(ArticleStatus.ARCHIVED) },
    });

    await this.categoryRepo.update(categoryId, { articleCount: count });
  }

  /**
   * 清除分类缓存
   */
  private async clearCategoryCache(tenantId: string): Promise<void> {
    await this.cacheService.del(`kb:categories:${tenantId}:true`);
    await this.cacheService.del(`kb:categories:${tenantId}:false`);
  }
}
