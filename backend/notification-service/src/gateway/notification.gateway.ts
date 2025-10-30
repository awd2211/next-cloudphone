import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  // Remove namespace to use root namespace '/'
  // Clients will connect to http://localhost:30006 instead of http://localhost:30006/notifications
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`客户端已连接: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // 发送欢迎消息
    client.emit('welcome', {
      message: '已连接到通知服务',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客户端已断开: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`用户 ${data.userId} 订阅通知，客户端: ${client.id}`);

    // 将客户端加入用户特定的房间
    client.join(`user:${data.userId}`);

    return {
      event: 'subscribed',
      data: {
        userId: data.userId,
        message: '订阅成功',
      },
    };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`用户 ${data.userId} 取消订阅通知，客户端: ${client.id}`);
    client.leave(`user:${data.userId}`);

    return {
      event: 'unsubscribed',
      data: {
        userId: data.userId,
        message: '取消订阅成功',
      },
    };
  }

  // ========== 对外提供的方法 ==========

  /**
   * 向特定用户发送通知
   */
  sendToUser(userId: string, notification: unknown) {
    this.logger.log(`向用户 ${userId} 发送通知`);
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * 向所有连接的客户端广播通知
   */
  broadcast(notification: unknown) {
    this.logger.log('广播通知到所有客户端');
    this.server.emit('notification', notification);
  }

  /**
   * 获取当前连接的客户端数量
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
