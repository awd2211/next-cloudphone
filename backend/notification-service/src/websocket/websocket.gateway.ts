import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      this.logger.warn(`Client ${client.id} connected without userId`);
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    // 加入用户专属房间
    client.join(`user:${userId}`);

    this.logger.log(`Client ${client.id} connected for user ${userId}`);
    this.logger.log(`Total connections: ${this.server.sockets.sockets.size}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  // 发送通知给特定用户
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Sent ${event} to user ${userId}`);
  }

  // 发送通知给所有在线用户
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast ${event} to all users`);
  }

  // 获取用户在线状态
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  // 获取在线用户数
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; data: string } {
    return { event: 'pong', data: new Date().toISOString() };
  }

  @SubscribeMessage('mark_read')
  handleMarkRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.debug(`Mark notification ${data.notificationId} as read`);
    // 实际的标记已读逻辑会在 NotificationsService 中处理
  }
}
