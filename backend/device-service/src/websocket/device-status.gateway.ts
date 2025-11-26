import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { ConnectionState } from '../adb/adb-reconnection.service';
import {
  DeviceHealthResult,
  BatchHealthCheckResult,
} from '../health/concurrent-health-check.service';

/**
 * 设备状态变更事件
 */
export interface DeviceStatusChangeEvent {
  deviceId: string;
  previousState: ConnectionState;
  currentState: ConnectionState;
  reason?: string;
  timestamp: Date;
}

/**
 * 设备健康检查事件
 */
export interface DeviceHealthEvent {
  deviceId: string;
  healthy: boolean;
  issues: string[];
  metrics: Record<string, any>;
  checkedAt: Date;
}

/**
 * 批量健康检查完成事件
 */
export interface BatchHealthCheckCompletedEvent {
  totalDevices: number;
  healthyCount: number;
  unhealthyCount: number;
  errorCount: number;
  totalDurationMs: number;
}

/**
 * 健康检查进度事件
 */
export interface HealthCheckProgressEvent {
  completed: number;
  total: number;
  progress: number;
  elapsedMs: number;
}

/**
 * 订阅配置
 */
interface SubscriptionConfig {
  /** 订阅的设备 ID 列表（空数组表示订阅全部） */
  deviceIds: string[];
  /** 是否接收健康检查事件 */
  healthEvents: boolean;
  /** 是否接收连接状态事件 */
  connectionEvents: boolean;
  /** 是否接收进度事件 */
  progressEvents: boolean;
}

/**
 * DeviceStatusGateway
 *
 * 设备状态 WebSocket 网关
 *
 * 功能：
 * - 推送设备连接状态变更（connected, disconnected, reconnecting, failed）
 * - 推送健康检查结果
 * - 支持订阅特定设备或全部设备
 * - 批量健康检查进度追踪
 *
 * WebSocket 命名空间：
 * - /device-status
 *
 * 事件（服务端发送）：
 * - status_change - 设备连接状态变更
 * - health_result - 单设备健康检查结果
 * - health_batch_completed - 批量健康检查完成
 * - health_progress - 健康检查进度
 *
 * 事件（客户端发送）：
 * - subscribe - 订阅设备状态
 * - unsubscribe - 取消订阅
 * - get_status - 获取设备当前状态
 */
@WebSocketGateway({
  namespace: 'device-status',
  cors: {
    origin: '*', // 生产环境应该限制具体域名
  },
})
@Injectable()
export class DeviceStatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeviceStatusGateway.name);

  /** 客户端订阅配置 Map<socketId, SubscriptionConfig> */
  private clientSubscriptions: Map<string, SubscriptionConfig> = new Map();

  /** 设备当前状态缓存 Map<deviceId, ConnectionState> */
  private deviceStateCache: Map<string, ConnectionState> = new Map();

  /** 设备最新健康检查结果缓存 Map<deviceId, DeviceHealthResult> */
  private deviceHealthCache: Map<string, DeviceHealthResult> = new Map();

  afterInit() {
    this.logger.log('Device Status WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // 初始化默认订阅配置
    this.clientSubscriptions.set(client.id, {
      deviceIds: [],
      healthEvents: true,
      connectionEvents: true,
      progressEvents: false,
    });
  }

  handleDisconnect(client: Socket) {
    this.clientSubscriptions.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 订阅设备状态
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody()
    data: {
      deviceIds?: string[];
      healthEvents?: boolean;
      connectionEvents?: boolean;
      progressEvents?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const config: SubscriptionConfig = {
      deviceIds: data.deviceIds || [],
      healthEvents: data.healthEvents !== false,
      connectionEvents: data.connectionEvents !== false,
      progressEvents: data.progressEvents || false,
    };

    this.clientSubscriptions.set(client.id, config);

    this.logger.log(
      `Client ${client.id} subscribed: devices=${config.deviceIds.length || 'all'}, ` +
        `health=${config.healthEvents}, connection=${config.connectionEvents}, progress=${config.progressEvents}`,
    );

    // 发送当前缓存的状态
    this.sendCachedStatus(client, config);

    client.emit('subscribed', {
      success: true,
      config,
    });
  }

  /**
   * 取消订阅
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    this.clientSubscriptions.delete(client.id);
    this.logger.log(`Client ${client.id} unsubscribed`);

    client.emit('unsubscribed', { success: true });
  }

  /**
   * 获取设备当前状态
   */
  @SubscribeMessage('get_status')
  handleGetStatus(
    @MessageBody() data: { deviceIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const deviceIds = data.deviceIds || Array.from(this.deviceStateCache.keys());
    const statuses: Record<string, any> = {};

    for (const deviceId of deviceIds) {
      const state = this.deviceStateCache.get(deviceId);
      const health = this.deviceHealthCache.get(deviceId);

      statuses[deviceId] = {
        connectionState: state || 'unknown',
        health: health
          ? {
              healthy: health.healthy,
              issues: health.issues,
              metrics: health.metrics,
              checkedAt: health.checkedAt,
            }
          : null,
      };
    }

    client.emit('device_status', {
      deviceIds,
      statuses,
    });
  }

  /**
   * 监听设备状态变更事件（来自 AdbReconnectionService）
   */
  @OnEvent('device.connection.state_change')
  handleDeviceStateChange(event: DeviceStatusChangeEvent) {
    // 更新缓存
    this.deviceStateCache.set(event.deviceId, event.currentState);

    this.logger.debug(
      `Device ${event.deviceId} state: ${event.previousState} -> ${event.currentState}`,
    );

    // 广播给订阅者
    this.broadcastToSubscribers(
      'status_change',
      {
        deviceId: event.deviceId,
        previousState: event.previousState,
        currentState: event.currentState,
        reason: event.reason,
        timestamp: event.timestamp,
      },
      event.deviceId,
      'connectionEvents',
    );
  }

  /**
   * 监听设备连接成功事件
   */
  @OnEvent('device.connected')
  handleDeviceConnected(payload: { deviceId: string; host: string; port: number }) {
    const event: DeviceStatusChangeEvent = {
      deviceId: payload.deviceId,
      previousState: ConnectionState.CONNECTING,
      currentState: ConnectionState.CONNECTED,
      timestamp: new Date(),
    };

    this.deviceStateCache.set(payload.deviceId, ConnectionState.CONNECTED);

    this.broadcastToSubscribers(
      'status_change',
      event,
      payload.deviceId,
      'connectionEvents',
    );
  }

  /**
   * 监听设备断开连接事件
   */
  @OnEvent('device.disconnected')
  handleDeviceDisconnected(payload: { deviceId: string; reason?: string }) {
    const previousState =
      this.deviceStateCache.get(payload.deviceId) || ConnectionState.CONNECTED;
    const event: DeviceStatusChangeEvent = {
      deviceId: payload.deviceId,
      previousState,
      currentState: ConnectionState.DISCONNECTED,
      reason: payload.reason,
      timestamp: new Date(),
    };

    this.deviceStateCache.set(payload.deviceId, ConnectionState.DISCONNECTED);

    this.broadcastToSubscribers(
      'status_change',
      event,
      payload.deviceId,
      'connectionEvents',
    );
  }

  /**
   * 监听重连事件
   */
  @OnEvent('device.reconnecting')
  handleDeviceReconnecting(payload: {
    deviceId: string;
    attempt: number;
    maxAttempts: number;
    nextRetryMs: number;
  }) {
    const previousState =
      this.deviceStateCache.get(payload.deviceId) || ConnectionState.DISCONNECTED;
    const event: DeviceStatusChangeEvent = {
      deviceId: payload.deviceId,
      previousState,
      currentState: ConnectionState.RECONNECTING,
      reason: `Attempt ${payload.attempt}/${payload.maxAttempts}, next retry in ${payload.nextRetryMs}ms`,
      timestamp: new Date(),
    };

    this.deviceStateCache.set(payload.deviceId, ConnectionState.RECONNECTING);

    this.broadcastToSubscribers(
      'status_change',
      {
        ...event,
        reconnectInfo: {
          attempt: payload.attempt,
          maxAttempts: payload.maxAttempts,
          nextRetryMs: payload.nextRetryMs,
        },
      },
      payload.deviceId,
      'connectionEvents',
    );
  }

  /**
   * 监听重连失败事件
   */
  @OnEvent('device.reconnect_failed')
  handleReconnectFailed(payload: {
    deviceId: string;
    attempts: number;
    lastError?: string;
  }) {
    const previousState =
      this.deviceStateCache.get(payload.deviceId) || ConnectionState.RECONNECTING;
    const event: DeviceStatusChangeEvent = {
      deviceId: payload.deviceId,
      previousState,
      currentState: ConnectionState.FAILED,
      reason: `Failed after ${payload.attempts} attempts: ${payload.lastError || 'Unknown error'}`,
      timestamp: new Date(),
    };

    this.deviceStateCache.set(payload.deviceId, ConnectionState.FAILED);

    this.broadcastToSubscribers(
      'status_change',
      event,
      payload.deviceId,
      'connectionEvents',
    );
  }

  /**
   * 监听健康检查完成事件
   */
  @OnEvent('health-check.completed')
  handleHealthCheckCompleted(result: BatchHealthCheckCompletedEvent) {
    this.logger.log(
      `Batch health check completed: ${result.healthyCount}/${result.totalDevices} healthy`,
    );

    // 广播给订阅进度事件的客户端
    for (const [socketId, config] of this.clientSubscriptions.entries()) {
      if (config.progressEvents) {
        this.server.to(socketId).emit('health_batch_completed', result);
      }
    }
  }

  /**
   * 监听健康检查进度事件
   */
  @OnEvent('health-check.progress')
  handleHealthCheckProgress(progress: HealthCheckProgressEvent) {
    // 广播给订阅进度事件的客户端
    for (const [socketId, config] of this.clientSubscriptions.entries()) {
      if (config.progressEvents) {
        this.server.to(socketId).emit('health_progress', progress);
      }
    }
  }

  /**
   * 更新设备健康状态（供外部调用）
   */
  updateDeviceHealth(result: DeviceHealthResult) {
    // 更新缓存
    this.deviceHealthCache.set(result.deviceId, result);

    // 广播给订阅者
    this.broadcastToSubscribers(
      'health_result',
      {
        deviceId: result.deviceId,
        healthy: result.healthy,
        issues: result.issues,
        metrics: result.metrics,
        checkDurationMs: result.checkDurationMs,
        checkedAt: result.checkedAt,
      },
      result.deviceId,
      'healthEvents',
    );
  }

  /**
   * 广播给订阅者
   */
  private broadcastToSubscribers(
    event: string,
    data: any,
    deviceId: string,
    eventType: keyof SubscriptionConfig,
  ) {
    for (const [socketId, config] of this.clientSubscriptions.entries()) {
      // 检查是否订阅了此类型事件
      if (!config[eventType]) continue;

      // 检查是否订阅了此设备
      const subscribesAll = config.deviceIds.length === 0;
      const subscribesDevice = config.deviceIds.includes(deviceId);

      if (subscribesAll || subscribesDevice) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * 发送缓存的状态给新订阅的客户端
   */
  private sendCachedStatus(client: Socket, config: SubscriptionConfig) {
    const deviceIds =
      config.deviceIds.length > 0
        ? config.deviceIds
        : Array.from(this.deviceStateCache.keys());

    const statuses: Array<{
      deviceId: string;
      connectionState: ConnectionState;
      health?: DeviceHealthResult;
    }> = [];

    for (const deviceId of deviceIds) {
      const state = this.deviceStateCache.get(deviceId);
      const health = this.deviceHealthCache.get(deviceId);

      if (state || health) {
        statuses.push({
          deviceId,
          connectionState: state || ConnectionState.DISCONNECTED,
          health,
        });
      }
    }

    if (statuses.length > 0) {
      client.emit('initial_status', {
        devices: statuses,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 获取当前连接的客户端数量
   */
  getConnectedClientsCount(): number {
    return this.clientSubscriptions.size;
  }

  /**
   * 获取订阅特定设备的客户端数量
   */
  getDeviceSubscribersCount(deviceId: string): number {
    let count = 0;
    for (const config of this.clientSubscriptions.values()) {
      if (config.deviceIds.length === 0 || config.deviceIds.includes(deviceId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 清除设备缓存（设备删除时调用）
   */
  clearDeviceCache(deviceId: string) {
    this.deviceStateCache.delete(deviceId);
    this.deviceHealthCache.delete(deviceId);
  }
}
