import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Node, NodeStatus } from "../entities/node.entity";
import { Device, DeviceStatus } from "../entities/device.entity";
import { BusinessErrors } from "@cloudphone/shared";

export interface ScheduleRequest {
  cpuCores: number;
  memoryMB: number;
  storageMB?: number;
  labels?: Record<string, string>; // 设备标签（用于亲和性调度）
  tolerations?: string[]; // 容忍的污点
  preferredNode?: string; // 首选节点
}

export interface ScheduleResult {
  nodeId: string;
  nodeName: string;
  reason: string;
  score: number;
}

export enum SchedulingStrategy {
  BALANCED = "balanced", // 均衡策略（默认）
  BINPACK = "binpack", // 装箱策略（优先填满节点）
  SPREAD = "spread", // 分散策略（尽量分散到不同节点）
  LEAST_LOADED = "least_loaded", // 最小负载策略
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private strategy: SchedulingStrategy = SchedulingStrategy.BALANCED;

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  /**
   * 设置调度策略
   */
  setStrategy(strategy: SchedulingStrategy): void {
    this.strategy = strategy;
    this.logger.log(`Scheduling strategy set to: ${strategy}`);
  }

  /**
   * 为设备选择最佳节点
   */
  async scheduleDevice(request: ScheduleRequest): Promise<ScheduleResult> {
    this.logger.log(
      `Scheduling device: ${request.cpuCores} cores, ${request.memoryMB} MB`,
    );

    // 1. 获取所有可调度节点
    const candidateNodes = await this.getCandidateNodes();

    if (candidateNodes.length === 0) {
      throw BusinessErrors.noAvailableNodes();
    }

    // 2. 过滤不满足资源需求的节点
    const feasibleNodes = candidateNodes.filter((node) =>
      this.isFeasible(node, request),
    );

    if (feasibleNodes.length === 0) {
      throw BusinessErrors.noAvailableNodes();
    }

    // 3. 根据策略计算节点得分
    const scoredNodes = feasibleNodes.map((node) => ({
      node,
      score: this.calculateNodeScore(node, request),
    }));

    // 4. 排序并选择最佳节点
    scoredNodes.sort((a, b) => b.score - a.score);

    const bestNode = scoredNodes[0];

    this.logger.log(
      `Selected node: ${bestNode.node.name} (score: ${bestNode.score.toFixed(2)})`,
    );

    return {
      nodeId: bestNode.node.id,
      nodeName: bestNode.node.name,
      reason: `Best score: ${bestNode.score.toFixed(2)}`,
      score: bestNode.score,
    };
  }

  /**
   * 批量调度设备
   */
  async scheduleDevices(
    requests: ScheduleRequest[],
  ): Promise<Map<string, ScheduleResult>> {
    const results = new Map<string, ScheduleResult>();

    for (let i = 0; i < requests.length; i++) {
      try {
        const result = await this.scheduleDevice(requests[i]);
        results.set(`device-${i}`, result);
      } catch (error) {
        this.logger.error(`Failed to schedule device ${i}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 获取候选节点（可调度的节点）
   */
  private async getCandidateNodes(): Promise<Node[]> {
    return await this.nodeRepository.find({
      where: {
        status: NodeStatus.ONLINE,
      },
      order: {
        priority: "DESC", // 优先级高的节点优先
      },
    });
  }

  /**
   * 检查节点是否满足资源需求
   */
  private isFeasible(node: Node, request: ScheduleRequest): boolean {
    // 检查资源容量
    const availableCpu = node.capacity.totalCpuCores - node.usage.usedCpuCores;
    const availableMemory =
      node.capacity.totalMemoryMB - node.usage.usedMemoryMB;
    const availableDeviceSlots =
      node.capacity.maxDevices - node.usage.activeDevices;

    if (
      request.cpuCores > availableCpu ||
      request.memoryMB > availableMemory ||
      availableDeviceSlots <= 0
    ) {
      return false;
    }

    // 检查污点和容忍度
    if (node.taints && node.taints.length > 0) {
      for (const taint of node.taints) {
        if (taint.effect === "NoSchedule") {
          // 检查是否有匹配的容忍度
          if (
            !request.tolerations ||
            !request.tolerations.includes(taint.key)
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * 计算节点得分（根据调度策略）
   */
  private calculateNodeScore(node: Node, request: ScheduleRequest): number {
    switch (this.strategy) {
      case SchedulingStrategy.BALANCED:
        return this.calculateBalancedScore(node, request);
      case SchedulingStrategy.BINPACK:
        return this.calculateBinpackScore(node, request);
      case SchedulingStrategy.SPREAD:
        return this.calculateSpreadScore(node, request);
      case SchedulingStrategy.LEAST_LOADED:
        return this.calculateLeastLoadedScore(node, request);
      default:
        return this.calculateBalancedScore(node, request);
    }
  }

  /**
   * 均衡策略：选择负载最均衡的节点
   */
  private calculateBalancedScore(node: Node, request: ScheduleRequest): number {
    // 计算调度后的负载
    const afterCpuUsage =
      ((node.usage.usedCpuCores + request.cpuCores) /
        node.capacity.totalCpuCores) *
      100;
    const afterMemoryUsage =
      ((node.usage.usedMemoryMB + request.memoryMB) /
        node.capacity.totalMemoryMB) *
      100;
    const afterDeviceUsage =
      ((node.usage.activeDevices + 1) / node.capacity.maxDevices) * 100;

    // 计算三种资源的方差（越小越均衡）
    const mean = (afterCpuUsage + afterMemoryUsage + afterDeviceUsage) / 3;
    const variance =
      ((afterCpuUsage - mean) ** 2 +
        (afterMemoryUsage - mean) ** 2 +
        (afterDeviceUsage - mean) ** 2) /
      3;

    // 得分 = 100 - 方差 * 权重
    let score = 100 - variance * 0.5;

    // 加上优先级权重
    score += node.priority * 10;

    // 如果是首选节点，加分
    if (request.preferredNode && request.preferredNode === node.name) {
      score += 50;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 装箱策略：优先填满节点
   */
  private calculateBinpackScore(node: Node, request: ScheduleRequest): number {
    // 计算调度后的资源使用率
    const afterCpuUsage =
      ((node.usage.usedCpuCores + request.cpuCores) /
        node.capacity.totalCpuCores) *
      100;
    const afterMemoryUsage =
      ((node.usage.usedMemoryMB + request.memoryMB) /
        node.capacity.totalMemoryMB) *
      100;
    const afterDeviceUsage =
      ((node.usage.activeDevices + 1) / node.capacity.maxDevices) * 100;

    // 使用率越高，得分越高（优先填满节点）
    let score = (afterCpuUsage + afterMemoryUsage + afterDeviceUsage) / 3;

    // 加上优先级权重
    score += node.priority * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 分散策略：尽量分散到不同节点
   */
  private calculateSpreadScore(node: Node, request: ScheduleRequest): number {
    // 使用率越低，得分越高（优先选择空闲节点）
    const cpuUsage =
      (node.usage.usedCpuCores / node.capacity.totalCpuCores) * 100;
    const memoryUsage =
      (node.usage.usedMemoryMB / node.capacity.totalMemoryMB) * 100;
    const deviceUsage =
      (node.usage.activeDevices / node.capacity.maxDevices) * 100;

    const avgUsage = (cpuUsage + memoryUsage + deviceUsage) / 3;

    let score = 100 - avgUsage;

    // 加上优先级权重
    score += node.priority * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 最小负载策略：选择负载最小的节点
   */
  private calculateLeastLoadedScore(
    node: Node,
    request: ScheduleRequest,
  ): number {
    // 直接使用节点的负载分数（越低越好）
    let score = 100 - node.loadScore;

    // 加上优先级权重
    score += node.priority * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 重新平衡集群（将设备从高负载节点迁移到低负载节点）
   */
  async rebalanceCluster(): Promise<{
    migrationsNeeded: number;
    migrationPlan: Array<{ deviceId: string; from: string; to: string }>;
  }> {
    this.logger.log("Starting cluster rebalancing");

    const nodes = await this.nodeRepository.find({
      where: { status: NodeStatus.ONLINE },
    });

    if (nodes.length < 2) {
      return { migrationsNeeded: 0, migrationPlan: [] };
    }

    // 计算平均负载
    const avgLoad =
      nodes.reduce((sum, node) => sum + node.loadScore, 0) / nodes.length;

    // 找出负载过高的节点（超过平均值20%以上）
    const overloadedNodes = nodes.filter(
      (node) => node.loadScore > avgLoad * 1.2,
    );

    // 找出负载较低的节点（低于平均值20%以下）
    const underloadedNodes = nodes.filter(
      (node) => node.loadScore < avgLoad * 0.8,
    );

    if (overloadedNodes.length === 0 || underloadedNodes.length === 0) {
      this.logger.log("Cluster is already balanced");
      return { migrationsNeeded: 0, migrationPlan: [] };
    }

    const migrationPlan: Array<{ deviceId: string; from: string; to: string }> =
      [];

    // 生成迁移计划（简化版）
    for (const overloadedNode of overloadedNodes) {
      // 获取该节点上的设备
      const devices = await this.deviceRepository.find({
        where: { status: DeviceStatus.RUNNING },
        order: { cpuCores: "ASC" }, // 优先迁移小设备
        take: 5, // 限制迁移数量
      });

      for (const device of devices) {
        // 找到最合适的目标节点
        const bestTarget = underloadedNodes.reduce((best, current) =>
          current.loadScore < best.loadScore ? current : best,
        );

        migrationPlan.push({
          deviceId: device.id,
          from: overloadedNode.name,
          to: bestTarget.name,
        });

        // 模拟迁移后的负载变化
        overloadedNode.loadScore -= 5;
        bestTarget.loadScore += 5;

        if (overloadedNode.loadScore <= avgLoad) {
          break;
        }
      }
    }

    this.logger.log(
      `Generated migration plan: ${migrationPlan.length} migrations`,
    );

    return {
      migrationsNeeded: migrationPlan.length,
      migrationPlan,
    };
  }

  /**
   * 获取调度统计信息
   */
  async getSchedulingStats(): Promise<any> {
    const nodes = await this.nodeRepository.find();

    const stats = {
      totalNodes: nodes.length,
      onlineNodes: 0,
      offlineNodes: 0,
      averageLoad: 0,
      minLoad: 100,
      maxLoad: 0,
      strategy: this.strategy,
    };

    let totalLoad = 0;

    for (const node of nodes) {
      if (node.status === NodeStatus.ONLINE) {
        stats.onlineNodes++;
        totalLoad += node.loadScore;
        stats.minLoad = Math.min(stats.minLoad, node.loadScore);
        stats.maxLoad = Math.max(stats.maxLoad, node.loadScore);
      } else {
        stats.offlineNodes++;
      }
    }

    if (stats.onlineNodes > 0) {
      stats.averageLoad = totalLoad / stats.onlineNodes;
    }

    return stats;
  }
}
