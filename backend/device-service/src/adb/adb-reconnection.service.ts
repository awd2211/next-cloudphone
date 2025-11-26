import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { EventBusService } from '@cloudphone/shared';
import { AdbService } from './adb.service';

/**
 * 连接状态枚举
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

/**
 * 设备连接信息
 */
interface DeviceConnection {
  deviceId: string;
  host: string;
  port: number;
  state: ConnectionState;
  retryCount: number;
  lastAttempt: Date | null;
  lastSuccess: Date | null;
  lastError: string | null;
  nextRetryAt: Date | null;
}

/**
 * 重连配置
 */
interface ReconnectionConfig {
  /** 初始重试延迟 (ms) */
  initialDelayMs: number;
  /** 最大重试延迟 (ms) */
  maxDelayMs: number;
  /** 最大重试次数（0 表示无限重试） */
  maxRetries: number;
  /** 退避乘数 */
  backoffMultiplier: number;
  /** 抖动因子 (0-1) */
  jitterFactor: number;
  /** 连接超时 (ms) */
  connectionTimeoutMs: number;
  /** 健康检查间隔 (ms) */
  healthCheckIntervalMs: number;
}

/**
 * ADB 自动重连服务
 *
 * 功能：
 * 1. 智能重连：指数退避 + 随机抖动
 * 2. 连接状态机：追踪每个设备的连接生命周期
 * 3. 自动恢复：检测断连并自动重连
 * 4. 事件通知：连接状态变化时发布事件
 * 5. 健康监控：定期检查活跃连接
 */
@Injectable()
export class AdbReconnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdbReconnectionService.name);

  /** 设备连接状态映射 */
  private connections = new Map<string, DeviceConnection>();

  /** 重连定时器映射 */
  private retryTimers = new Map<string, NodeJS.Timeout>();

  /** 配置 */
  private config: ReconnectionConfig;

  /** 服务是否正在运行 */
  private isRunning = false;

  constructor(
    private adbService: AdbService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private eventBus: EventBusService,
  ) {
    this.config = {
      initialDelayMs: this.configService.get('ADB_RECONNECT_INITIAL_DELAY_MS', 1000),
      maxDelayMs: this.configService.get('ADB_RECONNECT_MAX_DELAY_MS', 60000),
      maxRetries: this.configService.get('ADB_RECONNECT_MAX_RETRIES', 10),
      backoffMultiplier: this.configService.get('ADB_RECONNECT_BACKOFF_MULTIPLIER', 2),
      jitterFactor: this.configService.get('ADB_RECONNECT_JITTER_FACTOR', 0.1),
      connectionTimeoutMs: this.configService.get('ADB_CONNECTION_TIMEOUT_MS', 10000),
      healthCheckIntervalMs: this.configService.get('ADB_HEALTH_CHECK_INTERVAL_MS', 30000),
    };

    this.logger.log(`ADB Reconnection service initialized with config: ${JSON.stringify(this.config)}`);
  }

  async onModuleInit() {
    this.isRunning = true;
    this.logger.log('ADB Reconnection service started');
  }

  async onModuleDestroy() {
    this.isRunning = false;

    // 清理所有重试定时器
    for (const [deviceId, timer] of this.retryTimers) {
      clearTimeout(timer);
      this.logger.debug(`Cleared retry timer for device ${deviceId}`);
    }
    this.retryTimers.clear();

    this.logger.log('ADB Reconnection service stopped');
  }

  /**
   * 注册设备连接进行监控
   *
   * @param deviceId 设备 ID
   * @param host 主机地址
   * @param port 端口号
   */
  registerDevice(deviceId: string, host: string, port: number): void {
    if (this.connections.has(deviceId)) {
      this.logger.warn(`Device ${deviceId} is already registered`);
      return;
    }

    const connection: DeviceConnection = {
      deviceId,
      host,
      port,
      state: ConnectionState.DISCONNECTED,
      retryCount: 0,
      lastAttempt: null,
      lastSuccess: null,
      lastError: null,
      nextRetryAt: null,
    };

    this.connections.set(deviceId, connection);
    this.logger.log(`Registered device ${deviceId} (${host}:${port}) for reconnection monitoring`);
  }

  /**
   * 注销设备连接监控
   *
   * @param deviceId 设备 ID
   */
  unregisterDevice(deviceId: string): void {
    // 取消重试定时器
    const timer = this.retryTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(deviceId);
    }

    this.connections.delete(deviceId);
    this.logger.log(`Unregistered device ${deviceId} from reconnection monitoring`);
  }

  /**
   * 连接设备（带自动重连）
   *
   * @param deviceId 设备 ID
   * @param host 主机地址
   * @param port 端口号
   */
  async connect(deviceId: string, host: string, port: number): Promise<void> {
    // 注册设备（如果尚未注册）
    if (!this.connections.has(deviceId)) {
      this.registerDevice(deviceId, host, port);
    }

    const connection = this.connections.get(deviceId)!;

    // 更新连接信息
    connection.host = host;
    connection.port = port;

    // 执行连接
    await this.attemptConnection(deviceId);
  }

  /**
   * 断开设备连接
   *
   * @param deviceId 设备 ID
   * @param removeFromMonitoring 是否从监控中移除
   */
  async disconnect(deviceId: string, removeFromMonitoring = false): Promise<void> {
    // 取消重试定时器
    const timer = this.retryTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(deviceId);
    }

    try {
      await this.adbService.disconnectFromDevice(deviceId);
    } catch (error) {
      this.logger.warn(`Error disconnecting device ${deviceId}: ${error.message}`);
    }

    const connection = this.connections.get(deviceId);
    if (connection) {
      this.updateState(deviceId, ConnectionState.DISCONNECTED);
      connection.retryCount = 0;
      connection.nextRetryAt = null;
    }

    if (removeFromMonitoring) {
      this.unregisterDevice(deviceId);
    }
  }

  /**
   * 标记设备离线（触发自动重连）
   *
   * @param deviceId 设备 ID
   * @param reason 离线原因
   */
  markOffline(deviceId: string, reason?: string): void {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      this.logger.warn(`Cannot mark offline: device ${deviceId} not registered`);
      return;
    }

    this.logger.warn(`Device ${deviceId} marked offline: ${reason || 'unknown reason'}`);

    connection.lastError = reason || 'Connection lost';
    this.updateState(deviceId, ConnectionState.RECONNECTING);

    // 触发重连
    this.scheduleRetry(deviceId);
  }

  /**
   * 获取设备连接状态
   *
   * @param deviceId 设备 ID
   * @returns 连接信息
   */
  getConnectionInfo(deviceId: string): DeviceConnection | undefined {
    return this.connections.get(deviceId);
  }

  /**
   * 获取所有连接状态
   *
   * @returns 所有设备的连接信息
   */
  getAllConnections(): Map<string, DeviceConnection> {
    return new Map(this.connections);
  }

  /**
   * 获取连接统计
   */
  getStats(): {
    total: number;
    connected: number;
    connecting: number;
    reconnecting: number;
    failed: number;
    disconnected: number;
  } {
    let connected = 0;
    let connecting = 0;
    let reconnecting = 0;
    let failed = 0;
    let disconnected = 0;

    for (const conn of this.connections.values()) {
      switch (conn.state) {
        case ConnectionState.CONNECTED:
          connected++;
          break;
        case ConnectionState.CONNECTING:
          connecting++;
          break;
        case ConnectionState.RECONNECTING:
          reconnecting++;
          break;
        case ConnectionState.FAILED:
          failed++;
          break;
        case ConnectionState.DISCONNECTED:
          disconnected++;
          break;
      }
    }

    return {
      total: this.connections.size,
      connected,
      connecting,
      reconnecting,
      failed,
      disconnected,
    };
  }

  /**
   * 定期检查活跃连接的健康状态
   */
  @Interval(30000) // 每 30 秒检查一次
  async checkActiveConnections(): Promise<void> {
    if (!this.isRunning) return;

    const connectedDevices = Array.from(this.connections.values()).filter(
      (c) => c.state === ConnectionState.CONNECTED,
    );

    if (connectedDevices.length === 0) return;

    this.logger.debug(`Checking health of ${connectedDevices.length} connected devices`);

    for (const connection of connectedDevices) {
      try {
        // 尝试执行简单命令验证连接
        await this.adbService.executeShellCommand(connection.deviceId, 'echo test', 5000);
        connection.lastSuccess = new Date();
      } catch (error) {
        this.logger.warn(
          `Health check failed for device ${connection.deviceId}: ${error.message}`,
        );
        this.markOffline(connection.deviceId, `Health check failed: ${error.message}`);
      }
    }
  }

  /**
   * 尝试连接设备
   */
  private async attemptConnection(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      throw new Error(`Device ${deviceId} not registered`);
    }

    // 更新状态
    const previousState = connection.state;
    if (previousState === ConnectionState.RECONNECTING) {
      // 保持 RECONNECTING 状态
    } else {
      this.updateState(deviceId, ConnectionState.CONNECTING);
    }

    connection.lastAttempt = new Date();

    try {
      // 尝试连接
      await this.adbService.connectToDevice(deviceId, connection.host, connection.port);

      // 验证连接（执行简单命令）
      await this.adbService.executeShellCommand(deviceId, 'echo test', this.config.connectionTimeoutMs);

      // 连接成功
      connection.state = ConnectionState.CONNECTED;
      connection.lastSuccess = new Date();
      connection.retryCount = 0;
      connection.lastError = null;
      connection.nextRetryAt = null;

      this.updateState(deviceId, ConnectionState.CONNECTED);

      this.logger.log(
        `Device ${deviceId} connected successfully (${connection.host}:${connection.port})`,
      );

      // 发布连接成功事件
      this.emitConnectionEvent(deviceId, 'connected');
    } catch (error) {
      // 连接失败
      connection.lastError = error.message;
      connection.retryCount++;

      this.logger.warn(
        `Connection attempt ${connection.retryCount} failed for device ${deviceId}: ${error.message}`,
      );

      // 检查是否超过最大重试次数
      if (this.config.maxRetries > 0 && connection.retryCount >= this.config.maxRetries) {
        this.updateState(deviceId, ConnectionState.FAILED);
        this.logger.error(
          `Device ${deviceId} reached max retries (${this.config.maxRetries}), giving up`,
        );
        this.emitConnectionEvent(deviceId, 'failed', error.message);
      } else {
        // 安排重试
        this.updateState(deviceId, ConnectionState.RECONNECTING);
        this.scheduleRetry(deviceId);
      }
    }
  }

  /**
   * 安排重试
   */
  private scheduleRetry(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (!connection) return;

    // 取消现有定时器
    const existingTimer = this.retryTimers.get(deviceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 计算延迟（指数退避 + 随机抖动）
    const delay = this.calculateRetryDelay(connection.retryCount);
    connection.nextRetryAt = new Date(Date.now() + delay);

    this.logger.log(
      `Scheduling retry for device ${deviceId} in ${delay}ms (attempt ${connection.retryCount + 1})`,
    );

    // 设置定时器
    const timer = setTimeout(async () => {
      this.retryTimers.delete(deviceId);

      if (!this.isRunning) return;

      const conn = this.connections.get(deviceId);
      if (conn && conn.state === ConnectionState.RECONNECTING) {
        await this.attemptConnection(deviceId);
      }
    }, delay);

    this.retryTimers.set(deviceId, timer);
  }

  /**
   * 计算重试延迟（指数退避 + 随机抖动）
   *
   * 公式: baseDelay × (multiplier ^ retryCount) × (1 ± jitter)
   *
   * @param retryCount 当前重试次数
   * @returns 延迟毫秒数
   */
  private calculateRetryDelay(retryCount: number): number {
    // 指数退避
    const exponentialDelay =
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, retryCount);

    // 限制最大延迟
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);

    // 添加随机抖动
    const jitter = 1 + (Math.random() * 2 - 1) * this.config.jitterFactor;
    const finalDelay = Math.floor(cappedDelay * jitter);

    return finalDelay;
  }

  /**
   * 更新连接状态并发布事件
   */
  private updateState(deviceId: string, newState: ConnectionState): void {
    const connection = this.connections.get(deviceId);
    if (!connection) return;

    const oldState = connection.state;
    if (oldState === newState) return;

    connection.state = newState;

    this.logger.debug(`Device ${deviceId} state changed: ${oldState} → ${newState}`);

    // 发布状态变更事件（供 WebSocket Gateway 监听）
    this.eventEmitter.emit('device.connection.state_change', {
      deviceId,
      previousState: oldState,
      currentState: newState,
      reason: connection.lastError,
      timestamp: new Date(),
    });

    // 发布特定状态事件
    switch (newState) {
      case ConnectionState.CONNECTED:
        this.eventEmitter.emit('device.connected', {
          deviceId,
          host: connection.host,
          port: connection.port,
        });
        break;
      case ConnectionState.DISCONNECTED:
        this.eventEmitter.emit('device.disconnected', {
          deviceId,
          reason: connection.lastError,
        });
        break;
      case ConnectionState.RECONNECTING:
        this.eventEmitter.emit('device.reconnecting', {
          deviceId,
          attempt: connection.retryCount,
          maxAttempts: this.config.maxRetries,
          nextRetryMs: connection.nextRetryAt
            ? connection.nextRetryAt.getTime() - Date.now()
            : 0,
        });
        break;
      case ConnectionState.FAILED:
        this.eventEmitter.emit('device.reconnect_failed', {
          deviceId,
          attempts: connection.retryCount,
          lastError: connection.lastError,
        });
        break;
    }
  }

  /**
   * 发布连接事件到消息队列
   */
  private async emitConnectionEvent(
    deviceId: string,
    eventType: 'connected' | 'disconnected' | 'failed' | 'reconnecting',
    errorMessage?: string,
  ): Promise<void> {
    const connection = this.connections.get(deviceId);

    try {
      await this.eventBus.publish('cloudphone.events', `device.connection.${eventType}`, {
        deviceId,
        eventType,
        host: connection?.host,
        port: connection?.port,
        retryCount: connection?.retryCount || 0,
        errorMessage,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to emit connection event: ${error.message}`);
    }
  }

  /**
   * 强制重连设备
   *
   * @param deviceId 设备 ID
   */
  async forceReconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      throw new Error(`Device ${deviceId} not registered`);
    }

    this.logger.log(`Force reconnecting device ${deviceId}`);

    // 重置重试计数
    connection.retryCount = 0;
    connection.lastError = null;

    // 先断开
    try {
      await this.adbService.disconnectFromDevice(deviceId);
    } catch (error) {
      // 忽略断开错误
    }

    // 重新连接
    await this.attemptConnection(deviceId);
  }

  /**
   * 批量连接设备
   *
   * @param devices 设备列表
   * @param concurrency 并发数
   */
  async connectBatch(
    devices: Array<{ deviceId: string; host: string; port: number }>,
    concurrency = 10,
  ): Promise<Map<string, { success: boolean; error?: string }>> {
    const results = new Map<string, { success: boolean; error?: string }>();

    // 分批处理
    for (let i = 0; i < devices.length; i += concurrency) {
      const batch = devices.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (device) => {
          try {
            await this.connect(device.deviceId, device.host, device.port);
            return { deviceId: device.deviceId, success: true };
          } catch (error) {
            return { deviceId: device.deviceId, success: false, error: error.message };
          }
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.deviceId, {
            success: result.value.success,
            error: result.value.error,
          });
        } else {
          // 不应该发生，但以防万一
          this.logger.error(`Unexpected batch error: ${result.reason}`);
        }
      }
    }

    return results;
  }
}
