import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { LiveChatCacheKeys } from '../cache/cache-keys';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  username?: string;
  roles?: string[];
  isAgent?: boolean;
}

@WebSocketGateway({
  namespace: '/livechat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtService: JwtService,
    @InjectRedis() private redis: Redis,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('LiveChat WebSocket Gateway initialized');
    // 注意: Redis Adapter 配置已移至 GatewayModule 的 IoAdapter 中
    // 在 NestJS 中，namespace 模式下的 afterInit 接收的是 Namespace 对象
    // adapter 需要在 IoAdapter 层配置或使用延迟初始化
    this.setupRedisAdapterDelayed();
  }

  /**
   * 延迟配置 Redis Adapter 实现多实例间的 WebSocket 消息同步
   * 当服务运行在集群模式（多实例）时，需要 Redis Adapter 来同步广播消息
   */
  private setupRedisAdapterDelayed(): void {
    // 延迟执行确保 server 已完全初始化
    setTimeout(() => {
      this.setupRedisAdapter();
    }, 100);
  }

  private setupRedisAdapter(): void {
    try {
      // 获取底层的 Socket.IO Server 实例
      const ioServer = (this.server as any)?.server;
      if (!ioServer) {
        this.logger.warn('Socket.IO Server not available, skipping Redis Adapter setup');
        return;
      }

      const redisHost = this.configService.get('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get('REDIS_PORT', 6379);
      const redisPassword = this.configService.get('REDIS_PASSWORD');
      const redisDb = this.configService.get('REDIS_DB', 0);

      const redisOptions: any = {
        host: redisHost,
        port: redisPort,
        db: redisDb,
      };

      if (redisPassword) {
        redisOptions.password = redisPassword;
      }

      // 创建专用的 Pub/Sub Redis 客户端
      const pubClient = new Redis(redisOptions);
      const subClient = pubClient.duplicate();

      // 设置 Redis Adapter
      ioServer.adapter(createAdapter(pubClient, subClient));

      this.logger.log(`✅ Redis Adapter configured for cluster support (${redisHost}:${redisPort})`);

      // 监听连接错误
      pubClient.on('error', (err) => {
        this.logger.error(`Redis Adapter pubClient error: ${err.message}`);
      });

      subClient.on('error', (err) => {
        this.logger.error(`Redis Adapter subClient error: ${err.message}`);
      });
    } catch (error) {
      this.logger.warn(`Failed to setup Redis Adapter: ${error.message}. Running in standalone mode.`);
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.tenantId = payload.tenantId || 'default';
      client.username = payload.username;
      client.roles = payload.roles || [];
      client.isAgent = payload.roles?.includes('agent') || payload.roles?.includes('admin');

      // 加入租户房间
      await client.join(`tenant:${client.tenantId}`);

      // 加入用户个人房间
      await client.join(`user:${client.userId}`);

      // 记录在线状态
      if (client.isAgent) {
        await this.redis.sadd(LiveChatCacheKeys.onlineAgentsKey(client.tenantId!), client.userId!);
        await this.redis.set(LiveChatCacheKeys.agentStatusKey(client.userId!), 'online', 'EX', 3600);
      } else {
        await this.redis.sadd(LiveChatCacheKeys.onlineUsersKey(client.tenantId!), client.userId!);
      }

      this.logger.log(`Client connected: ${client.id} (${client.username}, isAgent: ${client.isAgent})`);

      // 通知客户端连接成功
      client.emit('connected', {
        userId: client.userId,
        username: client.username,
        isAgent: client.isAgent,
      });

    } catch (error) {
      this.logger.warn(`Client ${client.id} auth failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.tenantId) {
      if (client.isAgent) {
        await this.redis.srem(LiveChatCacheKeys.onlineAgentsKey(client.tenantId), client.userId);
        await this.redis.del(LiveChatCacheKeys.agentStatusKey(client.userId));
      } else {
        await this.redis.srem(LiveChatCacheKeys.onlineUsersKey(client.tenantId), client.userId);
      }

      this.logger.log(`Client disconnected: ${client.id} (${client.username})`);
    }
  }

  // ========== 消息事件 ==========

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.join(`conversation:${data.conversationId}`);
    this.logger.debug(`${client.username} joined conversation ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
    this.logger.debug(`${client.username} left conversation ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // 设置打字状态 TTL 5秒
    if (data.isTyping) {
      await this.redis.set(
        LiveChatCacheKeys.userTypingKey(data.conversationId, client.userId!),
        '1',
        'EX',
        5,
      );
    } else {
      await this.redis.del(LiveChatCacheKeys.userTypingKey(data.conversationId, client.userId!));
    }

    // 广播给会话中的其他人
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      username: client.username,
      isTyping: data.isTyping,
    });

    return { success: true };
  }

  @SubscribeMessage('agent_status')
  async handleAgentStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: 'online' | 'busy' | 'away' | 'offline' },
  ) {
    if (!client.isAgent) {
      return { success: false, error: 'Not an agent' };
    }

    await this.redis.set(
      LiveChatCacheKeys.agentStatusKey(client.userId!),
      data.status,
      'EX',
      3600,
    );

    // 通知其他客服状态变更
    this.server.to(`tenant:${client.tenantId}`).emit('agent_status_changed', {
      agentId: client.userId,
      status: data.status,
    });

    return { success: true };
  }

  // ========== 内部事件处理 ==========

  @OnEvent('message.sent')
  async handleMessageSent(payload: { message: any; conversation: any }) {
    // 广播新消息到会话房间
    this.server.to(`conversation:${payload.message.conversationId}`).emit('new_message', {
      message: payload.message,
    });

    // 通知用户有新消息（如果不在会话房间）
    this.server.to(`user:${payload.conversation.userId}`).emit('message_notification', {
      conversationId: payload.conversation.id,
      preview: payload.message.content.substring(0, 100),
    });
  }

  @OnEvent('conversation.created')
  async handleConversationCreated(payload: { conversation: any }) {
    // 通知所有在线客服有新会话
    this.server.to(`tenant:${payload.conversation.tenantId}`).emit('new_conversation', {
      conversation: payload.conversation,
    });
  }

  @OnEvent('conversation.assigned')
  async handleConversationAssigned(payload: { conversation: any; agentId: string }) {
    // 通知被分配的客服
    this.server.to(`user:${payload.agentId}`).emit('conversation_assigned', {
      conversation: payload.conversation,
    });

    // 通知用户客服已接入
    this.server.to(`user:${payload.conversation.userId}`).emit('agent_joined', {
      conversationId: payload.conversation.id,
      agentId: payload.agentId,
    });
  }

  @OnEvent('conversation.transferred')
  async handleConversationTransferred(payload: { conversation: any; toAgentId: string; reason: string }) {
    // 通知新客服
    this.server.to(`user:${payload.toAgentId}`).emit('conversation_transferred', {
      conversation: payload.conversation,
      reason: payload.reason,
    });
  }

  @OnEvent('message.edited')
  async handleMessageEdited(payload: { message: any; conversationId: string; originalContent: string }) {
    // 广播消息编辑事件到会话房间
    this.server.to(`conversation:${payload.conversationId}`).emit('message_edited', {
      messageId: payload.message.id,
      content: payload.message.content,
      editedAt: payload.message.editedAt,
      isEdited: true,
    });

    this.logger.debug(`Message ${payload.message.id} edited, broadcasting to conversation ${payload.conversationId}`);
  }

  @OnEvent('message.revoked')
  async handleMessageRevoked(payload: { message: any; conversationId: string; revokedBy: string; reason?: string }) {
    // 广播消息撤回事件到会话房间
    this.server.to(`conversation:${payload.conversationId}`).emit('message_revoked', {
      messageId: payload.message.id,
      revokedBy: payload.revokedBy,
      revokedAt: payload.message.deletedAt,
      reason: payload.reason,
    });

    this.logger.debug(`Message ${payload.message.id} revoked, broadcasting to conversation ${payload.conversationId}`);
  }

  // ========== 监听/插话事件 ==========

  @OnEvent('supervision.started')
  async handleSupervisionStarted(payload: {
    conversationId: string;
    supervisorId: string;
    supervisorName: string;
    mode: string;
  }) {
    // 通知客服有主管开始监听
    this.server.to(`conversation:${payload.conversationId}`).emit('supervision_started', {
      conversationId: payload.conversationId,
      supervisorName: payload.supervisorName,
      mode: payload.mode,
    });

    this.logger.debug(`Supervisor ${payload.supervisorName} started ${payload.mode} on conversation ${payload.conversationId}`);
  }

  @OnEvent('supervision.stopped')
  async handleSupervisionStopped(payload: { conversationId: string; supervisorId: string }) {
    // 通知客服主管停止监听
    this.server.to(`conversation:${payload.conversationId}`).emit('supervision_stopped', {
      conversationId: payload.conversationId,
      supervisorId: payload.supervisorId,
    });

    this.logger.debug(`Supervisor stopped supervision on conversation ${payload.conversationId}`);
  }

  @OnEvent('supervision.mode_changed')
  async handleSupervisionModeChanged(payload: {
    conversationId: string;
    supervisorId: string;
    supervisorName: string;
    mode: string;
    agentId?: string;
  }) {
    // 通知客服监听模式变更
    if (payload.agentId) {
      this.server.to(`user:${payload.agentId}`).emit('supervision_mode_changed', {
        conversationId: payload.conversationId,
        supervisorName: payload.supervisorName,
        mode: payload.mode,
      });
    }

    this.logger.debug(`Supervision mode changed to ${payload.mode} on conversation ${payload.conversationId}`);
  }

  @OnEvent('supervision.whisper')
  async handleSupervisionWhisper(payload: { message: any; conversationId: string; agentId: string }) {
    // 悄悄话只发给客服
    this.server.to(`user:${payload.agentId}`).emit('whisper_message', {
      message: payload.message,
      conversationId: payload.conversationId,
    });

    this.logger.debug(`Whisper message sent to agent ${payload.agentId} in conversation ${payload.conversationId}`);
  }

  // ========== SLA 告警事件 ==========

  @OnEvent('sla.alert_created')
  async handleSlaAlertCreated(payload: { alert: any; rule: any }) {
    // 广播 SLA 告警给整个租户的主管和管理员
    this.server.to(`tenant:${payload.alert.tenantId}`).emit('sla_alert', {
      alert: payload.alert,
      rule: {
        id: payload.rule.id,
        name: payload.rule.name,
        metricType: payload.rule.metricType,
        severity: payload.rule.severity,
      },
    });

    this.logger.warn(`SLA Alert broadcasted: ${payload.rule.name} (${payload.alert.severity})`);
  }

  @OnEvent('sla.send_notification')
  async handleSlaSendNotification(payload: { alert: any; rule: any; recipients: string[] }) {
    // 发送实时通知给指定角色
    this.server.to(`tenant:${payload.alert.tenantId}`).emit('sla_notification', {
      type: 'sla_violation',
      title: `SLA 告警: ${payload.rule.name}`,
      message: payload.alert.message,
      severity: payload.alert.severity,
      alertId: payload.alert.id,
    });
  }

  // ========== 机器人事件 ==========

  @OnEvent('bot.message')
  async handleBotMessage(payload: {
    conversationId: string;
    botId: string;
    content: string;
    responseType: string;
    quickReplies?: string[];
  }) {
    // 广播机器人消息到会话房间
    this.server.to(`conversation:${payload.conversationId}`).emit('bot_message', {
      conversationId: payload.conversationId,
      content: payload.content,
      type: payload.responseType,
      quickReplies: payload.quickReplies,
      timestamp: new Date(),
    });

    this.logger.debug(`Bot message sent to conversation ${payload.conversationId}`);
  }

  @OnEvent('bot.transfer')
  async handleBotTransfer(payload: {
    conversationId: string;
    botConversationId: string;
    reason: string;
    userId: string;
    preferredAgentId?: string;
    skillGroup?: string;
  }) {
    // 通知用户正在转人工
    this.server.to(`conversation:${payload.conversationId}`).emit('bot_transfer', {
      conversationId: payload.conversationId,
      reason: payload.reason,
      timestamp: new Date(),
    });

    // 通知所有在线客服有新会话需要处理
    // 根据 skillGroup 或 preferredAgentId 进行定向通知
    if (payload.preferredAgentId) {
      this.server.to(`user:${payload.preferredAgentId}`).emit('bot_transfer_request', {
        conversationId: payload.conversationId,
        userId: payload.userId,
        reason: payload.reason,
      });
    }

    this.logger.log(`Bot transfer initiated for conversation ${payload.conversationId}, reason: ${payload.reason}`);
  }

  // ========== 协同会话事件 ==========

  @SubscribeMessage('join_collaboration')
  async handleJoinCollaboration(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    // 加入协同内部消息房间
    await client.join(`collab:${data.conversationId}`);
    this.logger.debug(`${client.username} joined collaboration room ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_collaboration')
  async handleLeaveCollaboration(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`collab:${data.conversationId}`);
    this.logger.debug(`${client.username} left collaboration room ${data.conversationId}`);
    return { success: true };
  }

  @OnEvent('collaboration.invited')
  async handleCollaborationInvited(payload: {
    collaboration: any;
    inviterId: string;
    agent: any;
    conversation: any;
  }) {
    // 通知被邀请的客服
    this.server.to(`user:${payload.collaboration.agentId}`).emit('collaboration_invite', {
      collaborationId: payload.collaboration.id,
      conversationId: payload.conversation.id,
      invitedBy: payload.inviterId,
      role: payload.collaboration.role,
      reason: payload.collaboration.inviteReason,
    });

    this.logger.log(`Collaboration invite sent to agent ${payload.collaboration.agentId}`);
  }

  @OnEvent('collaboration.joined')
  async handleCollaborationJoined(payload: { collaboration: any }) {
    // 通知会话中的所有客服有新协同者加入
    this.server.to(`collab:${payload.collaboration.conversationId}`).emit('collaborator_joined', {
      collaborationId: payload.collaboration.id,
      agentId: payload.collaboration.agentId,
      agentName: payload.collaboration.agent?.displayName,
      role: payload.collaboration.role,
    });

    this.logger.log(`Agent ${payload.collaboration.agentId} joined collaboration`);
  }

  @OnEvent('collaboration.declined')
  async handleCollaborationDeclined(payload: { collaboration: any; reason?: string }) {
    // 通知邀请者协同被拒绝
    if (payload.collaboration.invitedBy) {
      this.server.to(`user:${payload.collaboration.invitedBy}`).emit('collaboration_declined', {
        collaborationId: payload.collaboration.id,
        agentId: payload.collaboration.agentId,
        reason: payload.reason,
      });
    }

    this.logger.log(`Collaboration invitation declined by agent ${payload.collaboration.agentId}`);
  }

  @OnEvent('collaboration.left')
  async handleCollaborationLeft(payload: { collaboration: any; reason?: string }) {
    // 通知会话中的所有客服有协同者退出
    this.server.to(`collab:${payload.collaboration.conversationId}`).emit('collaborator_left', {
      collaborationId: payload.collaboration.id,
      agentId: payload.collaboration.agentId,
      agentName: payload.collaboration.agent?.displayName,
      reason: payload.reason,
    });

    this.logger.log(`Agent ${payload.collaboration.agentId} left collaboration`);
  }

  @OnEvent('collaboration.internal_message')
  async handleInternalMessage(payload: { message: any; conversationId: string }) {
    // 广播内部消息到协同房间（只有客服能看到）
    this.server.to(`collab:${payload.conversationId}`).emit('internal_message', {
      message: payload.message,
    });

    this.logger.debug(`Internal message sent in conversation ${payload.conversationId}`);
  }

  // ========== 工具方法 ==========

  async getOnlineAgents(tenantId: string): Promise<string[]> {
    return this.redis.smembers(LiveChatCacheKeys.onlineAgentsKey(tenantId));
  }

  async getOnlineUsers(tenantId: string): Promise<string[]> {
    return this.redis.smembers(LiveChatCacheKeys.onlineUsersKey(tenantId));
  }

  async isUserOnline(tenantId: string, userId: string): Promise<boolean> {
    return (await this.redis.sismember(LiveChatCacheKeys.onlineUsersKey(tenantId), userId)) === 1;
  }

  async getAgentStatus(agentId: string): Promise<string | null> {
    return this.redis.get(LiveChatCacheKeys.agentStatusKey(agentId));
  }
}
