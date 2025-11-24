import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService, ConsulService, HttpClientService } from '@cloudphone/shared';
import { ChatService } from '../chat/chat.service';
import { TicketLink, TicketLinkType, TicketLinkStatus } from '../entities/ticket-link.entity';
import { TicketTemplate, TicketTemplateType } from '../entities/ticket-template.entity';
import {
  CreateTicketFromConversationDto,
  AddTicketCommentDto,
  UpdateTicketStatusDto,
  UpdateTicketPriorityDto,
  CreateTicketLinkDto,
  QueryTicketLinksDto,
  CreateTicketTemplateDto,
  UpdateTicketTemplateDto,
  QueryTicketTemplatesDto,
  TicketLinkResponse,
  TicketTemplateResponse,
  ConvertedTicketResponse,
  TicketStatsResponse,
} from './dto';

export interface TicketInfo {
  id: string;
  number?: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly fallbackUrl: string;

  constructor(
    @InjectRepository(TicketLink)
    private linkRepository: Repository<TicketLink>,
    @InjectRepository(TicketTemplate)
    private templateRepository: Repository<TicketTemplate>,
    private configService: ConfigService,
    private chatService: ChatService,
    private eventBus: EventBusService,
    private eventEmitter: EventEmitter2,
    private consulService: ConsulService,
    private httpClient: HttpClientService,
  ) {
    this.fallbackUrl = configService.get('USER_SERVICE_URL', 'http://localhost:30001');
  }

  private async getUserServiceUrl(): Promise<string> {
    try {
      return await this.consulService.getService('user-service');
    } catch (error) {
      this.logger.warn(`Consul service discovery failed, using fallback URL`);
      return this.fallbackUrl;
    }
  }

  // ========== Ticket Conversion ==========

  async createTicketFromConversation(
    tenantId: string,
    dto: CreateTicketFromConversationDto,
    userId: string,
    authToken: string,
  ): Promise<ConvertedTicketResponse | null> {
    try {
      // 获取会话信息
      const conversation = await this.chatService.getConversation(dto.conversationId, tenantId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // 获取模板（如果指定）
      let template: TicketTemplate | null = null;
      if (dto.templateId) {
        template = await this.templateRepository.findOne({
          where: { id: dto.templateId, tenantId, isActive: true },
        });
      } else {
        // 获取默认模板
        template = await this.templateRepository.findOne({
          where: { tenantId, isDefault: true, isActive: true },
        });
      }

      // 准备工单数据
      const includeHistory = dto.includeHistory ?? template?.includeConversationHistory ?? true;
      const historyLimit = dto.historyLimit ?? template?.historyLimit ?? 50;

      let fullDescription = dto.description || '';

      if (includeHistory) {
        const messages = await this.chatService.getMessages(dto.conversationId, tenantId, historyLimit);
        const messageHistory = messages
          .reverse()
          .map((m) => `[${new Date(m.createdAt).toLocaleString()}] ${m.senderName || m.sender}: ${m.content}`)
          .join('\n');

        fullDescription = `${fullDescription}\n\n--- 聊天记录 ---\n${messageHistory}`;
      }

      // 处理主题模板
      let subject = dto.subject || conversation.subject || '在线客服会话转工单';
      if (template?.subjectTemplate) {
        subject = this.processTemplate(template.subjectTemplate, { conversation, visitor: conversation.visitor });
      }

      // 调用 user-service 创建工单
      const baseUrl = await this.getUserServiceUrl();
      const ticketData = {
        subject,
        description: fullDescription,
        priority: dto.priority || template?.defaultPriority || 'normal',
        category: dto.category || template?.defaultCategory || 'livechat',
        tags: dto.tags || template?.defaultTags,
        metadata: {
          conversationId: dto.conversationId,
          agentId: conversation.agentId,
          visitorId: conversation.visitorId,
          source: 'livechat',
        },
        customFields: dto.customFields,
      };

      // 如果需要分配给当前客服
      if (dto.assignToCurrentAgent || template?.autoAssignSettings?.assignToCurrentAgent) {
        (ticketData as any).assigneeId = conversation.agentId;
      }

      const response = await this.httpClient.postWithCircuitBreaker<any>(
        'user-service',
        `${baseUrl}/tickets`,
        ticketData,
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      if (!response) {
        throw new Error('Failed to create ticket - empty response');
      }

      // 创建关联记录
      const link = this.linkRepository.create({
        tenantId,
        conversationId: dto.conversationId,
        ticketId: response.id,
        ticketNumber: response.number,
        linkType: TicketLinkType.CONVERTED,
        status: TicketLinkStatus.ACTIVE,
        ticketInfo: {
          subject: response.subject,
          status: response.status,
          priority: response.priority,
          category: response.category,
          assigneeId: response.assigneeId,
          assigneeName: response.assigneeName,
          lastUpdatedAt: new Date(),
        },
        syncSettings: {
          syncComments: dto.syncComments ?? template?.syncSettings?.syncComments ?? true,
          syncStatusChanges: dto.syncStatusChanges ?? template?.syncSettings?.syncStatusChanges ?? true,
          syncPriorityChanges: template?.syncSettings?.syncPriorityChanges ?? true,
          notifyOnUpdate: template?.syncSettings?.notifyOnUpdate ?? true,
        },
        createdBy: userId,
      });

      await this.linkRepository.save(link);

      // 更新会话关联工单
      await this.chatService.updateConversation(
        dto.conversationId,
        { ticketId: response.id } as any,
        tenantId,
      );

      // 发布事件
      await this.eventBus.publish('cloudphone.events', 'livechat.ticket_created', {
        ticketId: response.id,
        conversationId: dto.conversationId,
        linkId: link.id,
        userId,
        tenantId,
      });

      // 发送系统消息到会话
      await this.chatService.sendSystemMessage(
        dto.conversationId,
        tenantId,
        `会话已转为工单 #${response.number || response.id.substring(0, 8)}`,
      );

      this.logger.log(`Created ticket ${response.id} from conversation ${dto.conversationId}`);

      return {
        ticketId: response.id,
        ticketNumber: response.number,
        subject: response.subject,
        status: response.status,
        priority: response.priority,
        category: response.category,
        linkId: link.id,
        conversationId: dto.conversationId,
        createdAt: response.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create ticket: ${error.message}`);
      throw error;
    }
  }

  // ========== Ticket Info ==========

  async getTicketInfo(ticketId: string, authToken: string): Promise<TicketInfo | null> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      const response = await this.httpClient.getWithCircuitBreaker<any>(
        'user-service',
        `${baseUrl}/tickets/${ticketId}`,
        { headers: { Authorization: `Bearer ${authToken}` } },
        { fallbackValue: null },
      );

      if (!response) return null;

      return {
        id: response.id,
        number: response.number,
        subject: response.subject,
        status: response.status,
        priority: response.priority,
        category: response.category,
        assigneeId: response.assigneeId,
        assigneeName: response.assigneeName,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get ticket info: ${error.message}`);
      return null;
    }
  }

  async addTicketComment(
    tenantId: string,
    ticketId: string,
    dto: AddTicketCommentDto,
    userId: string,
    authToken: string,
  ): Promise<boolean> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      await this.httpClient.postWithCircuitBreaker<any>(
        'user-service',
        `${baseUrl}/tickets/${ticketId}/comments`,
        {
          content: dto.content,
          internal: dto.internal,
          source: 'livechat',
        },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      // 如果需要同步到会话
      if (dto.syncToConversation) {
        const link = await this.linkRepository.findOne({
          where: { tenantId, ticketId },
        });

        if (link && link.syncSettings?.syncComments) {
          await this.chatService.sendSystemMessage(
            link.conversationId,
            tenantId,
            `[工单评论] ${dto.content}`,
          );
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to add ticket comment: ${error.message}`);
      return false;
    }
  }

  async updateTicketStatus(
    tenantId: string,
    ticketId: string,
    dto: UpdateTicketStatusDto,
    authToken: string,
  ): Promise<boolean> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      await this.httpClient.patchWithCircuitBreaker<any>(
        'user-service',
        `${baseUrl}/tickets/${ticketId}`,
        { status: dto.status },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      // 更新关联状态
      const link = await this.linkRepository.findOne({
        where: { tenantId, ticketId },
      });

      if (link) {
        link.ticketInfo = {
          ...link.ticketInfo,
          status: dto.status,
          lastUpdatedAt: new Date(),
        };

        // 根据工单状态更新关联状态
        if (['resolved', 'closed'].includes(dto.status)) {
          link.status = dto.status === 'resolved'
            ? TicketLinkStatus.RESOLVED
            : TicketLinkStatus.CLOSED;
        }

        await this.linkRepository.save(link);

        // 通知会话
        if (dto.notifyConversation && link.syncSettings?.syncStatusChanges) {
          await this.chatService.sendSystemMessage(
            link.conversationId,
            tenantId,
            `工单状态已更新为: ${dto.status}`,
          );

          // 发送 WebSocket 事件
          this.eventEmitter.emit('ticket.status_changed', {
            ticketId,
            conversationId: link.conversationId,
            tenantId,
            status: dto.status,
          });
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to update ticket status: ${error.message}`);
      return false;
    }
  }

  // ========== Ticket Links ==========

  async createLink(
    tenantId: string,
    dto: CreateTicketLinkDto,
    userId: string,
    authToken: string,
  ): Promise<TicketLinkResponse> {
    // 检查会话是否存在
    const conversation = await this.chatService.getConversation(dto.conversationId, tenantId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // 获取工单信息
    const ticketInfo = await this.getTicketInfo(dto.ticketId, authToken);
    if (!ticketInfo) {
      throw new NotFoundException('Ticket not found');
    }

    const link = this.linkRepository.create({
      tenantId,
      conversationId: dto.conversationId,
      ticketId: dto.ticketId,
      ticketNumber: ticketInfo.number,
      linkType: dto.linkType || TicketLinkType.REFERENCED,
      status: TicketLinkStatus.ACTIVE,
      ticketInfo: {
        subject: ticketInfo.subject,
        status: ticketInfo.status,
        priority: ticketInfo.priority,
        category: ticketInfo.category,
        assigneeId: ticketInfo.assigneeId,
        assigneeName: ticketInfo.assigneeName,
        lastUpdatedAt: new Date(),
      },
      syncSettings: {
        syncComments: dto.syncComments ?? false,
        syncStatusChanges: dto.syncStatusChanges ?? true,
        notifyOnUpdate: true,
      },
      createdBy: userId,
      notes: dto.notes,
    });

    const saved = await this.linkRepository.save(link);
    return this.mapLinkToResponse(saved);
  }

  async getLinks(
    tenantId: string,
    query: QueryTicketLinksDto,
  ): Promise<{ items: TicketLinkResponse[]; total: number }> {
    const { conversationId, ticketId, linkType, status, page = 1, limit = 20 } = query;

    const qb = this.linkRepository
      .createQueryBuilder('l')
      .where('l.tenantId = :tenantId', { tenantId });

    if (conversationId) {
      qb.andWhere('l.conversationId = :conversationId', { conversationId });
    }
    if (ticketId) {
      qb.andWhere('l.ticketId = :ticketId', { ticketId });
    }
    if (linkType) {
      qb.andWhere('l.linkType = :linkType', { linkType });
    }
    if (status) {
      qb.andWhere('l.status = :status', { status });
    }

    const [items, total] = await qb
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(l => this.mapLinkToResponse(l)),
      total,
    };
  }

  async getLink(tenantId: string, linkId: string): Promise<TicketLinkResponse> {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, tenantId },
    });

    if (!link) {
      throw new NotFoundException('Ticket link not found');
    }

    return this.mapLinkToResponse(link);
  }

  async getConversationLinks(
    tenantId: string,
    conversationId: string,
  ): Promise<TicketLinkResponse[]> {
    const links = await this.linkRepository.find({
      where: { tenantId, conversationId },
      order: { createdAt: 'DESC' },
    });

    return links.map(l => this.mapLinkToResponse(l));
  }

  async removeLink(tenantId: string, linkId: string): Promise<void> {
    const result = await this.linkRepository.delete({ id: linkId, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Ticket link not found');
    }
  }

  // ========== Ticket Templates ==========

  async createTemplate(
    tenantId: string,
    dto: CreateTicketTemplateDto,
    userId: string,
  ): Promise<TicketTemplateResponse> {
    // 如果设为默认，取消其他默认
    if (dto.isDefault) {
      await this.templateRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const template = this.templateRepository.create({
      tenantId,
      ...dto,
      createdBy: userId,
    });

    const saved = await this.templateRepository.save(template);
    return this.mapTemplateToResponse(saved);
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    dto: UpdateTicketTemplateDto,
  ): Promise<TicketTemplateResponse> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 如果设为默认，取消其他默认
    if (dto.isDefault && !template.isDefault) {
      await this.templateRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(template, dto);
    const saved = await this.templateRepository.save(template);
    return this.mapTemplateToResponse(saved);
  }

  async getTemplates(
    tenantId: string,
    query: QueryTicketTemplatesDto,
  ): Promise<{ items: TicketTemplateResponse[]; total: number }> {
    const { type, isActive, page = 1, limit = 20 } = query;

    const qb = this.templateRepository
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId });

    if (type) {
      qb.andWhere('t.type = :type', { type });
    }
    if (isActive !== undefined) {
      qb.andWhere('t.isActive = :isActive', { isActive });
    }

    const [items, total] = await qb
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(t => this.mapTemplateToResponse(t)),
      total,
    };
  }

  async getTemplate(tenantId: string, templateId: string): Promise<TicketTemplateResponse> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.mapTemplateToResponse(template);
  }

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const result = await this.templateRepository.delete({ id: templateId, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException('Template not found');
    }
  }

  // ========== Statistics ==========

  async getStats(tenantId: string): Promise<TicketStatsResponse> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // 关联统计
    const linkStats = await this.linkRepository
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('l.tenantId = :tenantId', { tenantId })
      .groupBy('l.status')
      .getRawMany();

    const linkTypeStats = await this.linkRepository
      .createQueryBuilder('l')
      .select('l.linkType', 'linkType')
      .addSelect('COUNT(*)', 'count')
      .where('l.tenantId = :tenantId', { tenantId })
      .groupBy('l.linkType')
      .getRawMany();

    // 模板统计
    const [, totalTemplates] = await this.templateRepository.findAndCount({
      where: { tenantId },
    });

    const [, activeTemplates] = await this.templateRepository.findAndCount({
      where: { tenantId, isActive: true },
    });

    // 今日转换
    const conversionsToday = await this.linkRepository.count({
      where: {
        tenantId,
        linkType: TicketLinkType.CONVERTED,
        createdAt: MoreThanOrEqual(todayStart),
      },
    });

    // 本周转换
    const conversionsThisWeek = await this.linkRepository.count({
      where: {
        tenantId,
        linkType: TicketLinkType.CONVERTED,
        createdAt: MoreThanOrEqual(weekStart),
      },
    });

    const linksByStatus: Record<string, number> = {};
    linkStats.forEach(s => {
      linksByStatus[s.status] = parseInt(s.count);
    });

    const linksByType: Record<string, number> = {};
    linkTypeStats.forEach(s => {
      linksByType[s.linkType] = parseInt(s.count);
    });

    return {
      totalLinks: Object.values(linksByStatus).reduce((a, b) => a + b, 0),
      activeLinks: linksByStatus[TicketLinkStatus.ACTIVE] || 0,
      resolvedLinks: linksByStatus[TicketLinkStatus.RESOLVED] || 0,
      linksByType: linksByType as Record<TicketLinkType, number>,
      totalTemplates,
      activeTemplates,
      conversionsToday,
      conversionsThisWeek,
    };
  }

  // ========== Event Handlers (Called by RabbitMQ Consumer) ==========

  async handleTicketStatusChanged(
    ticketId: string,
    newStatus: string,
    tenantId: string,
  ): Promise<void> {
    const links = await this.linkRepository.find({
      where: { ticketId, tenantId },
    });

    for (const link of links) {
      // 更新缓存的工单状态
      link.ticketInfo = {
        ...link.ticketInfo,
        status: newStatus,
        lastUpdatedAt: new Date(),
      };

      // 更新关联状态
      if (['resolved', 'closed'].includes(newStatus)) {
        link.status = newStatus === 'resolved'
          ? TicketLinkStatus.RESOLVED
          : TicketLinkStatus.CLOSED;
      }

      await this.linkRepository.save(link);

      // 通知会话
      if (link.syncSettings?.syncStatusChanges) {
        await this.chatService.sendSystemMessage(
          link.conversationId,
          tenantId,
          `关联工单状态已更新: ${newStatus}`,
        );

        this.eventEmitter.emit('ticket.status_changed', {
          ticketId,
          conversationId: link.conversationId,
          tenantId,
          status: newStatus,
        });
      }
    }
  }

  async handleTicketCommentAdded(
    ticketId: string,
    comment: { content: string; authorName: string; internal: boolean },
    tenantId: string,
  ): Promise<void> {
    // 不同步内部评论
    if (comment.internal) return;

    const links = await this.linkRepository.find({
      where: { ticketId, tenantId },
    });

    for (const link of links) {
      if (link.syncSettings?.syncComments) {
        await this.chatService.sendSystemMessage(
          link.conversationId,
          tenantId,
          `[工单评论 - ${comment.authorName}] ${comment.content}`,
        );
      }
    }
  }

  // ========== Private Methods ==========

  private processTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+\.?\w*)\}\}/g, (match, key) => {
      const keys = key.split('.');
      let value = context;
      for (const k of keys) {
        value = value?.[k];
      }
      return value?.toString() || match;
    });
  }

  private mapLinkToResponse(link: TicketLink): TicketLinkResponse {
    return {
      id: link.id,
      conversationId: link.conversationId,
      ticketId: link.ticketId,
      ticketNumber: link.ticketNumber,
      linkType: link.linkType,
      status: link.status,
      ticketInfo: link.ticketInfo,
      syncSettings: link.syncSettings,
      createdBy: link.createdBy,
      notes: link.notes,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  private mapTemplateToResponse(template: TicketTemplate): TicketTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      subjectTemplate: template.subjectTemplate,
      descriptionTemplate: template.descriptionTemplate,
      defaultPriority: template.defaultPriority,
      defaultCategory: template.defaultCategory,
      defaultTags: template.defaultTags,
      includeConversationHistory: template.includeConversationHistory,
      historyLimit: template.historyLimit,
      customFields: template.customFields,
      syncSettings: template.syncSettings,
      autoAssignSettings: template.autoAssignSettings,
      isActive: template.isActive,
      isDefault: template.isDefault,
      sortOrder: template.sortOrder,
      createdAt: template.createdAt,
    };
  }
}
