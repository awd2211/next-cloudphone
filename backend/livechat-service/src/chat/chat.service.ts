import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '@cloudphone/shared';
import { Conversation, ConversationStatus, ConversationPriority } from '../entities/conversation.entity';
import { Message, MessageSender, MessageStatus, MessageType } from '../entities/message.entity';
import { EncryptionService } from '../encryption/encryption.service';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private encryptionService: EncryptionService,
    private eventEmitter: EventEmitter2,
    private eventBus: EventBusService,
  ) {}

  // ========== 会话管理 ==========

  async createConversation(dto: CreateConversationDto, userId: string, tenantId: string): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      tenantId,
      userId,
      userName: dto.userName,
      userEmail: dto.userEmail,
      userAvatar: dto.userAvatar,
      subject: dto.subject,
      channel: dto.channel,
      priority: dto.priority || ConversationPriority.NORMAL,
      deviceId: dto.deviceId,
      metadata: dto.metadata,
      status: ConversationStatus.WAITING,
    });

    const saved = await this.conversationRepo.save(conversation);

    // 本地事件 (用于 WebSocket 广播)
    this.eventEmitter.emit('conversation.created', { conversation: saved });

    // RabbitMQ 跨服务事件
    await this.eventBus.publish('cloudphone.events', 'livechat.conversation_created', {
      conversationId: saved.id,
      userId: saved.userId,
      tenantId: saved.tenantId,
      channel: saved.channel,
      subject: saved.subject,
      priority: saved.priority,
      deviceId: saved.deviceId,
      createdAt: saved.createdAt,
    });

    this.logger.log(`Conversation created: ${saved.id} by user ${userId}`);

    return saved;
  }

  async getConversation(id: string, tenantId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id, tenantId },
      relations: ['agent', 'messages'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return conversation;
  }

  async getUserConversations(userId: string, tenantId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { userId, tenantId },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async getAgentConversations(agentId: string, tenantId: string, status?: ConversationStatus): Promise<Conversation[]> {
    const where: any = { agentId, tenantId };
    if (status) {
      where.status = status;
    }

    return this.conversationRepo.find({
      where,
      order: { lastMessageAt: 'DESC' },
      take: 100,
    });
  }

  async updateConversation(id: string, dto: UpdateConversationDto, tenantId: string): Promise<Conversation> {
    const conversation = await this.getConversation(id, tenantId);

    Object.assign(conversation, dto);

    if (dto.status === ConversationStatus.RESOLVED) {
      conversation.resolvedAt = new Date();
    } else if (dto.status === ConversationStatus.CLOSED) {
      conversation.closedAt = new Date();
    }

    const saved = await this.conversationRepo.save(conversation);

    // 本地事件 (用于 WebSocket 广播)
    this.eventEmitter.emit('conversation.updated', { conversation: saved });

    // RabbitMQ 跨服务事件 - 根据状态发布不同事件
    if (dto.status === ConversationStatus.RESOLVED) {
      await this.eventBus.publish('cloudphone.events', 'livechat.conversation_resolved', {
        conversationId: saved.id,
        userId: saved.userId,
        agentId: saved.agentId,
        tenantId: saved.tenantId,
        resolvedAt: saved.resolvedAt,
        duration: saved.resolvedAt && saved.createdAt
          ? Math.floor((saved.resolvedAt.getTime() - saved.createdAt.getTime()) / 1000)
          : null,
      });
    } else if (dto.status === ConversationStatus.CLOSED) {
      await this.eventBus.publish('cloudphone.events', 'livechat.conversation_closed', {
        conversationId: saved.id,
        userId: saved.userId,
        agentId: saved.agentId,
        tenantId: saved.tenantId,
        closedAt: saved.closedAt,
        messageCount: saved.messageCount,
      });
    } else {
      await this.eventBus.publish('cloudphone.events', 'livechat.conversation_updated', {
        conversationId: saved.id,
        tenantId: saved.tenantId,
        status: saved.status,
        updatedAt: saved.updatedAt,
      });
    }

    return saved;
  }

  async assignAgent(conversationId: string, agentId: string, tenantId: string): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, tenantId);

    if (conversation.agentId && conversation.agentId !== agentId) {
      conversation.transferredFrom = conversation.agentId;
    }

    conversation.agentId = agentId;
    conversation.status = ConversationStatus.ACTIVE;

    if (!conversation.firstResponseAt) {
      conversation.firstResponseAt = new Date();
    }

    const saved = await this.conversationRepo.save(conversation);

    // 本地事件 (用于 WebSocket 广播)
    this.eventEmitter.emit('conversation.assigned', { conversation: saved, agentId });

    // RabbitMQ 跨服务事件 - 通知其他服务客服已分配
    await this.eventBus.publish('cloudphone.events', 'livechat.agent_assigned', {
      conversationId: saved.id,
      userId: saved.userId,
      agentId: saved.agentId,
      tenantId: saved.tenantId,
      isTransfer: !!saved.transferredFrom,
      previousAgentId: saved.transferredFrom,
      firstResponseAt: saved.firstResponseAt,
    });

    return saved;
  }

  async transferConversation(
    conversationId: string,
    toAgentId: string,
    reason: string,
    tenantId: string,
  ): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, tenantId);

    conversation.transferredFrom = conversation.agentId;
    conversation.agentId = toAgentId;
    conversation.transferReason = reason;
    conversation.status = ConversationStatus.TRANSFERRED;

    const saved = await this.conversationRepo.save(conversation);

    // 本地事件 (用于 WebSocket 广播)
    this.eventEmitter.emit('conversation.transferred', { conversation: saved, toAgentId, reason });

    // RabbitMQ 跨服务事件 - 通知会话转移
    await this.eventBus.publish('cloudphone.events', 'livechat.conversation_transferred', {
      conversationId: saved.id,
      userId: saved.userId,
      fromAgentId: saved.transferredFrom,
      toAgentId: saved.agentId,
      tenantId: saved.tenantId,
      reason,
      transferredAt: new Date(),
    });

    return saved;
  }

  async closeConversation(conversationId: string, tenantId: string): Promise<Conversation> {
    return this.updateConversation(conversationId, { status: ConversationStatus.CLOSED }, tenantId);
  }

  // ========== 消息管理 ==========

  async sendMessage(conversationId: string, dto: SendMessageDto, senderId: string, tenantId: string): Promise<Message> {
    const conversation = await this.getConversation(conversationId, tenantId);

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Cannot send message to closed conversation');
    }

    let content = dto.content;
    let contentEncrypted: string | undefined;
    let isEncrypted = false;

    // 消息加密
    if (this.encryptionService.isEnabled()) {
      const encrypted = this.encryptionService.encrypt(content);
      contentEncrypted = encrypted.encrypted;
      isEncrypted = true;
    }

    const message = this.messageRepo.create({
      conversationId,
      type: dto.type || MessageType.TEXT,
      sender: dto.sender,
      senderId,
      senderName: dto.senderName,
      senderAvatar: dto.senderAvatar,
      content,
      contentEncrypted,
      isEncrypted,
      attachments: dto.attachments,
      metadata: dto.metadata,
      replyToId: dto.replyToId,
      status: MessageStatus.SENT,
    });

    const saved = await this.messageRepo.save(message);

    // 更新会话统计
    conversation.lastMessageAt = new Date();
    conversation.messageCount += 1;

    if (dto.sender === MessageSender.USER) {
      conversation.userMessageCount += 1;
    } else if (dto.sender === MessageSender.AGENT) {
      conversation.agentMessageCount += 1;
    }

    await this.conversationRepo.save(conversation);

    // 本地事件 (用于 WebSocket 广播)
    this.eventEmitter.emit('message.sent', { message: saved, conversation });

    // RabbitMQ 跨服务事件 - 不发送加密内容到消息总线
    await this.eventBus.publish('cloudphone.events', 'livechat.message_sent', {
      messageId: saved.id,
      conversationId: saved.conversationId,
      sender: saved.sender,
      senderId: saved.senderId,
      type: saved.type,
      tenantId: conversation.tenantId,
      userId: conversation.userId,
      agentId: conversation.agentId,
      hasAttachments: !!saved.attachments?.length,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  async getMessages(conversationId: string, tenantId: string, limit = 50, before?: Date): Promise<Message[]> {
    await this.getConversation(conversationId, tenantId); // 验证权限

    const query = this.messageRepo
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.isDeleted = false')
      .orderBy('message.createdAt', 'DESC')
      .take(limit);

    if (before) {
      query.andWhere('message.createdAt < :before', { before });
    }

    const messages = await query.getMany();

    // 解密消息
    return messages.map((msg) => this.decryptMessage(msg));
  }

  async markMessageRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    message.status = MessageStatus.READ;
    message.readAt = new Date();

    return this.messageRepo.save(message);
  }

  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.READ, readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('status != :status', { status: MessageStatus.READ })
      .execute();
  }

  // ========== 辅助方法 ==========

  private decryptMessage(message: Message): Message {
    if (message.isEncrypted && message.contentEncrypted) {
      try {
        message.content = this.encryptionService.decrypt(message.contentEncrypted);
      } catch (error) {
        this.logger.warn(`Failed to decrypt message ${message.id}: ${error.message}`);
      }
    }
    return message;
  }

  // ========== 统计方法 ==========

  async getWaitingCount(tenantId: string): Promise<number> {
    return this.conversationRepo.count({
      where: { tenantId, status: ConversationStatus.WAITING },
    });
  }

  async getActiveCount(tenantId: string, agentId?: string): Promise<number> {
    const where: any = { tenantId, status: ConversationStatus.ACTIVE };
    if (agentId) {
      where.agentId = agentId;
    }
    return this.conversationRepo.count({ where });
  }
}
