import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Device, DeviceStatus } from "../entities/device.entity";
import { DockerService } from "../docker/docker.service";
import { AdbService } from "../adb/adb.service";
import { EventBusService } from "@cloudphone/shared";
import { MetricsService } from "../metrics/metrics.service";

export interface HealthCheckResult {
  deviceId: string;
  healthy: boolean;
  issues: string[];
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    containerStatus?: string;
    adbConnected?: boolean;
  };
}

@Injectable()
export class EnhancedHealthService {
  private readonly logger = new Logger(EnhancedHealthService.name);

  // 健康检查阈值配置
  private readonly CPU_WARNING_THRESHOLD = 80; // CPU 使用率超过 80% 告警
  private readonly CPU_CRITICAL_THRESHOLD = 95; // CPU 使用率超过 95% 严重告警
  private readonly MEMORY_WARNING_THRESHOLD = 85; // 内存使用率超过 85% 告警
  private readonly MEMORY_CRITICAL_THRESHOLD = 95; // 内存使用率超过 95% 严重告警
  private readonly HEARTBEAT_TIMEOUT_SECONDS = 300; // 5分钟无心跳视为离线

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dockerService: DockerService,
    private adbService: AdbService,
    private eventBus: EventBusService,
    private metricsService: MetricsService,
  ) {}

  /**
   * 定时健康检查任务（每 5 分钟）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck() {
    this.logger.log("Starting device health check...");

    try {
      // 获取所有应该运行的设备
      const devices = await this.deviceRepository.find({
        where: [
          { status: DeviceStatus.RUNNING },
          { status: DeviceStatus.CREATING },
        ],
      });

      this.logger.log(`Checking health for ${devices.length} devices`);

      const results: HealthCheckResult[] = [];

      for (const device of devices) {
        const result = await this.checkDeviceHealth(device);
        results.push(result);

        // 处理不健康的设备
        if (!result.healthy) {
          await this.handleUnhealthyDevice(device, result);
        }
      }

      // 统计健康状态
      const healthyCount = results.filter((r) => r.healthy).length;
      const unhealthyCount = results.length - healthyCount;

      this.logger.log(
        `Health check completed: ${healthyCount} healthy, ${unhealthyCount} unhealthy`,
      );
    } catch (error) {
      this.logger.error("Health check failed", error.stack);
    }
  }

  /**
   * 检查单个设备的健康状态
   */
  async checkDeviceHealth(device: Device): Promise<HealthCheckResult> {
    const issues: string[] = [];
    const metrics: any = {};

    try {
      // 1. 检查 Docker 容器状态
      const containerName = `cloudphone-${device.id}`;
      const containerInfo =
        await this.dockerService.getContainerInfo(containerName);

      if (!containerInfo) {
        issues.push("Container not found");
        return {
          deviceId: device.id,
          healthy: false,
          issues,
          metrics,
        };
      }

      const containerStatus = containerInfo.State.Status;
      metrics.containerStatus = containerStatus;

      // 容器应该在运行
      if (
        device.status === DeviceStatus.RUNNING &&
        containerStatus !== "running"
      ) {
        issues.push(`Container not running (status: ${containerStatus})`);
      }

      // 容器健康检查状态
      if (containerInfo.State.Health) {
        const healthStatus = containerInfo.State.Health.Status;
        if (healthStatus === "unhealthy") {
          issues.push(`Container health check failed`);
        }
      }

      // 2. 检查资源使用情况
      if (containerStatus === "running") {
        const stats = await this.dockerService.getContainerStats(containerName);

        if (stats) {
          // CPU 使用率检查
          if (stats.cpu_percent !== undefined) {
            metrics.cpuUsage = stats.cpu_percent;

            if (stats.cpu_percent > this.CPU_CRITICAL_THRESHOLD) {
              issues.push(
                `CPU usage critical: ${stats.cpu_percent.toFixed(1)}%`,
              );
            } else if (stats.cpu_percent > this.CPU_WARNING_THRESHOLD) {
              issues.push(`CPU usage high: ${stats.cpu_percent.toFixed(1)}%`);
            }
          }

          // 内存使用率检查
          if (stats.memory_percent !== undefined) {
            metrics.memoryUsage = stats.memory_percent;

            if (stats.memory_percent > this.MEMORY_CRITICAL_THRESHOLD) {
              issues.push(
                `Memory usage critical: ${stats.memory_percent.toFixed(1)}%`,
              );
            } else if (stats.memory_percent > this.MEMORY_WARNING_THRESHOLD) {
              issues.push(
                `Memory usage high: ${stats.memory_percent.toFixed(1)}%`,
              );
            }
          }
        }
      }

      // 3. 检查 ADB 连接状态（仅对运行中的设备）
      if (device.status === DeviceStatus.RUNNING) {
        try {
          // 尝试执行简单的 ADB 命令来验证连接
          await this.adbService.executeShellCommand(
            device.id,
            "echo test",
            3000,
          );
          metrics.adbConnected = true;
        } catch (error) {
          metrics.adbConnected = false;
          issues.push(`ADB connection failed: ${error.message}`);
        }
      }

      // 4. 检查心跳超时
      if (device.lastHeartbeatAt) {
        const timeSinceLastHeartbeat =
          (Date.now() - device.lastHeartbeatAt.getTime()) / 1000;

        if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT_SECONDS) {
          issues.push(
            `Heartbeat timeout: ${Math.floor(timeSinceLastHeartbeat)}s since last heartbeat`,
          );
        }
      }

      return {
        deviceId: device.id,
        healthy: issues.length === 0,
        issues,
        metrics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check health for device ${device.id}`,
        error.stack,
      );

      return {
        deviceId: device.id,
        healthy: false,
        issues: [`Health check error: ${error.message}`],
        metrics,
      };
    }
  }

  /**
   * 处理不健康的设备
   */
  private async handleUnhealthyDevice(
    device: Device,
    result: HealthCheckResult,
  ) {
    this.logger.warn(
      `Device ${device.id} is unhealthy: ${result.issues.join(", ")}`,
    );

    // 判断严重程度
    const isCritical = result.issues.some(
      (issue) =>
        issue.includes("critical") ||
        issue.includes("not found") ||
        issue.includes("not running"),
    );

    // 发布设备错误事件
    await this.eventBus.publish("cloudphone.events", "device.error", {
      eventId: `device-error-${device.id}-${Date.now()}`,
      eventType: "device.error",
      timestamp: new Date().toISOString(),
      priority: isCritical ? "high" : "medium",
      payload: {
        deviceId: device.id,
        deviceName: device.name,
        userId: device.userId,
        errorType: this.categorizeError(result.issues),
        errorMessage: result.issues.join("; "),
        occurredAt: new Date().toISOString(),
        priority: isCritical ? "high" : "medium",
        metrics: result.metrics,
      },
    });

    // 如果是容器不存在或未运行，尝试自动恢复
    if (
      result.issues.some(
        (issue) =>
          issue.includes("Container not found") ||
          issue.includes("Container not running"),
      )
    ) {
      await this.attemptAutoRecovery(device, "container_issue");
    }

    // 如果是 ADB 连接问题，尝试重连
    if (
      result.issues.some((issue) => issue.includes("ADB connection failed"))
    ) {
      await this.attemptAutoRecovery(device, "adb_issue");
    }

    // 记录到设备的元数据
    device.metadata = {
      ...device.metadata,
      lastHealthCheck: new Date().toISOString(),
      lastHealthIssues: result.issues,
      lastHealthMetrics: result.metrics,
    };
    await this.deviceRepository.save(device);
  }

  /**
   * 对错误进行分类
   */
  private categorizeError(issues: string[]): string {
    if (issues.some((i) => i.includes("Container not found"))) {
      return "container_missing";
    }
    if (issues.some((i) => i.includes("Container not running"))) {
      return "container_stopped";
    }
    if (issues.some((i) => i.includes("CPU usage critical"))) {
      return "high_cpu";
    }
    if (issues.some((i) => i.includes("Memory usage critical"))) {
      return "high_memory";
    }
    if (issues.some((i) => i.includes("ADB connection failed"))) {
      return "adb_disconnected";
    }
    if (issues.some((i) => i.includes("Heartbeat timeout"))) {
      return "heartbeat_timeout";
    }
    return "unknown";
  }

  /**
   * 尝试自动恢复
   */
  private async attemptAutoRecovery(device: Device, issueType: string) {
    this.logger.log(
      `Attempting auto-recovery for device ${device.id} (issue: ${issueType})`,
    );

    try {
      if (issueType === "container_issue") {
        // 尝试重启容器
        const containerName = `cloudphone-${device.id}`;
        try {
          await this.dockerService.restartContainer(containerName);
          this.logger.log(`Container restarted for device ${device.id}`);

          // 发布恢复成功事件
          await this.eventBus.publish("cloudphone.events", "device.recovered", {
            eventId: `device-recovered-${device.id}-${Date.now()}`,
            eventType: "device.recovered",
            timestamp: new Date().toISOString(),
            priority: "low",
            payload: {
              deviceId: device.id,
              deviceName: device.name,
              userId: device.userId,
              recoveryType: "container_restart",
              recoveredAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          this.logger.error(
            `Failed to restart container for device ${device.id}`,
            error.stack,
          );
        }
      } else if (issueType === "adb_issue") {
        // 尝试重新连接 ADB
        try {
          await this.adbService.disconnectFromDevice(device.id);
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待 2 秒
          await this.adbService.connectToDevice(
            device.id,
            device.adbHost,
            device.adbPort,
          );
          this.logger.log(`ADB reconnected for device ${device.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to reconnect ADB for device ${device.id}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Auto-recovery failed for device ${device.id}`,
        error.stack,
      );

      // 记录恢复失败的 metrics
      this.metricsService.recordOperationError("auto_recovery", issueType);
    }
  }

  /**
   * 检查特定设备的健康状态（手动触发）
   */
  async checkDevice(deviceId: string): Promise<HealthCheckResult> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    return await this.checkDeviceHealth(device);
  }
}
