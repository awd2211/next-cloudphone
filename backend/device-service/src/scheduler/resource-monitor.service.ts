import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Node, NodeStatus, ResourceUsage } from "../entities/node.entity";
import { Device, DeviceStatus } from "../entities/device.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as os from "os";
import Dockerode = require("dockerode");

@Injectable()
export class ResourceMonitorService {
  private readonly logger = new Logger(ResourceMonitorService.name);

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  /**
   * 获取本地节点信息
   */
  async getLocalNodeInfo(): Promise<{
    hostname: string;
    cpuCores: number;
    totalMemoryMB: number;
    totalStorageGB: number;
  }> {
    const hostname = os.hostname();
    const cpuCores = os.cpus().length;
    const totalMemoryMB = Math.floor(os.totalmem() / (1024 * 1024));

    // 获取存储信息（简化版，实际应该查询 Docker 存储驱动）
    let totalStorageGB = 500; // 默认 500GB

    try {
      const docker = new Dockerode();
      const info = await docker.info();
      // Docker info 中没有直接的总存储大小，这里使用简化逻辑
      totalStorageGB = 500;
    } catch (error) {
      this.logger.warn(`Failed to get Docker storage info: ${error.message}`);
    }

    return {
      hostname,
      cpuCores,
      totalMemoryMB,
      totalStorageGB,
    };
  }

  /**
   * 更新节点资源使用情况
   */
  async updateNodeUsage(nodeId: string): Promise<void> {
    const node = await this.nodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      this.logger.warn(`Node ${nodeId} not found`);
      return;
    }

    try {
      // 获取该节点上的所有设备
      const devices = await this.deviceRepository.find({
        where: { status: DeviceStatus.RUNNING },
      });

      // 计算资源使用情况
      let usedCpuCores = 0;
      let usedMemoryMB = 0;
      let usedStorageGB = 0;

      for (const device of devices) {
        usedCpuCores += device.cpuCores || 0;
        usedMemoryMB += device.memoryMB || 0;
        usedStorageGB += (device.storageMB || 0) / 1024;
      }

      // 获取系统实际 CPU 和内存使用率
      const cpuUsagePercent = await this.getCurrentCpuUsage();
      const memoryUsagePercent =
        ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

      const usage: ResourceUsage = {
        usedCpuCores,
        usedMemoryMB,
        usedStorageGB,
        activeDevices: devices.length,
        cpuUsagePercent,
        memoryUsagePercent,
        storageUsagePercent:
          (usedStorageGB / node.capacity.totalStorageGB) * 100,
      };

      // 计算负载分数 (0-100)
      const loadScore = this.calculateLoadScore(usage, node.capacity);

      // 更新节点信息
      node.usage = usage;
      node.loadScore = loadScore;
      node.lastHeartbeat = new Date();
      node.failedHealthChecks = 0;

      await this.nodeRepository.save(node);

      this.logger.log(
        `Node ${node.name} usage updated: ${usage.activeDevices} devices, load score: ${loadScore.toFixed(2)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update node usage: ${error.message}`);
      node.failedHealthChecks += 1;
      await this.nodeRepository.save(node);
    }
  }

  /**
   * 计算负载分数 (0-100, 100 表示满载)
   */
  private calculateLoadScore(usage: ResourceUsage, capacity: any): number {
    const cpuScore = (usage.usedCpuCores / capacity.totalCpuCores) * 100;
    const memoryScore = (usage.usedMemoryMB / capacity.totalMemoryMB) * 100;
    const deviceScore = (usage.activeDevices / capacity.maxDevices) * 100;

    // 加权平均：CPU 30%, Memory 30%, Device Count 40%
    return cpuScore * 0.3 + memoryScore * 0.3 + deviceScore * 0.4;
  }

  /**
   * 获取当前 CPU 使用率（简化版）
   */
  private async getCurrentCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();

      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU =
          100 - ~~((100 * idleDifference) / totalDifference);
        resolve(percentageCPU);
      }, 1000);
    });
  }

  /**
   * CPU 平均值计算辅助函数
   */
  private cpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    // ✅ 明确类型标注以避免索引签名错误
    for (const cpu of cpus) {
      for (const type of Object.keys(cpu.times) as Array<keyof typeof cpu.times>) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length,
    };
  }

  /**
   * 定时更新所有在线节点的资源使用情况
   * 每30秒执行一次
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateAllNodesUsage(): Promise<void> {
    this.logger.log("Updating resource usage for all nodes");

    const nodes = await this.nodeRepository.find({
      where: { status: NodeStatus.ONLINE },
    });

    for (const node of nodes) {
      await this.updateNodeUsage(node.id);
    }
  }

  /**
   * 检查节点健康状态
   * 每分钟执行一次
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkNodesHealth(): Promise<void> {
    this.logger.log("Checking nodes health");

    const nodes = await this.nodeRepository.find();

    for (const node of nodes) {
      const now = new Date();
      const lastHeartbeat = node.lastHeartbeat
        ? new Date(node.lastHeartbeat)
        : new Date(0);
      const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();

      // 如果超过3分钟没有心跳，标记为离线
      if (
        timeSinceLastHeartbeat > 3 * 60 * 1000 &&
        node.status === NodeStatus.ONLINE
      ) {
        this.logger.warn(`Node ${node.name} is offline (no heartbeat)`);
        node.status = NodeStatus.OFFLINE;
        await this.nodeRepository.save(node);
      }

      // 如果健康检查失败超过5次，标记为离线
      if (node.failedHealthChecks >= 5 && node.status === NodeStatus.ONLINE) {
        this.logger.warn(
          `Node ${node.name} is offline (health check failures: ${node.failedHealthChecks})`,
        );
        node.status = NodeStatus.OFFLINE;
        await this.nodeRepository.save(node);
      }
    }
  }

  /**
   * 获取集群资源统计
   */
  async getClusterStats(): Promise<any> {
    const nodes = await this.nodeRepository.find();

    const totalCapacity = {
      cpuCores: 0,
      memoryMB: 0,
      storageGB: 0,
      maxDevices: 0,
    };

    const totalUsage = {
      cpuCores: 0,
      memoryMB: 0,
      storageGB: 0,
      devices: 0,
    };

    let onlineNodes = 0;
    let offlineNodes = 0;

    for (const node of nodes) {
      if (node.status === NodeStatus.ONLINE) {
        onlineNodes++;
        totalCapacity.cpuCores += node.capacity.totalCpuCores;
        totalCapacity.memoryMB += node.capacity.totalMemoryMB;
        totalCapacity.storageGB += node.capacity.totalStorageGB;
        totalCapacity.maxDevices += node.capacity.maxDevices;

        totalUsage.cpuCores += node.usage.usedCpuCores;
        totalUsage.memoryMB += node.usage.usedMemoryMB;
        totalUsage.storageGB += node.usage.usedStorageGB;
        totalUsage.devices += node.usage.activeDevices;
      } else {
        offlineNodes++;
      }
    }

    return {
      nodes: {
        total: nodes.length,
        online: onlineNodes,
        offline: offlineNodes,
      },
      capacity: totalCapacity,
      usage: totalUsage,
      utilization: {
        cpu:
          totalCapacity.cpuCores > 0
            ? (totalUsage.cpuCores / totalCapacity.cpuCores) * 100
            : 0,
        memory:
          totalCapacity.memoryMB > 0
            ? (totalUsage.memoryMB / totalCapacity.memoryMB) * 100
            : 0,
        storage:
          totalCapacity.storageGB > 0
            ? (totalUsage.storageGB / totalCapacity.storageGB) * 100
            : 0,
        devices:
          totalCapacity.maxDevices > 0
            ? (totalUsage.devices / totalCapacity.maxDevices) * 100
            : 0,
      },
    };
  }
}
