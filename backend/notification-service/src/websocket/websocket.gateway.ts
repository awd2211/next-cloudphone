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

// WebSocket 连接信息接口
interface ConnectionInfo {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastPingAt: Date;
  missedPings: number;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
  // Socket.IO 配置优化
  pingTimeout: 60000,  // 60秒
  pingInterval: 25000, // 25秒自动ping
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'],
  // WebSocket 压缩配置
  perMessageDeflate: {
    threshold: 1024, // 消息大小超过 1KB 时才压缩
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3, // 压缩级别 0-9, 3 是速度和压缩率的平衡
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10, // 并发压缩限制
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private connections = new Map<string, ConnectionInfo>(); // socketId -> ConnectionInfo
  private heartbeatInterval: NodeJS.Timeout; // 心跳检测定时器

  // 配置常量
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒检查一次
  private readonly MAX_MISSED_PINGS = 3; // 最多允许3次未响应
  private readonly PING_TIMEOUT = 10000; // ping超时时间 10秒

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    this.startHeartbeatMonitoring();
  }

  // 启动心跳监控
  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.HEARTBEAT_INTERVAL);

    this.logger.log(
      `Heartbeat monitoring started (interval: ${this.HEARTBEAT_INTERVAL}ms)`,
    );
  }

  // 检查所有连接的心跳状态
  private checkHeartbeats() {
    const now = new Date();
    const deadConnections: string[] = [];

    this.connections.forEach((conn, socketId) => {
      const timeSinceLastPing = now.getTime() - conn.lastPingAt.getTime();

      // 如果超过心跳超时时间未响应
      if (timeSinceLastPing > this.PING_TIMEOUT) {
        conn.missedPings++;
        this.logger.warn(
          `Socket ${socketId} (user: ${conn.userId}) missed ping #${conn.missedPings}`,
        );

        // 如果连续未响应次数超过限制，标记为死连接
        if (conn.missedPings >= this.MAX_MISSED_PINGS) {
          deadConnections.push(socketId);
        }
      } else {
        // 重置未响应计数
        conn.missedPings = 0;
      }
    });

    // 清理死连接
    deadConnections.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        const conn = this.connections.get(socketId);
        this.logger.error(
          `Disconnecting dead socket ${socketId} (user: ${conn?.userId}, missed: ${conn?.missedPings} pings)`,
        );
        socket.disconnect(true);
      }
      this.connections.delete(socketId);
    });

    if (deadConnections.length > 0) {
      this.logger.log(`Cleaned up ${deadConnections.length} dead connections`);
    }
  }

  // 停止心跳监控
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.logger.log('Heartbeat monitoring stopped');
    }
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

    // 记录连接信息
    const now = new Date();
    this.connections.set(client.id, {
      socketId: client.id,
      userId,
      connectedAt: now,
      lastPingAt: now,
      missedPings: 0,
    });

    // 加入用户专属房间
    client.join(`user:${userId}`);

    this.logger.log(`Client ${client.id} connected for user ${userId}`);
    // 安全地获取连接数
    const totalConnections = this.server?.sockets?.sockets?.size || 0;
    this.logger.log(
      `Total connections: ${totalConnections}, Tracked: ${this.connections.size}`,
    );
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // 清理连接信息
    const conn = this.connections.get(client.id);
    if (conn) {
      const duration = Date.now() - conn.connectedAt.getTime();
      this.logger.log(
        `Client ${client.id} disconnected (user: ${userId}, duration: ${Math.round(duration / 1000)}s)`,
      );
      this.connections.delete(client.id);
    } else {
      this.logger.log(`Client ${client.id} disconnected`);
    }
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

  // 获取连接统计信息
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userSockets.size,
      connections: Array.from(this.connections.values()).map((conn) => ({
        socketId: conn.socketId,
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        lastPingAt: conn.lastPingAt,
        missedPings: conn.missedPings,
        duration: Math.round((Date.now() - conn.connectedAt.getTime()) / 1000),
      })),
    };
  }

  // 获取用户的所有连接
  getUserConnections(userId: string): ConnectionInfo[] {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map((socketId) => this.connections.get(socketId))
      .filter((conn): conn is ConnectionInfo => conn !== undefined);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; data: string } {
    // 更新连接的最后 ping 时间
    const conn = this.connections.get(client.id);
    if (conn) {
      conn.lastPingAt = new Date();
      conn.missedPings = 0;
    }

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
