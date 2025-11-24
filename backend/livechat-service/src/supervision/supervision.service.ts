/**
 * 会话监听/插话服务
 *
 * 功能:
 * - 主管可以监听任意会话
 * - 悄悄话模式：只有客服能看到主管消息
 * - 插话模式：所有人都能看到主管消息
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Message, MessageSender, MessageType, MessageStatus } from '../entities/message.entity';
import { SupervisionMode, SupervisionSession } from './dto';

@Injectable()
export class SupervisionService {
  private readonly logger = new Logger(SupervisionService.name);

  // Redis key 前缀
  private readonly SUPERVISION_KEY_PREFIX = 'livechat:supervision:';
  private readonly CONVERSATION_SUPERVISORS_PREFIX = 'livechat:conv:supervisors:';

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private eventEmitter: EventEmitter2,
    @InjectRedis() private redis: Redis,
  ) {}

  /**
   * 开始监听会话
   */
  async startSupervision(
    conversationId: string,
    supervisorId: string,
    supervisorName: string,
    mode: SupervisionMode,
    tenantId: string,
  ): Promise<SupervisionSession> {
    // 验证会话存在
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException(`会话 ${conversationId} 不存在`);
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('无法监听已关闭的会话');
    }

    // 创建监听会话
    const session: SupervisionSession = {
      supervisorId,
      supervisorName,
      conversationId,
      mode,
      startedAt: new Date(),
    };

    // 存储到 Redis
    const sessionKey = `${this.SUPERVISION_KEY_PREFIX}${supervisorId}:${conversationId}`;
    await this.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600 * 8); // 8小时过期

    // 将监督者添加到会话的监督者列表
    const supervisorsKey = `${this.CONVERSATION_SUPERVISORS_PREFIX}${conversationId}`;
    await this.redis.sadd(supervisorsKey, supervisorId);
    await this.redis.expire(supervisorsKey, 3600 * 8);

    // 发送事件，通知 WebSocket 加入房间
    this.eventEmitter.emit('supervision.started', {
      conversationId,
      supervisorId,
      supervisorName,
      mode,
    });

    // 如果是悄悄话或插话模式，通知客服
    if (mode !== SupervisionMode.LISTEN) {
      this.eventEmitter.emit('supervision.mode_changed', {
        conversationId,
        supervisorId,
        supervisorName,
        mode,
        agentId: conversation.agentId,
      });
    }

    this.logger.log(
      `Supervisor ${supervisorName} started ${mode} supervision on conversation ${conversationId}`,
    );

    return session;
  }

  /**
   * 停止监听会话
   */
  async stopSupervision(
    conversationId: string,
    supervisorId: string,
    tenantId: string,
  ): Promise<void> {
    const sessionKey = `${this.SUPERVISION_KEY_PREFIX}${supervisorId}:${conversationId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      throw new NotFoundException('监听会话不存在');
    }

    // 删除 Redis 数据
    await this.redis.del(sessionKey);

    // 从监督者列表中移除
    const supervisorsKey = `${this.CONVERSATION_SUPERVISORS_PREFIX}${conversationId}`;
    await this.redis.srem(supervisorsKey, supervisorId);

    // 发送事件
    this.eventEmitter.emit('supervision.stopped', {
      conversationId,
      supervisorId,
    });

    this.logger.log(`Supervisor ${supervisorId} stopped supervision on conversation ${conversationId}`);
  }

  /**
   * 获取当前监听信息
   */
  async getSupervisionSession(
    conversationId: string,
    supervisorId: string,
  ): Promise<SupervisionSession | null> {
    const sessionKey = `${this.SUPERVISION_KEY_PREFIX}${supervisorId}:${conversationId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  /**
   * 获取会话的所有监督者
   */
  async getConversationSupervisors(conversationId: string): Promise<SupervisionSession[]> {
    const supervisorsKey = `${this.CONVERSATION_SUPERVISORS_PREFIX}${conversationId}`;
    const supervisorIds = await this.redis.smembers(supervisorsKey);

    const sessions: SupervisionSession[] = [];

    for (const supervisorId of supervisorIds) {
      const session = await this.getSupervisionSession(conversationId, supervisorId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * 发送悄悄话（仅客服可见）
   */
  async sendWhisper(
    conversationId: string,
    supervisorId: string,
    supervisorName: string,
    content: string,
    tenantId: string,
  ): Promise<Message> {
    // 验证监听会话
    const session = await this.getSupervisionSession(conversationId, supervisorId);

    if (!session) {
      throw new ForbiddenException('您没有监听此会话');
    }

    if (session.mode === SupervisionMode.LISTEN) {
      throw new BadRequestException('当前为静默监听模式，无法发送消息');
    }

    // 验证会话
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException(`会话 ${conversationId} 不存在`);
    }

    // 创建悄悄话消息
    const message = this.messageRepo.create({
      conversationId,
      type: MessageType.TEXT,
      sender: MessageSender.SYSTEM, // 使用 SYSTEM 类型区分
      senderId: supervisorId,
      senderName: `[主管] ${supervisorName}`,
      content,
      status: MessageStatus.SENT,
      metadata: {
        isWhisper: true, // 标记为悄悄话
        supervisorId,
        supervisorName,
      },
    });

    const saved = await this.messageRepo.save(message);

    // 发送事件（只发给客服）
    this.eventEmitter.emit('supervision.whisper', {
      message: saved,
      conversationId,
      agentId: conversation.agentId,
    });

    this.logger.log(`Supervisor ${supervisorName} sent whisper in conversation ${conversationId}`);

    return saved;
  }

  /**
   * 发送插话（所有人可见）
   */
  async sendBarge(
    conversationId: string,
    supervisorId: string,
    supervisorName: string,
    content: string,
    tenantId: string,
  ): Promise<Message> {
    // 验证监听会话
    const session = await this.getSupervisionSession(conversationId, supervisorId);

    if (!session) {
      throw new ForbiddenException('您没有监听此会话');
    }

    if (session.mode !== SupervisionMode.BARGE) {
      throw new BadRequestException('当前模式不允许插话，请切换到插话模式');
    }

    // 验证会话
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException(`会话 ${conversationId} 不存在`);
    }

    // 创建插话消息
    const message = this.messageRepo.create({
      conversationId,
      type: MessageType.TEXT,
      sender: MessageSender.AGENT, // 客服类型，访客可见
      senderId: supervisorId,
      senderName: `[主管] ${supervisorName}`,
      content,
      status: MessageStatus.SENT,
      metadata: {
        isBarge: true, // 标记为插话
        supervisorId,
        supervisorName,
      },
    });

    const saved = await this.messageRepo.save(message);

    // 更新会话消息计数
    conversation.lastMessageAt = new Date();
    conversation.messageCount += 1;
    conversation.agentMessageCount += 1;
    await this.conversationRepo.save(conversation);

    // 发送事件（发给所有人）
    this.eventEmitter.emit('message.sent', {
      message: saved,
      conversation,
    });

    this.logger.log(`Supervisor ${supervisorName} barged into conversation ${conversationId}`);

    return saved;
  }

  /**
   * 切换监听模式
   */
  async changeSuperVisionMode(
    conversationId: string,
    supervisorId: string,
    newMode: SupervisionMode,
    tenantId: string,
  ): Promise<SupervisionSession> {
    const session = await this.getSupervisionSession(conversationId, supervisorId);

    if (!session) {
      throw new NotFoundException('监听会话不存在');
    }

    // 更新模式
    session.mode = newMode;

    // 保存到 Redis
    const sessionKey = `${this.SUPERVISION_KEY_PREFIX}${supervisorId}:${conversationId}`;
    await this.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600 * 8);

    // 获取会话信息
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });

    // 发送模式变更事件
    this.eventEmitter.emit('supervision.mode_changed', {
      conversationId,
      supervisorId,
      supervisorName: session.supervisorName,
      mode: newMode,
      agentId: conversation?.agentId,
    });

    this.logger.log(
      `Supervisor ${session.supervisorName} changed mode to ${newMode} in conversation ${conversationId}`,
    );

    return session;
  }

  /**
   * 获取主管正在监听的所有会话
   */
  async getSupervisorSessions(supervisorId: string): Promise<SupervisionSession[]> {
    const pattern = `${this.SUPERVISION_KEY_PREFIX}${supervisorId}:*`;
    const keys = await this.redis.keys(pattern);

    const sessions: SupervisionSession[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    return sessions;
  }
}
