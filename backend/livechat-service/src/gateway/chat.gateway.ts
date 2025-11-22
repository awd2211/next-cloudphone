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
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CacheService } from '../cache/cache.service';

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
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2,
  ) {}

  afterInit(server: Server) {
    this.logger.log('LiveChat WebSocket Gateway initialized');
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
        await this.redis.sadd(this.cacheService.onlineAgentsKey(client.tenantId), client.userId);
        await this.redis.set(this.cacheService.agentStatusKey(client.userId), 'online', 'EX', 3600);
      } else {
        await this.redis.sadd(this.cacheService.onlineUsersKey(client.tenantId), client.userId);
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
        await this.redis.srem(this.cacheService.onlineAgentsKey(client.tenantId), client.userId);
        await this.redis.del(this.cacheService.agentStatusKey(client.userId));
      } else {
        await this.redis.srem(this.cacheService.onlineUsersKey(client.tenantId), client.userId);
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
        this.cacheService.userTypingKey(data.conversationId, client.userId!),
        '1',
        'EX',
        5,
      );
    } else {
      await this.redis.del(this.cacheService.userTypingKey(data.conversationId, client.userId!));
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
      this.cacheService.agentStatusKey(client.userId!),
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

  // ========== 工具方法 ==========

  async getOnlineAgents(tenantId: string): Promise<string[]> {
    return this.redis.smembers(this.cacheService.onlineAgentsKey(tenantId));
  }

  async getOnlineUsers(tenantId: string): Promise<string[]> {
    return this.redis.smembers(this.cacheService.onlineUsersKey(tenantId));
  }

  async isUserOnline(tenantId: string, userId: string): Promise<boolean> {
    return (await this.redis.sismember(this.cacheService.onlineUsersKey(tenantId), userId)) === 1;
  }

  async getAgentStatus(agentId: string): Promise<string | null> {
    return this.redis.get(this.cacheService.agentStatusKey(agentId));
  }
}
