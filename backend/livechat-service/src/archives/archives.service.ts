import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageArchive, ArchivedMessageData } from '../entities/message-archive.entity';
import { Message } from '../entities/message.entity';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Lock, DistributedLockService } from '@cloudphone/shared';

@Injectable()
export class ArchivesService {
  private readonly logger = new Logger(ArchivesService.name);
  private readonly enabled: boolean;
  private readonly archiveAfterDays: number;
  private readonly deleteAfterDays: number;

  constructor(
    @InjectRepository(MessageArchive)
    private archiveRepo: Repository<MessageArchive>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    private configService: ConfigService,
    private lockService: DistributedLockService,
  ) {
    this.enabled = configService.get('ARCHIVE_ENABLED', true);
    this.archiveAfterDays = configService.get('ARCHIVE_AFTER_DAYS', 90);
    this.deleteAfterDays = configService.get('ARCHIVE_DELETE_AFTER_DAYS', 365);
  }

  // ========== 归档操作 ==========

  async archiveConversation(conversationId: string): Promise<number> {
    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    let archivedCount = 0;

    for (const message of messages) {
      const archiveData: ArchivedMessageData = {
        conversationId: message.conversationId,
        type: message.type,
        sender: message.sender,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        contentEncrypted: message.contentEncrypted,
        isEncrypted: message.isEncrypted,
        attachments: message.attachments,
        metadata: message.metadata,
        createdAt: message.createdAt,
      };

      const archive = this.archiveRepo.create({
        conversationId,
        originalMessageId: message.id,
        data: archiveData,
        archivedAt: new Date(),
        retentionUntil: new Date(Date.now() + this.deleteAfterDays * 24 * 60 * 60 * 1000),
      });

      await this.archiveRepo.save(archive);
      archivedCount++;
    }

    // 删除原始消息
    await this.messageRepo.delete({ conversationId });

    this.logger.log(`Archived ${archivedCount} messages from conversation ${conversationId}`);

    return archivedCount;
  }

  async getArchivedMessages(conversationId: string): Promise<ArchivedMessageData[]> {
    const archives = await this.archiveRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return archives.map((a) => a.data);
  }

  async searchArchives(tenantId: string, query: {
    conversationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<MessageArchive[]> {
    const qb = this.archiveRepo.createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId });

    if (query.conversationId) {
      qb.andWhere('a.conversationId = :conversationId', { conversationId: query.conversationId });
    }

    if (query.startDate) {
      qb.andWhere('a.archivedAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('a.archivedAt <= :endDate', { endDate: query.endDate });
    }

    return qb.orderBy('a.archivedAt', 'DESC').take(query.limit || 100).getMany();
  }

  // ========== 定时任务 ==========

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  @Lock({ key: 'livechat:archive:daily', ttl: 300000 })
  async runDailyArchive() {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting daily archive task...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.archiveAfterDays);

    // 找到需要归档的已关闭会话
    const conversations = await this.conversationRepo.find({
      where: {
        status: ConversationStatus.CLOSED,
        closedAt: LessThan(cutoffDate),
      },
      take: 100, // 每次处理100个
    });

    let totalArchived = 0;

    for (const conv of conversations) {
      try {
        const count = await this.archiveConversation(conv.id);
        totalArchived += count;
      } catch (error) {
        this.logger.error(`Failed to archive conversation ${conv.id}: ${error.message}`);
      }
    }

    this.logger.log(`Daily archive completed: ${conversations.length} conversations, ${totalArchived} messages`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  @Lock({ key: 'livechat:cleanup:daily', ttl: 300000 })
  async runDailyCleanup() {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting daily cleanup task...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.deleteAfterDays);

    // 删除过期的归档
    const result = await this.archiveRepo.delete({
      retentionUntil: LessThan(cutoffDate),
    });

    this.logger.log(`Daily cleanup completed: ${result.affected} expired archives deleted`);
  }

  // ========== 统计 ==========

  async getArchiveStats(tenantId: string): Promise<{
    totalArchived: number;
    oldestArchive: Date | null;
    pendingDeletion: number;
  }> {
    const totalArchived = await this.archiveRepo.count({ where: { tenantId } });

    const oldest = await this.archiveRepo.findOne({
      where: { tenantId },
      order: { archivedAt: 'ASC' },
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 30); // 30天内将过期的

    const pendingDeletion = await this.archiveRepo.count({
      where: {
        tenantId,
        retentionUntil: LessThan(cutoffDate),
      },
    });

    return {
      totalArchived,
      oldestArchive: oldest?.archivedAt || null,
      pendingDeletion,
    };
  }
}
