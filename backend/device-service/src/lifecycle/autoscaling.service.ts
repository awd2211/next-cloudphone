import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Device, DeviceStatus } from '../entities/device.entity';
import { DockerService } from '../docker/docker.service';
import { EventBusService, DistributedLockService } from '@cloudphone/shared';
import { MetricsService } from '../metrics/metrics.service';

export interface AutoScalingConfig {
  enabled: boolean;
  minDevices: number;
  maxDevices: number;
  targetCpuUtilization: number; // 目标 CPU 使用率 (%)
  targetMemoryUtilization: number; // 目标内存使用率 (%)
  scaleUpThreshold: number; // 扩容阈值 (%)
  scaleDownThreshold: number; // 缩容阈值 (%)
  cooldownMinutes: number; // 冷却时间（分钟）
  scaleUpIncrement: number; // 每次扩容增加的设备数
  scaleDownDecrement: number; // 每次缩容减少的设备数
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'no_action';
  reason: string;
  currentDevices: number;
  targetDevices: number;
  avgCpuUtilization: number;
  avgMemoryUtilization: number;
  timestamp: Date;
}

export interface ScalingResult {
  success: boolean;
  action: string;
  devicesChanged: number;
  errors: string[];
}

/**
 * 设备自动扩缩容服务
 *
 * 根据资源使用率自动调整设备数量：
 * - 负载高时自动扩容（创建新设备）
 * - 负载低时自动缩容（停止/删除空闲设备）
 */
@Injectable()
export class AutoScalingService {
  private readonly logger = new Logger(AutoScalingService.name);

  private config: AutoScalingConfig;
  private lastScalingTime: Date | null = null;
  private scalingHistory: ScalingDecision[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dockerService: DockerService,
    private configService: ConfigService,
    private eventBus: EventBusService,
    private metricsService: MetricsService,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
  ) {
    this.loadConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      enabled: this.configService.get<boolean>('AUTOSCALING_ENABLED', false),
      minDevices: +this.configService.get('AUTOSCALING_MIN_DEVICES', 0),
      maxDevices: +this.configService.get('AUTOSCALING_MAX_DEVICES', 100),
      targetCpuUtilization: +this.configService.get('AUTOSCALING_TARGET_CPU', 70),
      targetMemoryUtilization: +this.configService.get('AUTOSCALING_TARGET_MEMORY', 70),
      scaleUpThreshold: +this.configService.get('AUTOSCALING_SCALE_UP_THRESHOLD', 80),
      scaleDownThreshold: +this.configService.get('AUTOSCALING_SCALE_DOWN_THRESHOLD', 30),
      cooldownMinutes: +this.configService.get('AUTOSCALING_COOLDOWN_MINUTES', 10),
      scaleUpIncrement: +this.configService.get('AUTOSCALING_SCALE_UP_INCREMENT', 2),
      scaleDownDecrement: +this.configService.get('AUTOSCALING_SCALE_DOWN_DECREMENT', 1),
    };

    this.logger.log(`自动扩缩容配置已加载: ${this.config.enabled ? '已启用' : '已禁用'}`);
    this.logger.debug(`配置详情: ${JSON.stringify(this.config)}`);
  }

  /**
   * 定时任务：自动扩缩容检查（每5分钟）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performAutoScaling(): Promise<ScalingResult> {
    if (!this.config.enabled) {
      return {
        success: true,
        action: 'disabled',
        devicesChanged: 0,
        errors: [],
      };
    }

    this.logger.log('开始自动扩缩容检查...');

    try {
      // 1. 检查冷却时间
      if (!this.canScale()) {
        this.logger.log(
          `处于冷却期，跳过本次扩缩容 (冷却时间: ${this.config.cooldownMinutes} 分钟)`
        );
        return {
          success: true,
          action: 'cooldown',
          devicesChanged: 0,
          errors: [],
        };
      }

      // 2. 收集当前资源使用情况
      const metrics = await this.collectMetrics();

      // 3. 做出扩缩容决策
      const decision = await this.makeScalingDecision(metrics);

      // 4. 记录决策历史
      this.recordDecision(decision);

      // 5. 执行扩缩容操作
      if (decision.action === 'scale_up') {
        return await this.scaleUp(decision);
      } else if (decision.action === 'scale_down') {
        return await this.scaleDown(decision);
      }

      return {
        success: true,
        action: 'no_action',
        devicesChanged: 0,
        errors: [],
      };
    } catch (error) {
      this.logger.error('自动扩缩容检查失败', error.stack);
      return {
        success: false,
        action: 'error',
        devicesChanged: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * 收集资源使用指标
   */
  private async collectMetrics(): Promise<{
    currentDevices: number;
    runningDevices: number;
    avgCpuUtilization: number;
    avgMemoryUtilization: number;
  }> {
    // 获取所有运行中的设备
    const runningDevices = await this.deviceRepository.find({
      where: { status: DeviceStatus.RUNNING },
    });

    const totalDevices = await this.deviceRepository.count();

    if (runningDevices.length === 0) {
      return {
        currentDevices: totalDevices,
        runningDevices: 0,
        avgCpuUtilization: 0,
        avgMemoryUtilization: 0,
      };
    }

    // 收集每个设备的资源使用率
    let totalCpu = 0;
    let totalMemory = 0;
    let validCount = 0;

    for (const device of runningDevices) {
      try {
        if (!device.containerId) continue;

        const stats = await this.dockerService.getContainerStats(device.containerId);

        if (stats?.cpu_percent !== undefined && stats?.memory_percent !== undefined) {
          totalCpu += stats.cpu_percent;
          totalMemory += stats.memory_percent;
          validCount++;
        }
      } catch (error) {
        this.logger.warn(`获取设备 ${device.id} 资源使用率失败: ${error.message}`);
      }
    }

    const avgCpu = validCount > 0 ? totalCpu / validCount : 0;
    const avgMemory = validCount > 0 ? totalMemory / validCount : 0;

    this.logger.debug(
      `资源使用率 - CPU: ${avgCpu.toFixed(2)}%, 内存: ${avgMemory.toFixed(2)}%, 设备数: ${runningDevices.length}/${totalDevices}`
    );

    return {
      currentDevices: totalDevices,
      runningDevices: runningDevices.length,
      avgCpuUtilization: avgCpu,
      avgMemoryUtilization: avgMemory,
    };
  }

  /**
   * 做出扩缩容决策
   */
  private async makeScalingDecision(metrics: {
    currentDevices: number;
    runningDevices: number;
    avgCpuUtilization: number;
    avgMemoryUtilization: number;
  }): Promise<ScalingDecision> {
    const { currentDevices, avgCpuUtilization, avgMemoryUtilization } = metrics;

    let action: 'scale_up' | 'scale_down' | 'no_action' = 'no_action';
    let reason = '资源使用率在正常范围内';
    let targetDevices = currentDevices;

    // 判断是否需要扩容
    if (
      avgCpuUtilization >= this.config.scaleUpThreshold ||
      avgMemoryUtilization >= this.config.scaleUpThreshold
    ) {
      if (currentDevices < this.config.maxDevices) {
        action = 'scale_up';
        targetDevices = Math.min(
          currentDevices + this.config.scaleUpIncrement,
          this.config.maxDevices
        );
        reason = `资源使用率过高 (CPU: ${avgCpuUtilization.toFixed(1)}%, 内存: ${avgMemoryUtilization.toFixed(1)}%)`;
      } else {
        reason = `已达到最大设备数限制 (${this.config.maxDevices})`;
      }
    }
    // 判断是否需要缩容
    else if (
      avgCpuUtilization <= this.config.scaleDownThreshold &&
      avgMemoryUtilization <= this.config.scaleDownThreshold &&
      currentDevices > this.config.minDevices
    ) {
      action = 'scale_down';
      targetDevices = Math.max(
        currentDevices - this.config.scaleDownDecrement,
        this.config.minDevices
      );
      reason = `资源使用率过低 (CPU: ${avgCpuUtilization.toFixed(1)}%, 内存: ${avgMemoryUtilization.toFixed(1)}%)`;
    }

    const decision: ScalingDecision = {
      action,
      reason,
      currentDevices,
      targetDevices,
      avgCpuUtilization,
      avgMemoryUtilization,
      timestamp: new Date(),
    };

    this.logger.log(
      `扩缩容决策: ${action.toUpperCase()} - ${reason} (当前: ${currentDevices}, 目标: ${targetDevices})`
    );

    return decision;
  }

  /**
   * 执行扩容
   */
  private async scaleUp(decision: ScalingDecision): Promise<ScalingResult> {
    const count = decision.targetDevices - decision.currentDevices;
    this.logger.log(`执行扩容: 增加 ${count} 个设备`);

    const errors: string[] = [];
    let created = 0;

    // 这里需要一个默认的设备配置模板
    // 实际应该从配置或数据库中读取
    const deviceTemplate = {
      name: `auto-scaled-device-${Date.now()}`,
      cpuCores: 2,
      memoryMB: 2048,
      storageMB: 8192,
      resolution: '1080x1920',
      dpi: 320,
      androidVersion: '11',
    };

    for (let i = 0; i < count; i++) {
      try {
        // 这里应该调用 DevicesService.create()
        // 但由于循环依赖问题，我们可以发布事件让其他服务处理
        await this.eventBus.publish('cloudphone.events', 'autoscaling.scale_up', {
          eventId: `autoscale-up-${Date.now()}-${i}`,
          eventType: 'autoscaling.scale_up',
          timestamp: new Date().toISOString(),
          priority: 'high',
          payload: {
            deviceTemplate,
            reason: decision.reason,
            metrics: {
              cpu: decision.avgCpuUtilization,
              memory: decision.avgMemoryUtilization,
            },
          },
        });

        created++;
      } catch (error) {
        this.logger.error(`扩容失败 (设备 ${i + 1}/${count})`, error.stack);
        errors.push(`设备 ${i + 1}: ${error.message}`);
      }
    }

    this.lastScalingTime = new Date();

    // 记录指标
    this.metricsService.recordOperationDuration('autoscaling_scale_up', Date.now() / 1000);

    // 发布扩容完成事件
    await this.eventBus.publish('cloudphone.events', 'autoscaling.completed', {
      eventId: `autoscale-completed-${Date.now()}`,
      eventType: 'autoscaling.completed',
      timestamp: new Date().toISOString(),
      priority: 'medium',
      payload: {
        action: 'scale_up',
        devicesChanged: created,
        decision,
        errors,
      },
    });

    return {
      success: errors.length === 0,
      action: 'scale_up',
      devicesChanged: created,
      errors,
    };
  }

  /**
   * 执行缩容
   */
  private async scaleDown(decision: ScalingDecision): Promise<ScalingResult> {
    const count = decision.currentDevices - decision.targetDevices;
    this.logger.log(`执行缩容: 减少 ${count} 个设备`);

    const errors: string[] = [];
    let removed = 0;

    // 找出最空闲的设备进行缩容
    const candidates = await this.deviceRepository
      .createQueryBuilder('device')
      .where('device.status = :status', { status: DeviceStatus.RUNNING })
      .andWhere('device.userId IS NULL') // 优先选择未分配的设备
      .orderBy('device.lastActiveAt', 'ASC') // 按最后活跃时间排序
      .limit(count)
      .getMany();

    if (candidates.length === 0) {
      this.logger.warn('没有找到合适的设备进行缩容');
      return {
        success: true,
        action: 'scale_down',
        devicesChanged: 0,
        errors: ['没有合适的设备可缩容'],
      };
    }

    for (const device of candidates) {
      try {
        // 发布缩容事件
        await this.eventBus.publish('cloudphone.events', 'autoscaling.scale_down', {
          eventId: `autoscale-down-${device.id}-${Date.now()}`,
          eventType: 'autoscaling.scale_down',
          timestamp: new Date().toISOString(),
          priority: 'medium',
          payload: {
            deviceId: device.id,
            deviceName: device.name,
            reason: decision.reason,
            metrics: {
              cpu: decision.avgCpuUtilization,
              memory: decision.avgMemoryUtilization,
            },
          },
        });

        removed++;
      } catch (error) {
        this.logger.error(`缩容失败 (设备 ${device.id})`, error.stack);
        errors.push(`设备 ${device.id}: ${error.message}`);
      }
    }

    this.lastScalingTime = new Date();

    // 记录指标
    this.metricsService.recordOperationDuration('autoscaling_scale_down', Date.now() / 1000);

    // 发布缩容完成事件
    await this.eventBus.publish('cloudphone.events', 'autoscaling.completed', {
      eventId: `autoscale-completed-${Date.now()}`,
      eventType: 'autoscaling.completed',
      timestamp: new Date().toISOString(),
      priority: 'medium',
      payload: {
        action: 'scale_down',
        devicesChanged: removed,
        decision,
        errors,
      },
    });

    return {
      success: errors.length === 0,
      action: 'scale_down',
      devicesChanged: removed,
      errors,
    };
  }

  /**
   * 检查是否可以执行扩缩容（冷却时间检查）
   */
  private canScale(): boolean {
    if (!this.lastScalingTime) {
      return true;
    }

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - this.lastScalingTime.getTime();

    return elapsed >= cooldownMs;
  }

  /**
   * 记录决策历史
   */
  private recordDecision(decision: ScalingDecision): void {
    this.scalingHistory.push(decision);

    // 保持历史记录在合理范围内
    if (this.scalingHistory.length > this.MAX_HISTORY) {
      this.scalingHistory.shift();
    }
  }

  /**
   * 获取扩缩容历史
   */
  getScalingHistory(limit: number = 20): ScalingDecision[] {
    return this.scalingHistory.slice(-limit).reverse();
  }

  /**
   * 获取当前配置
   */
  getConfig(): AutoScalingConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<AutoScalingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log(`自动扩缩容配置已更新: ${JSON.stringify(updates)}`);
  }

  /**
   * 手动触发扩缩容检查
   */
  async triggerManualScaling(): Promise<ScalingResult> {
    this.logger.log('手动触发扩缩容检查');
    return await this.performAutoScaling();
  }

  /**
   * 获取当前状态
   */
  async getStatus(): Promise<{
    enabled: boolean;
    lastScalingTime: Date | null;
    canScale: boolean;
    cooldownRemaining: number;
    recentDecisions: ScalingDecision[];
  }> {
    const canScale = this.canScale();
    let cooldownRemaining = 0;

    if (!canScale && this.lastScalingTime) {
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
      const elapsed = Date.now() - this.lastScalingTime.getTime();
      cooldownRemaining = Math.ceil((cooldownMs - elapsed) / 1000);
    }

    return {
      enabled: this.config.enabled,
      lastScalingTime: this.lastScalingTime,
      canScale,
      cooldownRemaining,
      recentDecisions: this.getScalingHistory(10),
    };
  }
}
