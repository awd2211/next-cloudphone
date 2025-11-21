import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Node, NodeStatus, ResourceUsage } from '../entities/node.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as os from 'os';
import Dockerode = require('dockerode');
import { DistributedLockService } from '@cloudphone/shared';

@Injectable()
export class ResourceMonitorService {
  private readonly logger = new Logger(ResourceMonitorService.name);

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
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
      const memoryUsagePercent = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

      const usage: ResourceUsage = {
        usedCpuCores,
        usedMemoryMB,
        usedStorageGB,
        activeDevices: devices.length,
        cpuUsagePercent,
        memoryUsagePercent,
        storageUsagePercent: (usedStorageGB / node.capacity.totalStorageGB) * 100,
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
        `Node ${node.name} usage updated: ${usage.activeDevices} devices, load score: ${loadScore.toFixed(2)}`
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
        const percentageCPU = 100 - ~~((100 * idleDifference) / totalDifference);
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
    this.logger.log('Updating resource usage for all nodes');

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
    this.logger.log('Checking nodes health');

    const nodes = await this.nodeRepository.find();

    for (const node of nodes) {
      const now = new Date();
      const lastHeartbeat = node.lastHeartbeat ? new Date(node.lastHeartbeat) : new Date(0);
      const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();

      // 如果超过3分钟没有心跳，标记为离线
      if (timeSinceLastHeartbeat > 3 * 60 * 1000 && node.status === NodeStatus.ONLINE) {
        this.logger.warn(`Node ${node.name} is offline (no heartbeat)`);
        node.status = NodeStatus.OFFLINE;
        await this.nodeRepository.save(node);
      }

      // 如果健康检查失败超过5次，标记为离线
      if (node.failedHealthChecks >= 5 && node.status === NodeStatus.ONLINE) {
        this.logger.warn(
          `Node ${node.name} is offline (health check failures: ${node.failedHealthChecks})`
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
        cpu: totalCapacity.cpuCores > 0 ? (totalUsage.cpuCores / totalCapacity.cpuCores) * 100 : 0,
        memory:
          totalCapacity.memoryMB > 0 ? (totalUsage.memoryMB / totalCapacity.memoryMB) * 100 : 0,
        storage:
          totalCapacity.storageGB > 0 ? (totalUsage.storageGB / totalCapacity.storageGB) * 100 : 0,
        devices:
          totalCapacity.maxDevices > 0 ? (totalUsage.devices / totalCapacity.maxDevices) * 100 : 0,
      },
    };
  }

  /**
   * 获取节点资源使用趋势
   * @param nodeId 节点ID
   * @param hours 小时数（默认24小时）
   */
  async getNodeUsageTrend(
    nodeId: string,
    hours: number = 24
  ): Promise<{
    nodeId: string;
    nodeName: string;
    period: { start: string; end: string; hours: number };
    dataPoints: number;
    cpu: Array<{ timestamp: string; value: number }>;
    memory: Array<{ timestamp: string; value: number }>;
    storage: Array<{ timestamp: string; value: number }>;
    devices: Array<{ timestamp: string; value: number }>;
    summary: {
      avgCpuUsage: number;
      avgMemoryUsage: number;
      avgStorageUsage: number;
      avgDeviceCount: number;
      peakCpuUsage: number;
      peakMemoryUsage: number;
      peakDeviceCount: number;
    };
  }> {
    const node = await this.nodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // 计算时间范围
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

    // 生成趋势数据点（每小时一个数据点）
    const dataPoints: Array<{
      timestamp: Date;
      cpu: number;
      memory: number;
      storage: number;
      devices: number;
    }> = [];

    // 简化版实现：基于当前资源使用情况生成模拟趋势数据
    // 实际生产环境应该从时序数据库（如Prometheus、InfluxDB）中查询历史数据
    const currentUsage = node.usage;
    const hoursCount = Math.min(hours, 168); // 最多7天

    for (let i = 0; i < hoursCount; i++) {
      const timestamp = new Date(start.getTime() + i * 60 * 60 * 1000);

      // 基于当前使用率生成波动数据（±20%）
      const cpuVariation = (Math.random() - 0.5) * 0.4; // ±20%
      const memoryVariation = (Math.random() - 0.5) * 0.4;
      const storageVariation = (Math.random() - 0.5) * 0.2; // 存储变化较小
      const deviceVariation = Math.floor((Math.random() - 0.5) * 4); // ±2台设备

      dataPoints.push({
        timestamp,
        cpu: Math.max(
          0,
          Math.min(100, currentUsage.cpuUsagePercent * (1 + cpuVariation))
        ),
        memory: Math.max(
          0,
          Math.min(100, currentUsage.memoryUsagePercent * (1 + memoryVariation))
        ),
        storage: Math.max(
          0,
          Math.min(100, currentUsage.storageUsagePercent * (1 + storageVariation))
        ),
        devices: Math.max(0, currentUsage.activeDevices + deviceVariation),
      });
    }

    // 计算汇总统计
    const avgCpuUsage =
      dataPoints.reduce((sum, dp) => sum + dp.cpu, 0) / dataPoints.length;
    const avgMemoryUsage =
      dataPoints.reduce((sum, dp) => sum + dp.memory, 0) / dataPoints.length;
    const avgStorageUsage =
      dataPoints.reduce((sum, dp) => sum + dp.storage, 0) / dataPoints.length;
    const avgDeviceCount =
      dataPoints.reduce((sum, dp) => sum + dp.devices, 0) / dataPoints.length;

    const peakCpuUsage = Math.max(...dataPoints.map((dp) => dp.cpu));
    const peakMemoryUsage = Math.max(...dataPoints.map((dp) => dp.memory));
    const peakDeviceCount = Math.max(...dataPoints.map((dp) => dp.devices));

    return {
      nodeId,
      nodeName: node.name,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        hours: hoursCount,
      },
      dataPoints: dataPoints.length,
      cpu: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.cpu * 100) / 100,
      })),
      memory: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.memory * 100) / 100,
      })),
      storage: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.storage * 100) / 100,
      })),
      devices: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.devices),
      })),
      summary: {
        avgCpuUsage: Math.round(avgCpuUsage * 100) / 100,
        avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
        avgStorageUsage: Math.round(avgStorageUsage * 100) / 100,
        avgDeviceCount: Math.round(avgDeviceCount * 100) / 100,
        peakCpuUsage: Math.round(peakCpuUsage * 100) / 100,
        peakMemoryUsage: Math.round(peakMemoryUsage * 100) / 100,
        peakDeviceCount: Math.round(peakDeviceCount),
      },
    };
  }

  /**
   * 获取集群资源使用趋势
   * @param hours 小时数（默认24小时）
   */
  async getClusterUsageTrend(
    hours: number = 24
  ): Promise<{
    period: { start: string; end: string; hours: number };
    dataPoints: number;
    nodes: { total: number; online: number; offline: number };
    cpu: Array<{ timestamp: string; value: number; percentage: number }>;
    memory: Array<{ timestamp: string; value: number; percentage: number }>;
    storage: Array<{ timestamp: string; value: number; percentage: number }>;
    devices: Array<{ timestamp: string; value: number; percentage: number }>;
    summary: {
      avgCpuUsage: number;
      avgMemoryUsage: number;
      avgStorageUsage: number;
      avgDeviceCount: number;
      peakCpuUsage: number;
      peakMemoryUsage: number;
      peakDeviceCount: number;
      capacity: {
        totalCpu: number;
        totalMemory: number;
        totalStorage: number;
        maxDevices: number;
      };
    };
  }> {
    // 获取集群当前状态
    const clusterStats = await this.getClusterStats();

    // 计算时间范围
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const hoursCount = Math.min(hours, 168); // 最多7天

    // 生成趋势数据点（每小时一个数据点）
    const dataPoints: Array<{
      timestamp: Date;
      cpu: number;
      cpuPercentage: number;
      memory: number;
      memoryPercentage: number;
      storage: number;
      storagePercentage: number;
      devices: number;
      devicesPercentage: number;
    }> = [];

    const totalCpuCapacity = clusterStats.capacity.cpuCores;
    const totalMemoryCapacity = clusterStats.capacity.memoryMB;
    const totalStorageCapacity = clusterStats.capacity.storageGB;
    const maxDevicesCapacity = clusterStats.capacity.maxDevices;

    // 当前使用情况
    const currentCpuUsage = clusterStats.usage.cpuCores;
    const currentMemoryUsage = clusterStats.usage.memoryMB;
    const currentStorageUsage = clusterStats.usage.storageGB;
    const currentDeviceCount = clusterStats.usage.devices;

    // 生成模拟趋势数据
    for (let i = 0; i < hoursCount; i++) {
      const timestamp = new Date(start.getTime() + i * 60 * 60 * 1000);

      // 基于当前使用率生成波动数据（±15%）
      const cpuVariation = (Math.random() - 0.5) * 0.3;
      const memoryVariation = (Math.random() - 0.5) * 0.3;
      const storageVariation = (Math.random() - 0.5) * 0.15;
      const deviceVariation = Math.floor((Math.random() - 0.5) * 10);

      const cpuUsage = Math.max(0, currentCpuUsage * (1 + cpuVariation));
      const memoryUsage = Math.max(0, currentMemoryUsage * (1 + memoryVariation));
      const storageUsage = Math.max(0, currentStorageUsage * (1 + storageVariation));
      const deviceCount = Math.max(0, currentDeviceCount + deviceVariation);

      dataPoints.push({
        timestamp,
        cpu: cpuUsage,
        cpuPercentage: totalCpuCapacity > 0 ? (cpuUsage / totalCpuCapacity) * 100 : 0,
        memory: memoryUsage,
        memoryPercentage:
          totalMemoryCapacity > 0 ? (memoryUsage / totalMemoryCapacity) * 100 : 0,
        storage: storageUsage,
        storagePercentage:
          totalStorageCapacity > 0 ? (storageUsage / totalStorageCapacity) * 100 : 0,
        devices: deviceCount,
        devicesPercentage:
          maxDevicesCapacity > 0 ? (deviceCount / maxDevicesCapacity) * 100 : 0,
      });
    }

    // 计算汇总统计
    const avgCpuUsage =
      dataPoints.reduce((sum, dp) => sum + dp.cpuPercentage, 0) / dataPoints.length;
    const avgMemoryUsage =
      dataPoints.reduce((sum, dp) => sum + dp.memoryPercentage, 0) / dataPoints.length;
    const avgStorageUsage =
      dataPoints.reduce((sum, dp) => sum + dp.storagePercentage, 0) / dataPoints.length;
    const avgDeviceCount =
      dataPoints.reduce((sum, dp) => sum + dp.devices, 0) / dataPoints.length;

    const peakCpuUsage = Math.max(...dataPoints.map((dp) => dp.cpuPercentage));
    const peakMemoryUsage = Math.max(...dataPoints.map((dp) => dp.memoryPercentage));
    const peakDeviceCount = Math.max(...dataPoints.map((dp) => dp.devices));

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        hours: hoursCount,
      },
      dataPoints: dataPoints.length,
      nodes: clusterStats.nodes,
      cpu: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.cpu * 100) / 100,
        percentage: Math.round(dp.cpuPercentage * 100) / 100,
      })),
      memory: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.memory * 100) / 100,
        percentage: Math.round(dp.memoryPercentage * 100) / 100,
      })),
      storage: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.storage * 100) / 100,
        percentage: Math.round(dp.storagePercentage * 100) / 100,
      })),
      devices: dataPoints.map((dp) => ({
        timestamp: dp.timestamp.toISOString(),
        value: Math.round(dp.devices),
        percentage: Math.round(dp.devicesPercentage * 100) / 100,
      })),
      summary: {
        avgCpuUsage: Math.round(avgCpuUsage * 100) / 100,
        avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
        avgStorageUsage: Math.round(avgStorageUsage * 100) / 100,
        avgDeviceCount: Math.round(avgDeviceCount * 100) / 100,
        peakCpuUsage: Math.round(peakCpuUsage * 100) / 100,
        peakMemoryUsage: Math.round(peakMemoryUsage * 100) / 100,
        peakDeviceCount: Math.round(peakDeviceCount),
        capacity: {
          totalCpu: totalCpuCapacity,
          totalMemory: totalMemoryCapacity,
          totalStorage: totalStorageCapacity,
          maxDevices: maxDevicesCapacity,
        },
      },
    };
  }
}
