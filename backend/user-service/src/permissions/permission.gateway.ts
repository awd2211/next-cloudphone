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
import { PermissionCacheService, CachedUserPermissions } from './permission-cache.service';

/**
 * 权限 WebSocket Gateway
 *
 * 功能：
 * - 实时推送权限变更通知
 * - 用户订阅自己的权限变更
 * - 支持批量通知（角色、租户级别）
 *
 * 连接方式：
 * ```javascript
 * const socket = io('http://localhost:30001');
 * socket.emit('subscribe:permissions', { userId: 'user-123' });
 * socket.on('permissions:changed', (data) => {
 *   console.log('权限已更新:', data);
 * });
 * ```
 */
@WebSocketGateway({
  namespace: '/permissions', // ws://localhost:30001/permissions
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PermissionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PermissionGateway.name);
  private connectedClients: Map<string, Socket> = new Map();
  private userSubscriptions: Map<string, Set<string>> = new Map(); // userId → Set<clientId>

  constructor(private readonly permissionCacheService: PermissionCacheService) {}

  /**
   * WebSocket 服务器初始化完成后的回调
   */
  afterInit(server: Server) {
    this.logger.log('权限 WebSocket Gateway 已初始化');
    // ✅ 注册 Gateway 到 PermissionCacheService（建立双向引用）
    this.permissionCacheService.setGateway(this);
  }

  handleConnection(client: Socket) {
    this.logger.log(`客户端已连接: ${client.id}`);
    this.connectedClients.set(client.id, client);

    client.emit('connected', {
      message: '已连接到权限推送服务',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客户端已断开: ${client.id}`);

    // 清理订阅
    this.userSubscriptions.forEach((clients, userId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    });

    this.connectedClients.delete(client.id);
  }

  /**
   * 用户订阅权限变更
   *
   * @example
   * socket.emit('subscribe:permissions', { userId: 'user-123' });
   */
  @SubscribeMessage('subscribe:permissions')
  async handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    this.logger.log(`用户 ${userId} 订阅权限变更，客户端: ${client.id}`);

    // 记录订阅关系
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId)!.add(client.id);

    // 加入用户房间
    client.join(`user:${userId}`);

    // 立即推送当前权限（可选）
    const permissions = await this.permissionCacheService.getUserPermissions(userId);

    return {
      event: 'subscribed',
      data: {
        userId,
        message: '订阅成功',
        currentPermissions: permissions
          ? {
              roles: permissions.roles,
              permissionCount: permissions.permissions.length,
              isSuperAdmin: permissions.isSuperAdmin,
              cachedAt: permissions.cachedAt,
            }
          : null,
      },
    };
  }

  /**
   * 取消订阅权限变更
   */
  @SubscribeMessage('unsubscribe:permissions')
  handleUnsubscribe(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const { userId } = data;

    this.logger.log(`用户 ${userId} 取消订阅权限变更，客户端: ${client.id}`);

    // 移除订阅关系
    const clients = this.userSubscriptions.get(userId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }

    client.leave(`user:${userId}`);

    return {
      event: 'unsubscribed',
      data: {
        userId,
        message: '取消订阅成功',
      },
    };
  }

  /**
   * 推送权限变更通知给指定用户
   *
   * @param userId 用户ID
   * @param permissions 新的权限数据
   * @param reason 变更原因
   */
  async notifyUserPermissionChanged(
    userId: string,
    permissions: CachedUserPermissions,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`推送权限变更通知给用户: ${userId}, 原因: ${reason || '权限更新'}`);

    this.server.to(`user:${userId}`).emit('permissions:changed', {
      userId,
      permissions: {
        roles: permissions.roles,
        permissions: permissions.permissions.map((p) => p.name),
        isSuperAdmin: permissions.isSuperAdmin,
        permissionCount: permissions.permissions.length,
        updatedAt: new Date().toISOString(),
      },
      reason: reason || '权限已更新',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 批量推送权限变更通知
   *
   * @param userIds 用户ID列表
   * @param reason 变更原因
   */
  async notifyBatchPermissionChanged(userIds: string[], reason?: string): Promise<void> {
    this.logger.log(`批量推送权限变更通知，影响用户数: ${userIds.length}`);

    const promises = userIds.map(async (userId) => {
      const permissions = await this.permissionCacheService.getUserPermissions(userId);
      if (permissions) {
        await this.notifyUserPermissionChanged(userId, permissions, reason);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 推送角色权限变更通知（通知所有拥有该角色的用户）
   *
   * @param roleId 角色ID
   * @param reason 变更原因
   */
  async notifyRolePermissionChanged(roleId: string, reason?: string): Promise<void> {
    this.logger.log(`角色 ${roleId} 权限已变更: ${reason || '角色权限更新'}`);

    // 广播给所有订阅的客户端，由客户端判断是否需要刷新
    this.server.emit('role:permission:changed', {
      roleId,
      reason: reason || '角色权限已更新，请刷新获取最新权限',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 推送租户权限变更通知
   *
   * @param tenantId 租户ID
   * @param reason 变更原因
   */
  async notifyTenantPermissionChanged(tenantId: string, reason?: string): Promise<void> {
    this.logger.log(`租户 ${tenantId} 权限配置已变更: ${reason || '租户配置更新'}`);

    this.server.emit('tenant:permission:changed', {
      tenantId,
      reason: reason || '租户权限配置已更新，请刷新页面',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取在线统计
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      subscribedUsers: this.userSubscriptions.size,
      totalSubscriptions: Array.from(this.userSubscriptions.values()).reduce(
        (sum, clients) => sum + clients.size,
        0,
      ),
    };
  }
}
