import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConversationCollaboration,
  CollaboratorRole,
  CollaborationStatus,
  InternalMessage,
  InternalMessageType,
  Conversation,
  Agent,
} from '../entities';
import {
  InviteCollaboratorDto,
  RespondInvitationDto,
  LeaveCollaborationDto,
  UpdateCollaboratorRoleDto,
  SendInternalMessageDto,
  QueryCollaborationsDto,
  QueryInternalMessagesDto,
  CollaborationInfo,
  ConversationCollaborators,
} from './dto';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    @InjectRepository(ConversationCollaboration)
    private collaborationRepository: Repository<ConversationCollaboration>,
    @InjectRepository(InternalMessage)
    private internalMessageRepository: Repository<InternalMessage>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ========== Collaboration Management ==========

  async inviteCollaborator(
    tenantId: string,
    dto: InviteCollaboratorDto,
    inviterId: string,
  ): Promise<ConversationCollaboration> {
    // 验证会话存在
    const conversation = await this.conversationRepository.findOne({
      where: { id: dto.conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // 验证被邀请的客服存在
    const agent = await this.agentRepository.findOne({
      where: { id: dto.agentId, tenantId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // 检查是否已经存在协同记录
    const existing = await this.collaborationRepository.findOne({
      where: {
        conversationId: dto.conversationId,
        agentId: dto.agentId,
        status: In([CollaborationStatus.INVITED, CollaborationStatus.JOINED]),
      },
    });

    if (existing) {
      throw new BadRequestException('Agent is already a collaborator or has pending invitation');
    }

    const collaboration = this.collaborationRepository.create({
      tenantId,
      conversationId: dto.conversationId,
      agentId: dto.agentId,
      role: dto.role || CollaboratorRole.ASSISTANT,
      status: CollaborationStatus.INVITED,
      invitedBy: inviterId,
      inviteReason: dto.reason,
    });

    const saved = await this.collaborationRepository.save(collaboration);

    // 发送邀请事件
    this.eventEmitter.emit('collaboration.invited', {
      collaboration: saved,
      inviterId,
      agent,
      conversation,
    });

    this.logger.log(`Agent ${dto.agentId} invited to conversation ${dto.conversationId}`);

    return saved;
  }

  async respondToInvitation(
    tenantId: string,
    dto: RespondInvitationDto,
    agentId: string,
  ): Promise<ConversationCollaboration> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { id: dto.collaborationId, tenantId, agentId },
      relations: ['conversation', 'agent'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration invitation not found');
    }

    if (collaboration.status !== CollaborationStatus.INVITED) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (dto.action === 'accept') {
      collaboration.status = CollaborationStatus.JOINED;
      collaboration.joinedAt = new Date();

      // 发送加入事件
      this.eventEmitter.emit('collaboration.joined', {
        collaboration,
      });

      // 发送系统内部消息
      await this.sendInternalMessage(tenantId, {
        conversationId: collaboration.conversationId,
        content: `${collaboration.agent?.displayName || '客服'} 已加入协同服务`,
        type: InternalMessageType.SYSTEM,
      }, 'system');

    } else {
      collaboration.status = CollaborationStatus.DECLINED;
      collaboration.leftReason = dto.reason ?? '';

      // 发送拒绝事件
      this.eventEmitter.emit('collaboration.declined', {
        collaboration,
        reason: dto.reason,
      });
    }

    return this.collaborationRepository.save(collaboration);
  }

  async leaveCollaboration(
    tenantId: string,
    dto: LeaveCollaborationDto,
    agentId: string,
  ): Promise<void> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { id: dto.collaborationId, tenantId, agentId },
      relations: ['agent'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration not found');
    }

    if (collaboration.role === CollaboratorRole.PRIMARY) {
      throw new ForbiddenException('Primary agent cannot leave the collaboration');
    }

    collaboration.status = CollaborationStatus.LEFT;
    collaboration.leftAt = new Date();
    collaboration.leftReason = dto.reason ?? '';

    await this.collaborationRepository.save(collaboration);

    // 发送退出事件
    this.eventEmitter.emit('collaboration.left', {
      collaboration,
      reason: dto.reason,
    });

    // 发送系统内部消息
    await this.sendInternalMessage(tenantId, {
      conversationId: collaboration.conversationId,
      content: `${collaboration.agent?.displayName || '客服'} 已退出协同服务`,
      type: InternalMessageType.SYSTEM,
    }, 'system');
  }

  async updateCollaboratorRole(
    tenantId: string,
    dto: UpdateCollaboratorRoleDto,
    requesterId: string,
  ): Promise<ConversationCollaboration> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { id: dto.collaborationId, tenantId },
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration not found');
    }

    // 验证请求者是主客服或管理员
    const requesterCollab = await this.collaborationRepository.findOne({
      where: {
        conversationId: collaboration.conversationId,
        agentId: requesterId,
        role: CollaboratorRole.PRIMARY,
        status: CollaborationStatus.JOINED,
      },
    });

    if (!requesterCollab) {
      throw new ForbiddenException('Only primary agent can update roles');
    }

    collaboration.role = dto.role;
    return this.collaborationRepository.save(collaboration);
  }

  async getCollaborators(tenantId: string, conversationId: string): Promise<ConversationCollaborators> {
    const collaborations = await this.collaborationRepository.find({
      where: { tenantId, conversationId },
      relations: ['agent'],
      order: { createdAt: 'ASC' },
    });

    const mapToInfo = (c: ConversationCollaboration): CollaborationInfo => ({
      id: c.id,
      conversationId: c.conversationId,
      agentId: c.agentId,
      agentName: c.agent?.displayName || '',
      agentAvatar: c.agent?.avatar,
      role: c.role,
      status: c.status,
      invitedBy: c.invitedBy,
      inviteReason: c.inviteReason,
      joinedAt: c.joinedAt?.toISOString(),
      messageCount: c.messageCount,
    });

    const primary = collaborations.find(
      (c) => c.role === CollaboratorRole.PRIMARY && c.status === CollaborationStatus.JOINED,
    );

    const joined = collaborations.filter(
      (c) => c.status === CollaborationStatus.JOINED && c.role !== CollaboratorRole.PRIMARY,
    );

    const pending = collaborations.filter(
      (c) => c.status === CollaborationStatus.INVITED,
    );

    return {
      conversationId,
      primaryAgent: primary ? mapToInfo(primary) : null,
      collaborators: joined.map(mapToInfo),
      pendingInvitations: pending.map(mapToInfo),
    };
  }

  async getMyCollaborations(
    tenantId: string,
    agentId: string,
    query: QueryCollaborationsDto,
  ): Promise<{ items: ConversationCollaboration[]; total: number }> {
    const { status, page = 1, pageSize = 20 } = query;

    const qb = this.collaborationRepository.createQueryBuilder('collab')
      .where('collab.tenantId = :tenantId', { tenantId })
      .andWhere('collab.agentId = :agentId', { agentId })
      .leftJoinAndSelect('collab.conversation', 'conversation')
      .leftJoinAndSelect('collab.agent', 'agent');

    if (status) {
      qb.andWhere('collab.status = :status', { status });
    }

    qb.orderBy('collab.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getPendingInvitations(tenantId: string, agentId: string): Promise<ConversationCollaboration[]> {
    return this.collaborationRepository.find({
      where: {
        tenantId,
        agentId,
        status: CollaborationStatus.INVITED,
      },
      relations: ['conversation', 'agent'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========== Internal Messages ==========

  async sendInternalMessage(
    tenantId: string,
    dto: SendInternalMessageDto,
    senderId: string,
  ): Promise<InternalMessage> {
    // 获取发送者信息
    let senderName = 'System';
    if (senderId !== 'system') {
      const agent = await this.agentRepository.findOne({ where: { id: senderId } });
      senderName = agent?.displayName || 'Agent';
    }

    const message = this.internalMessageRepository.create({
      tenantId,
      conversationId: dto.conversationId,
      senderId,
      senderName,
      recipientIds: dto.recipientIds || [],
      type: dto.type || InternalMessageType.TEXT,
      content: dto.content,
      metadata: dto.metadata,
      readBy: senderId !== 'system' ? [senderId] : [],
    });

    const saved = await this.internalMessageRepository.save(message);

    // 更新发送者的消息计数
    if (senderId !== 'system') {
      await this.collaborationRepository.increment(
        { conversationId: dto.conversationId, agentId: senderId },
        'internalMessageCount',
        1,
      );
    }

    // 发送内部消息事件
    this.eventEmitter.emit('collaboration.internal_message', {
      message: saved,
      conversationId: dto.conversationId,
    });

    return saved;
  }

  async getInternalMessages(
    tenantId: string,
    query: QueryInternalMessagesDto,
    agentId: string,
  ): Promise<{ items: InternalMessage[]; total: number }> {
    const { conversationId, type, page = 1, pageSize = 50 } = query;

    const qb = this.internalMessageRepository.createQueryBuilder('msg')
      .where('msg.tenantId = :tenantId', { tenantId })
      .andWhere('msg.conversationId = :conversationId', { conversationId })
      .andWhere(
        '(msg.recipientIds = :empty OR :agentId = ANY(msg.recipientIds) OR msg.senderId = :agentId)',
        { empty: '[]', agentId },
      );

    if (type) {
      qb.andWhere('msg.type = :type', { type });
    }

    qb.orderBy('msg.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items: items.reverse(), total };
  }

  async markMessagesAsRead(
    tenantId: string,
    messageIds: string[],
    agentId: string,
  ): Promise<void> {
    await this.internalMessageRepository
      .createQueryBuilder()
      .update()
      .set({
        readBy: () => `array_append("readBy", '${agentId}')`,
      })
      .where('id IN (:...ids)', { ids: messageIds })
      .andWhere('tenantId = :tenantId', { tenantId })
      .andWhere('NOT (:agentId = ANY("readBy"))', { agentId })
      .execute();
  }

  // ========== Helper Methods ==========

  async isCollaborator(tenantId: string, conversationId: string, agentId: string): Promise<boolean> {
    const count = await this.collaborationRepository.count({
      where: {
        tenantId,
        conversationId,
        agentId,
        status: CollaborationStatus.JOINED,
      },
    });
    return count > 0;
  }

  async canSendMessage(tenantId: string, conversationId: string, agentId: string): Promise<boolean> {
    const collab = await this.collaborationRepository.findOne({
      where: {
        tenantId,
        conversationId,
        agentId,
        status: CollaborationStatus.JOINED,
      },
    });

    if (!collab) return false;

    // 观察者不能发送消息
    return collab.role !== CollaboratorRole.OBSERVER;
  }
}
