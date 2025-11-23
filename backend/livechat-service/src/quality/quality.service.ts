import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { QualityReview, ReviewStatus, QualityScores, ReviewIssue } from '../entities/quality-review.entity';
import { SensitiveWord, SensitiveWordLevel } from '../entities/sensitive-word.entity';
import { SatisfactionRating } from '../entities/satisfaction-rating.entity';
import { Message } from '../entities/message.entity';

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);
  private sensitiveWordsCache: Map<string, SensitiveWord[]> = new Map();
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(QualityReview)
    private reviewRepo: Repository<QualityReview>,
    @InjectRepository(SensitiveWord)
    private sensitiveWordRepo: Repository<SensitiveWord>,
    @InjectRepository(SatisfactionRating)
    private ratingRepo: Repository<SatisfactionRating>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private configService: ConfigService,
  ) {
    this.enabled = configService.get('QUALITY_CHECK_ENABLED', true);
  }

  // ========== 质检管理 ==========

  async createReview(data: Partial<QualityReview>): Promise<QualityReview> {
    const review = this.reviewRepo.create(data);
    return this.reviewRepo.save(review);
  }

  async getReview(id: string): Promise<QualityReview> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['conversation'],
    });
    if (!review) {
      throw new NotFoundException(`Quality review ${id} not found`);
    }
    return review;
  }

  async updateReview(id: string, data: Partial<QualityReview>): Promise<QualityReview> {
    const review = await this.getReview(id);
    Object.assign(review, data);

    if (data.scores) {
      review.overallScore = this.calculateOverallScore(data.scores);
    }

    if (data.status === ReviewStatus.COMPLETED) {
      review.reviewedAt = new Date();
    }

    return this.reviewRepo.save(review);
  }

  async listReviews(tenantId: string, status?: ReviewStatus): Promise<QualityReview[]> {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }
    return this.reviewRepo.find({
      where,
      relations: ['conversation'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getReviewsByAgent(agentId: string): Promise<QualityReview[]> {
    return this.reviewRepo.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private calculateOverallScore(scores: QualityScores): number {
    const weights = {
      professionalism: 0.25,
      responseSpeed: 0.2,
      problemSolving: 0.25,
      communication: 0.15,
      attitude: 0.15,
    };

    return Object.entries(scores).reduce((total, [key, value]) => {
      return total + (value || 0) * (weights[key as keyof typeof weights] || 0);
    }, 0);
  }

  // ========== 满意度评价 ==========

  async createRating(data: Partial<SatisfactionRating>): Promise<SatisfactionRating> {
    const rating = this.ratingRepo.create(data);
    return this.ratingRepo.save(rating);
  }

  async getConversationRating(conversationId: string): Promise<SatisfactionRating | null> {
    return this.ratingRepo.findOne({ where: { conversationId } });
  }

  // ========== 敏感词检测 ==========

  async checkSensitiveWords(content: string, tenantId: string): Promise<{
    detected: boolean;
    words: { word: string; level: SensitiveWordLevel }[];
  }> {
    if (!this.enabled) {
      return { detected: false, words: [] };
    }

    const sensitiveWords = await this.getSensitiveWords(tenantId);
    const detectedWords: { word: string; level: SensitiveWordLevel }[] = [];

    for (const sw of sensitiveWords) {
      let matched = false;

      if (sw.isRegex) {
        try {
          const regex = new RegExp(sw.word, 'gi');
          matched = regex.test(content);
        } catch (e) {
          // 无效正则，跳过
        }
      } else {
        matched = content.toLowerCase().includes(sw.word.toLowerCase());
      }

      if (matched) {
        detectedWords.push({ word: sw.word, level: sw.level });
        // 更新匹配计数
        await this.sensitiveWordRepo.increment({ id: sw.id }, 'matchCount', 1);
      }
    }

    return {
      detected: detectedWords.length > 0,
      words: detectedWords,
    };
  }

  async filterSensitiveWords(content: string, tenantId: string): Promise<string> {
    const sensitiveWords = await this.getSensitiveWords(tenantId);
    let filtered = content;

    for (const sw of sensitiveWords) {
      const replacement = sw.replacement || '*'.repeat(sw.word.length);

      if (sw.isRegex) {
        try {
          const regex = new RegExp(sw.word, 'gi');
          filtered = filtered.replace(regex, replacement);
        } catch (e) {
          // 无效正则，跳过
        }
      } else {
        filtered = filtered.split(sw.word).join(replacement);
      }
    }

    return filtered;
  }

  private async getSensitiveWords(tenantId: string): Promise<SensitiveWord[]> {
    // 缓存敏感词列表
    if (!this.sensitiveWordsCache.has(tenantId)) {
      const words = await this.sensitiveWordRepo.find({
        where: { tenantId, isActive: true },
      });
      this.sensitiveWordsCache.set(tenantId, words);

      // 5分钟后过期
      setTimeout(() => this.sensitiveWordsCache.delete(tenantId), 5 * 60 * 1000);
    }

    return this.sensitiveWordsCache.get(tenantId) || [];
  }

  // ========== 敏感词管理 ==========

  async createSensitiveWord(data: Partial<SensitiveWord>): Promise<SensitiveWord> {
    const word = this.sensitiveWordRepo.create(data);
    const saved = await this.sensitiveWordRepo.save(word);

    // 清除缓存
    this.sensitiveWordsCache.delete(data.tenantId || 'default');

    return saved;
  }

  async listSensitiveWords(tenantId: string): Promise<SensitiveWord[]> {
    return this.sensitiveWordRepo.find({
      where: { tenantId },
      order: { category: 'ASC', word: 'ASC' },
    });
  }

  async deleteSensitiveWord(id: string, tenantId: string): Promise<void> {
    await this.sensitiveWordRepo.delete({ id, tenantId });
    this.sensitiveWordsCache.delete(tenantId);
  }
}
