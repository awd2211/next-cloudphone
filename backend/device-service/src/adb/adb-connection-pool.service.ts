import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { AdbService } from './adb.service';

/**
 * 池化连接状态
 */
export enum PooledConnectionState {
  IDLE = 'idle',
  IN_USE = 'in_use',
  VALIDATING = 'validating',
  INVALID = 'invalid',
}

/**
 * 池化连接对象
 */
interface PooledConnection {
  deviceId: string;
  host: string;
  port: number;
  state: PooledConnectionState;
  createdAt: Date;
  lastUsedAt: Date;
  lastValidatedAt: Date | null;
  useCount: number;
  errorCount: number;
}

/**
 * 连接池配置
 */
interface ConnectionPoolConfig {
  /** 每设备最大连接数 */
  maxConnectionsPerDevice: number;
  /** 连接最大空闲时间 (ms) */
  maxIdleTimeMs: number;
  /** 连接最大生命周期 (ms) */
  maxLifetimeMs: number;
  /** 验证间隔 (ms) */
  validationIntervalMs: number;
  /** 获取连接超时 (ms) */
  acquireTimeoutMs: number;
  /** 预热连接数 */
  minIdleConnections: number;
  /** 启用验证 */
  validationEnabled: boolean;
}

/**
 * 连接获取请求
 */
interface AcquireRequest {
  deviceId: string;
  resolve: (connection: PooledConnection) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
}

/**
 * ADB 连接池服务
 *
 * 功能：
 * 1. 连接复用：减少重复建立连接的开销
 * 2. 连接预热：保持最小空闲连接数
 * 3. 健康验证：定期检查连接有效性
 * 4. 自动清理：清理空闲和过期连接
 * 5. 请求队列：连接不足时排队等待
 *
 * 使用场景：
 * - 批量操作：同时对多个设备执行命令
 * - 高频操作：频繁执行 ADB 命令
 * - 长连接：保持设备连接以减少延迟
 */
@Injectable()
export class AdbConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdbConnectionPoolService.name);

  /** 连接池 - 按设备 ID 分组 */
  private pools = new Map<string, PooledConnection[]>();

  /** 等待队列 - 按设备 ID 分组 */
  private waitQueues = new Map<string, AcquireRequest[]>();

  /** 配置 */
  private config: ConnectionPoolConfig;

  /** 服务是否正在运行 */
  private isRunning = false;

  constructor(
    private adbService: AdbService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.config = {
      maxConnectionsPerDevice: this.configService.get('ADB_POOL_MAX_CONNECTIONS', 5),
      maxIdleTimeMs: this.configService.get('ADB_POOL_MAX_IDLE_MS', 60000),
      maxLifetimeMs: this.configService.get('ADB_POOL_MAX_LIFETIME_MS', 300000),
      validationIntervalMs: this.configService.get('ADB_POOL_VALIDATION_INTERVAL_MS', 30000),
      acquireTimeoutMs: this.configService.get('ADB_POOL_ACQUIRE_TIMEOUT_MS', 10000),
      minIdleConnections: this.configService.get('ADB_POOL_MIN_IDLE', 1),
      validationEnabled: this.configService.get('ADB_POOL_VALIDATION_ENABLED', true),
    };

    this.logger.log(`ADB Connection Pool initialized with config: ${JSON.stringify(this.config)}`);
  }

  async onModuleInit() {
    this.isRunning = true;
    this.logger.log('ADB Connection Pool service started');
  }

  async onModuleDestroy() {
    this.isRunning = false;

    // 清理所有等待队列
    for (const [deviceId, queue] of this.waitQueues) {
      for (const request of queue) {
        clearTimeout(request.timeout);
        request.reject(new Error('Connection pool is shutting down'));
      }
    }
    this.waitQueues.clear();

    // 关闭所有连接
    for (const [deviceId, connections] of this.pools) {
      for (const conn of connections) {
        try {
          await this.adbService.disconnectFromDevice(conn.deviceId);
        } catch (error) {
          // 忽略关闭错误
        }
      }
    }
    this.pools.clear();

    this.logger.log('ADB Connection Pool service stopped');
  }

  /**
   * 获取连接
   *
   * @param deviceId 设备 ID
   * @param host 主机地址
   * @param port 端口号
   * @returns 池化连接对象
   */
  async acquire(deviceId: string, host: string, port: number): Promise<PooledConnection> {
    // 尝试获取空闲连接
    const idleConnection = this.getIdleConnection(deviceId);
    if (idleConnection) {
      idleConnection.state = PooledConnectionState.IN_USE;
      idleConnection.lastUsedAt = new Date();
      idleConnection.useCount++;
      this.logger.debug(`Acquired idle connection for device ${deviceId} (use count: ${idleConnection.useCount})`);
      return idleConnection;
    }

    // 检查是否可以创建新连接
    const pool = this.pools.get(deviceId) || [];
    if (pool.length < this.config.maxConnectionsPerDevice) {
      const newConnection = await this.createConnection(deviceId, host, port);
      return newConnection;
    }

    // 连接数已满，加入等待队列
    return this.waitForConnection(deviceId, host, port);
  }

  /**
   * 释放连接
   *
   * @param connection 要释放的连接
   * @param hasError 是否发生错误
   */
  release(connection: PooledConnection, hasError = false): void {
    const pool = this.pools.get(connection.deviceId);
    if (!pool) {
      this.logger.warn(`Pool not found for device ${connection.deviceId}`);
      return;
    }

    const connIndex = pool.findIndex((c) => c === connection);
    if (connIndex === -1) {
      this.logger.warn(`Connection not found in pool for device ${connection.deviceId}`);
      return;
    }

    if (hasError) {
      connection.errorCount++;
      // 错误次数过多，标记为无效
      if (connection.errorCount >= 3) {
        connection.state = PooledConnectionState.INVALID;
        this.logger.warn(`Connection for device ${connection.deviceId} marked as invalid (error count: ${connection.errorCount})`);
      }
    }

    // 检查连接是否过期
    const now = new Date();
    const age = now.getTime() - connection.createdAt.getTime();
    const idleTime = now.getTime() - connection.lastUsedAt.getTime();

    if (
      connection.state === PooledConnectionState.INVALID ||
      age > this.config.maxLifetimeMs ||
      idleTime > this.config.maxIdleTimeMs
    ) {
      // 移除过期或无效连接
      pool.splice(connIndex, 1);
      this.logger.debug(`Removed expired/invalid connection for device ${connection.deviceId}`);

      // 尝试异步断开
      this.adbService.disconnectFromDevice(connection.deviceId).catch((err) => {
        this.logger.warn(`Failed to disconnect expired connection: ${err.message}`);
      });
    } else {
      // 标记为空闲
      connection.state = PooledConnectionState.IDLE;
      connection.lastUsedAt = new Date();
    }

    // 处理等待队列
    this.processWaitQueue(connection.deviceId);
  }

  /**
   * 使用连接执行操作
   *
   * @param deviceId 设备 ID
   * @param host 主机地址
   * @param port 端口号
   * @param operation 要执行的操作
   * @returns 操作结果
   */
  async withConnection<T>(
    deviceId: string,
    host: string,
    port: number,
    operation: (connection: PooledConnection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.acquire(deviceId, host, port);
    let hasError = false;

    try {
      const result = await operation(connection);
      return result;
    } catch (error) {
      hasError = true;
      throw error;
    } finally {
      this.release(connection, hasError);
    }
  }

  /**
   * 预热连接
   *
   * @param deviceId 设备 ID
   * @param host 主机地址
   * @param port 端口号
   * @param count 预热连接数
   */
  async warmup(deviceId: string, host: string, port: number, count?: number): Promise<void> {
    const targetCount = count ?? this.config.minIdleConnections;
    const pool = this.pools.get(deviceId) || [];
    const currentIdle = pool.filter((c) => c.state === PooledConnectionState.IDLE).length;
    const toCreate = Math.min(
      targetCount - currentIdle,
      this.config.maxConnectionsPerDevice - pool.length,
    );

    if (toCreate <= 0) {
      this.logger.debug(`No warmup needed for device ${deviceId} (idle: ${currentIdle})`);
      return;
    }

    this.logger.log(`Warming up ${toCreate} connections for device ${deviceId}`);

    const results = await Promise.allSettled(
      Array(toCreate)
        .fill(null)
        .map(() => this.createConnection(deviceId, host, port, false)),
    );

    const created = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`Warmed up ${created}/${toCreate} connections for device ${deviceId}`);
  }

  /**
   * 获取连接池统计
   */
  getStats(): {
    totalDevices: number;
    totalConnections: number;
    idleConnections: number;
    inUseConnections: number;
    invalidConnections: number;
    waitingRequests: number;
    byDevice: Map<
      string,
      {
        total: number;
        idle: number;
        inUse: number;
        invalid: number;
        waiting: number;
      }
    >;
  } {
    let totalConnections = 0;
    let idleConnections = 0;
    let inUseConnections = 0;
    let invalidConnections = 0;
    let waitingRequests = 0;
    const byDevice = new Map<
      string,
      { total: number; idle: number; inUse: number; invalid: number; waiting: number }
    >();

    for (const [deviceId, pool] of this.pools) {
      let idle = 0;
      let inUse = 0;
      let invalid = 0;

      for (const conn of pool) {
        totalConnections++;
        switch (conn.state) {
          case PooledConnectionState.IDLE:
            idle++;
            idleConnections++;
            break;
          case PooledConnectionState.IN_USE:
          case PooledConnectionState.VALIDATING:
            inUse++;
            inUseConnections++;
            break;
          case PooledConnectionState.INVALID:
            invalid++;
            invalidConnections++;
            break;
        }
      }

      const waiting = this.waitQueues.get(deviceId)?.length || 0;
      waitingRequests += waiting;

      byDevice.set(deviceId, {
        total: pool.length,
        idle,
        inUse,
        invalid,
        waiting,
      });
    }

    return {
      totalDevices: this.pools.size,
      totalConnections,
      idleConnections,
      inUseConnections,
      invalidConnections,
      waitingRequests,
      byDevice,
    };
  }

  /**
   * 清理空闲连接
   */
  @Interval(60000) // 每分钟清理一次
  async cleanupIdleConnections(): Promise<void> {
    if (!this.isRunning) return;

    const now = new Date();
    let cleanedCount = 0;

    for (const [deviceId, pool] of this.pools) {
      const toRemove: number[] = [];

      for (let i = 0; i < pool.length; i++) {
        const conn = pool[i];

        // 检查空闲超时
        if (conn.state === PooledConnectionState.IDLE) {
          const idleTime = now.getTime() - conn.lastUsedAt.getTime();
          const age = now.getTime() - conn.createdAt.getTime();

          // 保留最小空闲连接数
          const idleCount = pool.filter((c) => c.state === PooledConnectionState.IDLE).length;
          if (idleCount > this.config.minIdleConnections) {
            if (idleTime > this.config.maxIdleTimeMs || age > this.config.maxLifetimeMs) {
              toRemove.push(i);
            }
          }
        }

        // 移除无效连接
        if (conn.state === PooledConnectionState.INVALID) {
          toRemove.push(i);
        }
      }

      // 从后往前移除，避免索引问题
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const conn = pool[toRemove[i]];
        pool.splice(toRemove[i], 1);
        cleanedCount++;

        // 异步断开
        this.adbService.disconnectFromDevice(conn.deviceId).catch(() => {});
      }

      // 如果池为空，移除整个设备池
      if (pool.length === 0) {
        this.pools.delete(deviceId);
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} idle/invalid connections`);
    }
  }

  /**
   * 验证连接
   */
  @Interval(30000) // 每 30 秒验证一次
  async validateConnections(): Promise<void> {
    if (!this.isRunning || !this.config.validationEnabled) return;

    const now = new Date();

    for (const [deviceId, pool] of this.pools) {
      for (const conn of pool) {
        // 只验证空闲连接
        if (conn.state !== PooledConnectionState.IDLE) continue;

        // 检查是否需要验证
        if (
          conn.lastValidatedAt &&
          now.getTime() - conn.lastValidatedAt.getTime() < this.config.validationIntervalMs
        ) {
          continue;
        }

        conn.state = PooledConnectionState.VALIDATING;

        try {
          await this.adbService.executeShellCommand(deviceId, 'echo test', 5000);
          conn.state = PooledConnectionState.IDLE;
          conn.lastValidatedAt = now;
        } catch (error) {
          this.logger.warn(`Connection validation failed for device ${deviceId}: ${error.message}`);
          conn.state = PooledConnectionState.INVALID;
          conn.errorCount++;
        }
      }
    }
  }

  /**
   * 创建新连接
   */
  private async createConnection(
    deviceId: string,
    host: string,
    port: number,
    markInUse = true,
  ): Promise<PooledConnection> {
    this.logger.debug(`Creating new connection for device ${deviceId}`);

    // 连接设备
    await this.adbService.connectToDevice(deviceId, host, port);

    // 验证连接
    await this.adbService.executeShellCommand(deviceId, 'echo test', 5000);

    const now = new Date();
    const connection: PooledConnection = {
      deviceId,
      host,
      port,
      state: markInUse ? PooledConnectionState.IN_USE : PooledConnectionState.IDLE,
      createdAt: now,
      lastUsedAt: now,
      lastValidatedAt: now,
      useCount: markInUse ? 1 : 0,
      errorCount: 0,
    };

    // 添加到池
    let pool = this.pools.get(deviceId);
    if (!pool) {
      pool = [];
      this.pools.set(deviceId, pool);
    }
    pool.push(connection);

    this.logger.debug(`Created new connection for device ${deviceId} (pool size: ${pool.length})`);

    return connection;
  }

  /**
   * 获取空闲连接
   */
  private getIdleConnection(deviceId: string): PooledConnection | null {
    const pool = this.pools.get(deviceId);
    if (!pool) return null;

    // 优先选择最近使用的连接（LRU）
    const idleConnections = pool
      .filter((c) => c.state === PooledConnectionState.IDLE)
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());

    return idleConnections[0] || null;
  }

  /**
   * 等待连接
   */
  private waitForConnection(
    deviceId: string,
    host: string,
    port: number,
  ): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // 超时，从队列移除
        const queue = this.waitQueues.get(deviceId);
        if (queue) {
          const index = queue.findIndex((r) => r.resolve === resolve);
          if (index !== -1) {
            queue.splice(index, 1);
          }
        }
        reject(new Error(`Acquire connection timeout for device ${deviceId}`));
      }, this.config.acquireTimeoutMs);

      const request: AcquireRequest = {
        deviceId,
        resolve,
        reject,
        timeout,
        createdAt: new Date(),
      };

      let queue = this.waitQueues.get(deviceId);
      if (!queue) {
        queue = [];
        this.waitQueues.set(deviceId, queue);
      }
      queue.push(request);

      this.logger.debug(`Added to wait queue for device ${deviceId} (queue size: ${queue.length})`);
    });
  }

  /**
   * 处理等待队列
   */
  private async processWaitQueue(deviceId: string): Promise<void> {
    const queue = this.waitQueues.get(deviceId);
    if (!queue || queue.length === 0) return;

    // 尝试获取空闲连接
    const idleConnection = this.getIdleConnection(deviceId);
    if (!idleConnection) return;

    // 取出第一个等待请求
    const request = queue.shift();
    if (!request) return;

    // 清除超时定时器
    clearTimeout(request.timeout);

    // 分配连接
    idleConnection.state = PooledConnectionState.IN_USE;
    idleConnection.lastUsedAt = new Date();
    idleConnection.useCount++;

    this.logger.debug(`Assigned connection to waiting request for device ${deviceId}`);

    request.resolve(idleConnection);
  }

  /**
   * 关闭设备的所有连接
   */
  async closeAllConnections(deviceId: string): Promise<void> {
    const pool = this.pools.get(deviceId);
    if (!pool) return;

    // 拒绝所有等待请求
    const queue = this.waitQueues.get(deviceId);
    if (queue) {
      for (const request of queue) {
        clearTimeout(request.timeout);
        request.reject(new Error('Connection pool closed for this device'));
      }
      this.waitQueues.delete(deviceId);
    }

    // 关闭所有连接
    for (const conn of pool) {
      try {
        await this.adbService.disconnectFromDevice(conn.deviceId);
      } catch (error) {
        // 忽略关闭错误
      }
    }

    this.pools.delete(deviceId);
    this.logger.log(`Closed all connections for device ${deviceId}`);
  }
}
