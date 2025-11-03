import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProxyDeviceGroup,
  ProxyGroupDevice,
  ProxyGroupPool,
  ProxyGroupStats,
} from '../entities';
import { ProxyPoolManager } from '../../pool/pool-manager.service';

/**
 * 代理设备组服务
 *
 * 功能：
 * 1. 设备组管理（创建、删除、更新）
 * 2. 设备成员管理
 * 3. 专属代理池分配
 * 4. 组级统计和监控
 */
@Injectable()
export class ProxyDeviceGroupService {
  private readonly logger = new Logger(ProxyDeviceGroupService.name);

  constructor(
    @InjectRepository(ProxyDeviceGroup)
    private groupRepo: Repository<ProxyDeviceGroup>,
    @InjectRepository(ProxyGroupDevice)
    private groupDeviceRepo: Repository<ProxyGroupDevice>,
    @InjectRepository(ProxyGroupPool)
    private groupPoolRepo: Repository<ProxyGroupPool>,
    @InjectRepository(ProxyGroupStats)
    private groupStatsRepo: Repository<ProxyGroupStats>,
    private poolManager: ProxyPoolManager,
  ) {}

  /**
   * 创建设备组
   */
  async createDeviceGroup(params: {
    name: string;
    description?: string;
    userId: string;
    maxDevices?: number;
    dedicatedProxies?: boolean;
    autoScaling?: boolean;
    metadata?: Record<string, any>;
  }): Promise<ProxyDeviceGroup> {
    const group = this.groupRepo.create({
      name: params.name,
      description: params.description,
      userId: params.userId,
      maxDevices: params.maxDevices || 100,
      currentDevices: 0,
      dedicatedProxies: params.dedicatedProxies ?? true,
      autoScaling: params.autoScaling ?? false,
      status: 'active',
      metadata: params.metadata || {},
    });

    await this.groupRepo.save(group);

    this.logger.log(`Created device group: ${group.name} (${group.id})`);

    return group;
  }

  /**
   * 添加设备到组
   */
  async addDeviceToGroup(
    groupId: string,
    deviceId: string,
  ): Promise<ProxyGroupDevice> {
    // 检查组是否存在
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Device group ${groupId} not found`);
    }

    // 检查设备数量限制
    if (group.currentDevices >= group.maxDevices) {
      throw new Error(
        `Group ${group.name} has reached max devices limit (${group.maxDevices})`,
      );
    }

    // 检查设备是否已在组中
    const existing = await this.groupDeviceRepo.findOne({
      where: { groupId, deviceId },
    });

    if (existing) {
      throw new Error(`Device ${deviceId} is already in group ${group.name}`);
    }

    // 添加设备
    const groupDevice = this.groupDeviceRepo.create({
      groupId,
      deviceId,
      status: 'active',
    });

    await this.groupDeviceRepo.save(groupDevice);

    // 更新组的设备数量
    group.currentDevices += 1;
    await this.groupRepo.save(group);

    this.logger.log(`Added device ${deviceId} to group ${group.name}`);

    return groupDevice;
  }

  /**
   * 批量添加设备到组
   */
  async addDevicesToGroup(
    groupId: string,
    deviceIds: string[],
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const deviceId of deviceIds) {
      try {
        await this.addDeviceToGroup(groupId, deviceId);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          deviceId,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Batch add devices to group ${groupId}: ${success} success, ${failed} failed`,
    );

    return { success, failed, errors };
  }

  /**
   * 从组中移除设备
   */
  async removeDeviceFromGroup(
    groupId: string,
    deviceId: string,
  ): Promise<void> {
    const groupDevice = await this.groupDeviceRepo.findOne({
      where: { groupId, deviceId },
    });

    if (!groupDevice) {
      throw new NotFoundException(
        `Device ${deviceId} not found in group ${groupId}`,
      );
    }

    await this.groupDeviceRepo.remove(groupDevice);

    // 更新组的设备数量
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (group) {
      group.currentDevices = Math.max(0, group.currentDevices - 1);
      await this.groupRepo.save(group);
    }

    this.logger.log(`Removed device ${deviceId} from group ${groupId}`);
  }

  /**
   * 为组分配代理
   */
  async assignProxiesToGroup(params: {
    groupId: string;
    proxyIds: string[];
    priority?: number;
  }): Promise<{ assigned: number }> {
    const { groupId, proxyIds, priority = 5 } = params;

    // 检查组是否存在
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Device group ${groupId} not found`);
    }

    let assigned = 0;

    for (const proxyId of proxyIds) {
      // 检查代理是否已分配给该组
      const existing = await this.groupPoolRepo.findOne({
        where: { groupId, proxyId },
      });

      if (existing) {
        this.logger.warn(
          `Proxy ${proxyId} is already assigned to group ${group.name}`,
        );
        continue;
      }

      // 验证代理是否存在
      const proxy = this.poolManager.getProxyByIdFromPool(proxyId);
      if (!proxy) {
        this.logger.warn(`Proxy ${proxyId} not found in pool`);
        continue;
      }

      // 分配代理
      const groupPool = this.groupPoolRepo.create({
        groupId,
        proxyId,
        provider: proxy.provider,
        priority,
        status: 'active',
      });

      await this.groupPoolRepo.save(groupPool);
      assigned++;
    }

    this.logger.log(
      `Assigned ${assigned} proxies to group ${group.name}`,
    );

    return { assigned };
  }

  /**
   * 获取组的代理列表
   */
  async getGroupProxies(groupId: string): Promise<any[]> {
    const poolRecords = await this.groupPoolRepo.find({
      where: { groupId, status: 'active' },
      order: { priority: 'DESC' },
    });

    const proxies = poolRecords
      .map((record) => {
        const proxy = this.poolManager.getProxyByIdFromPool(record.proxyId);
        if (!proxy) return null;

        return {
          ...proxy,
          groupPriority: record.priority,
          assignedAt: record.createdAt,
        };
      })
      .filter((p) => p !== null);

    return proxies;
  }

  /**
   * 获取组的设备列表
   */
  async getGroupDevices(groupId: string): Promise<ProxyGroupDevice[]> {
    return this.groupDeviceRepo.find({
      where: { groupId, status: 'active' },
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * 获取组详情
   */
  async getGroupDetails(groupId: string): Promise<{
    group: ProxyDeviceGroup;
    devices: ProxyGroupDevice[];
    proxies: any[];
    stats: ProxyGroupStats | null;
  }> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Device group ${groupId} not found`);
    }

    const [devices, proxies, stats] = await Promise.all([
      this.getGroupDevices(groupId),
      this.getGroupProxies(groupId),
      this.getGroupStats(groupId),
    ]);

    return {
      group,
      devices,
      proxies,
      stats,
    };
  }

  /**
   * 获取组统计
   */
  async getGroupStats(groupId: string): Promise<ProxyGroupStats | null> {
    return this.groupStatsRepo.findOne({
      where: { groupId },
    });
  }

  /**
   * 更新组统计
   */
  async updateGroupStats(groupId: string): Promise<ProxyGroupStats> {
    // 获取组的所有代理和设备
    const [proxies, devices] = await Promise.all([
      this.getGroupProxies(groupId),
      this.getGroupDevices(groupId),
    ]);

    // 计算统计信息
    const totalProxies = proxies.length;
    const totalDevices = devices.length;
    const activeDevices = devices.filter((d) => d.status === 'active').length;

    // TODO: 从成本监控服务获取实际数据
    const totalRequests = 0;
    const totalDataTransferred = 0;
    const totalCost = 0;

    const avgLatency =
      proxies.reduce((sum, p) => sum + (p.latency || 0), 0) / (totalProxies || 1);

    const avgSuccessRate =
      proxies.reduce((sum, p) => sum + (p.successRate || 0), 0) / (totalProxies || 1);

    // 保存或更新统计
    let stats = await this.groupStatsRepo.findOne({
      where: { groupId },
    });

    if (stats) {
      Object.assign(stats, {
        totalProxies,
        totalDevices,
        activeDevices,
        totalRequests,
        totalDataTransferred,
        totalCost,
        avgLatency,
        avgSuccessRate,
        lastUpdated: new Date(),
      });
    } else {
      stats = this.groupStatsRepo.create({
        groupId,
        totalProxies,
        totalDevices,
        activeDevices,
        totalRequests,
        totalDataTransferred,
        totalCost,
        avgLatency,
        avgSuccessRate,
      });
    }

    await this.groupStatsRepo.save(stats);

    return stats;
  }

  /**
   * 获取用户的所有组
   */
  async getUserGroups(userId: string): Promise<ProxyDeviceGroup[]> {
    return this.groupRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 更新组配置
   */
  async updateGroup(
    groupId: string,
    updates: {
      name?: string;
      description?: string;
      maxDevices?: number;
      dedicatedProxies?: boolean;
      autoScaling?: boolean;
      status?: string;
    },
  ): Promise<ProxyDeviceGroup> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Device group ${groupId} not found`);
    }

    Object.assign(group, updates, { updatedAt: new Date() });

    await this.groupRepo.save(group);

    this.logger.log(`Updated device group: ${group.name}`);

    return group;
  }

  /**
   * 删除组
   */
  async deleteGroup(groupId: string): Promise<void> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Device group ${groupId} not found`);
    }

    // 删除组成员
    await this.groupDeviceRepo.delete({ groupId });

    // 删除组代理池
    await this.groupPoolRepo.delete({ groupId });

    // 删除组统计
    await this.groupStatsRepo.delete({ groupId });

    // 删除组
    await this.groupRepo.remove(group);

    this.logger.log(`Deleted device group: ${group.name}`);
  }

  /**
   * 自动扩展组代理池
   */
  async autoScaleGroupProxies(groupId: string): Promise<{
    added: number;
    reason: string;
  }> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!group || !group.autoScaling) {
      return { added: 0, reason: 'Auto scaling not enabled' };
    }

    // 获取组的当前代理和设备
    const [proxies, devices] = await Promise.all([
      this.getGroupProxies(groupId),
      this.getGroupDevices(groupId),
    ]);

    const activeDevices = devices.filter((d) => d.status === 'active').length;
    const currentProxies = proxies.length;

    // 计算建议的代理数量（每个设备2个代理）
    const recommendedProxies = activeDevices * 2;

    if (currentProxies >= recommendedProxies) {
      return {
        added: 0,
        reason: 'Proxy pool is sufficient',
      };
    }

    const needed = recommendedProxies - currentProxies;

    // 从代理池获取可用代理
    const availableProxies = this.poolManager
      .listProxies({}, true, needed)
      .slice(0, needed);

    if (availableProxies.length === 0) {
      return {
        added: 0,
        reason: 'No available proxies in pool',
      };
    }

    // 分配代理
    const result = await this.assignProxiesToGroup({
      groupId,
      proxyIds: availableProxies.map((p) => p.id),
    });

    this.logger.log(
      `Auto-scaled group ${group.name}: added ${result.assigned} proxies`,
    );

    return {
      added: result.assigned,
      reason: `Added ${result.assigned} proxies to meet demand (${activeDevices} devices)`,
    };
  }
}
