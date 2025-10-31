import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Node, NodeStatus, ResourceCapacity } from '../entities/node.entity';
import { BusinessErrors } from '@cloudphone/shared';

export interface CreateNodeDto {
  name: string;
  hostname: string;
  ipAddress: string;
  dockerPort?: number;
  capacity: ResourceCapacity;
  labels?: Record<string, string>;
  region?: string;
  zone?: string;
  priority?: number;
}

export interface UpdateNodeDto {
  status?: NodeStatus;
  capacity?: Partial<ResourceCapacity>;
  labels?: Record<string, string>;
  priority?: number;
  region?: string;
  zone?: string;
}

@Injectable()
export class NodeManagerService {
  private readonly logger = new Logger(NodeManagerService.name);

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>
  ) {}

  /**
   * 注册新节点
   */
  async registerNode(dto: CreateNodeDto): Promise<Node> {
    this.logger.log(`Registering new node: ${dto.name}`);

    // 检查节点名称是否已存在
    const existing = await this.nodeRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw BusinessErrors.nodeAlreadyExists(dto.name);
    }

    const node = this.nodeRepository.create({
      name: dto.name,
      hostname: dto.hostname,
      ipAddress: dto.ipAddress,
      dockerPort: dto.dockerPort || 2375,
      status: NodeStatus.ONLINE,
      capacity: dto.capacity,
      usage: {
        usedCpuCores: 0,
        usedMemoryMB: 0,
        usedStorageGB: 0,
        activeDevices: 0,
        cpuUsagePercent: 0,
        memoryUsagePercent: 0,
        storageUsagePercent: 0,
      },
      loadScore: 0,
      labels: dto.labels || {},
      taints: [],
      priority: dto.priority || 0,
      region: dto.region,
      zone: dto.zone,
      lastHeartbeat: new Date(),
      failedHealthChecks: 0,
    });

    const savedNode = await this.nodeRepository.save(node);

    this.logger.log(`Node registered: ${savedNode.name} (${savedNode.id})`);

    return savedNode;
  }

  /**
   * 注销节点
   */
  async unregisterNode(nodeId: string): Promise<void> {
    this.logger.log(`Unregistering node: ${nodeId}`);

    const node = await this.nodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw BusinessErrors.nodeNotFound(nodeId);
    }

    // 检查节点上是否还有运行中的设备
    if (node.usage.activeDevices > 0) {
      throw BusinessErrors.nodeNotAvailable(
        node.name,
        `节点上还有 ${node.usage.activeDevices} 个设备在运行`
      );
    }

    await this.nodeRepository.remove(node);

    this.logger.log(`Node unregistered: ${node.name}`);
  }

  /**
   * 更新节点信息
   */
  async updateNode(nodeId: string, dto: UpdateNodeDto): Promise<Node> {
    const node = await this.nodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw BusinessErrors.nodeNotFound(nodeId);
    }

    if (dto.status) {
      node.status = dto.status;
    }

    if (dto.capacity) {
      node.capacity = { ...node.capacity, ...dto.capacity };
    }

    if (dto.labels) {
      node.labels = { ...node.labels, ...dto.labels };
    }

    if (dto.priority !== undefined) {
      node.priority = dto.priority;
    }

    if (dto.region) {
      node.region = dto.region;
    }

    if (dto.zone) {
      node.zone = dto.zone;
    }

    return await this.nodeRepository.save(node);
  }

  /**
   * 获取节点列表
   */
  async listNodes(status?: NodeStatus): Promise<Node[]> {
    if (status) {
      return await this.nodeRepository.find({
        where: { status },
        order: { priority: 'DESC', loadScore: 'ASC' },
      });
    }

    return await this.nodeRepository.find({
      order: { priority: 'DESC', loadScore: 'ASC' },
    });
  }

  /**
   * 获取节点详情
   */
  async getNode(nodeId: string): Promise<Node> {
    const node = await this.nodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw BusinessErrors.nodeNotFound(nodeId);
    }

    return node;
  }

  /**
   * 获取节点（根据名称）
   */
  async getNodeByName(name: string): Promise<Node> {
    const node = await this.nodeRepository.findOne({ where: { name } });

    if (!node) {
      throw BusinessErrors.nodeNotFound(name);
    }

    return node;
  }

  /**
   * 设置节点为维护模式
   */
  async setMaintenance(nodeId: string, enable: boolean): Promise<Node> {
    this.logger.log(`Setting node ${nodeId} maintenance mode: ${enable ? 'ON' : 'OFF'}`);

    const node = await this.getNode(nodeId);

    if (enable) {
      node.status = NodeStatus.MAINTENANCE;
    } else {
      node.status = NodeStatus.ONLINE;
    }

    return await this.nodeRepository.save(node);
  }

  /**
   * 设置节点为排空模式（不接受新设备，但保持运行中的设备）
   */
  async drainNode(nodeId: string): Promise<Node> {
    this.logger.log(`Draining node ${nodeId}`);

    const node = await this.getNode(nodeId);

    node.status = NodeStatus.DRAINING;

    return await this.nodeRepository.save(node);
  }

  /**
   * 添加节点污点
   */
  async addTaint(
    nodeId: string,
    key: string,
    value: string,
    effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute'
  ): Promise<Node> {
    const node = await this.getNode(nodeId);

    // 检查污点是否已存在
    const existingTaint = node.taints.find((t) => t.key === key);

    if (existingTaint) {
      existingTaint.value = value;
      existingTaint.effect = effect;
    } else {
      node.taints.push({ key, value, effect });
    }

    return await this.nodeRepository.save(node);
  }

  /**
   * 删除节点污点
   */
  async removeTaint(nodeId: string, key: string): Promise<Node> {
    const node = await this.getNode(nodeId);

    node.taints = node.taints.filter((t) => t.key !== key);

    return await this.nodeRepository.save(node);
  }

  /**
   * 更新节点标签
   */
  async updateLabels(nodeId: string, labels: Record<string, string>): Promise<Node> {
    const node = await this.getNode(nodeId);

    node.labels = { ...node.labels, ...labels };

    return await this.nodeRepository.save(node);
  }

  /**
   * 删除节点标签
   */
  async removeLabel(nodeId: string, key: string): Promise<Node> {
    const node = await this.getNode(nodeId);

    delete node.labels[key];

    return await this.nodeRepository.save(node);
  }

  /**
   * 获取节点统计信息
   */
  async getNodesStats(): Promise<any> {
    const nodes = await this.nodeRepository.find();

    const stats = {
      total: nodes.length,
      byStatus: {
        online: 0,
        offline: 0,
        maintenance: 0,
        draining: 0,
      },
      totalCapacity: {
        cpuCores: 0,
        memoryMB: 0,
        storageGB: 0,
        maxDevices: 0,
      },
      totalUsage: {
        cpuCores: 0,
        memoryMB: 0,
        storageGB: 0,
        devices: 0,
      },
      averageLoad: 0,
    };

    let totalLoad = 0;
    let onlineNodes = 0;

    for (const node of nodes) {
      // 统计节点状态
      if (node.status === NodeStatus.ONLINE) {
        stats.byStatus.online++;
        onlineNodes++;
        totalLoad += node.loadScore;

        // 统计容量和使用情况
        stats.totalCapacity.cpuCores += node.capacity.totalCpuCores;
        stats.totalCapacity.memoryMB += node.capacity.totalMemoryMB;
        stats.totalCapacity.storageGB += node.capacity.totalStorageGB;
        stats.totalCapacity.maxDevices += node.capacity.maxDevices;

        stats.totalUsage.cpuCores += node.usage.usedCpuCores;
        stats.totalUsage.memoryMB += node.usage.usedMemoryMB;
        stats.totalUsage.storageGB += node.usage.usedStorageGB;
        stats.totalUsage.devices += node.usage.activeDevices;
      } else if (node.status === NodeStatus.OFFLINE) {
        stats.byStatus.offline++;
      } else if (node.status === NodeStatus.MAINTENANCE) {
        stats.byStatus.maintenance++;
      } else if (node.status === NodeStatus.DRAINING) {
        stats.byStatus.draining++;
      }
    }

    if (onlineNodes > 0) {
      stats.averageLoad = totalLoad / onlineNodes;
    }

    return stats;
  }

  /**
   * 按区域获取节点
   */
  async getNodesByRegion(region: string): Promise<Node[]> {
    return await this.nodeRepository.find({
      where: { region, status: NodeStatus.ONLINE },
      order: { loadScore: 'ASC' },
    });
  }

  /**
   * 按标签获取节点
   */
  async getNodesByLabel(key: string, value?: string): Promise<Node[]> {
    const nodes = await this.nodeRepository.find({
      where: { status: NodeStatus.ONLINE },
    });

    return nodes.filter((node) => {
      if (value) {
        return node.labels[key] === value;
      }
      return key in node.labels;
    });
  }
}
