import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GpuManagerService } from './gpu-manager.service';
import {
  QueryGPUDevicesDto,
  AllocateGPUDto,
  DeallocateGPUDto,
  QueryGPUAllocationsDto,
  QueryGPUUsageTrendDto,
  UpdateGPUDriverDto,
  GPUDeviceStatus,
  GPUAllocationMode,
  GPUAllocationStatus,
} from './dto/gpu.dto';

/**
 * GPU 资源管理服务
 * 提供 GPU 设备管理、分配管理、监控统计等功能
 */
@Injectable()
export class GpuResourceService {
  private readonly logger = new Logger(GpuResourceService.name);

  // 内存存储（生产环境应使用数据库）
  private gpuDevices = new Map<string, any>();
  private gpuAllocations = new Map<string, any>();

  constructor(private readonly gpuManager: GpuManagerService) {
    this.initializeMockData();
  }

  /**
   * 初始化模拟数据
   */
  private initializeMockData() {
    // 模拟 GPU 设备
    const device1 = {
      id: 'gpu-00000000-0000-0000-0000-000000000001',
      name: 'NVIDIA GeForce RTX 3090',
      nodeId: 'node-1',
      status: GPUDeviceStatus.AVAILABLE,
      driver: 'NVIDIA 535.104.05',
      memory: 24576, // MB
      utilization: 0,
      temperature: 45,
      powerUsage: 50, // Watts
      pciAddress: '0000:01:00.0',
      capabilities: ['CUDA', 'OpenGL', 'Vulkan', 'H264', 'H265'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    };

    const device2 = {
      id: 'gpu-00000000-0000-0000-0000-000000000002',
      name: 'NVIDIA GeForce RTX 4090',
      nodeId: 'node-1',
      status: GPUDeviceStatus.ALLOCATED,
      driver: 'NVIDIA 535.104.05',
      memory: 32768, // MB
      utilization: 75,
      temperature: 72,
      powerUsage: 280,
      pciAddress: '0000:02:00.0',
      capabilities: ['CUDA', 'OpenGL', 'Vulkan', 'H264', 'H265', 'AV1'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    };

    this.gpuDevices.set(device1.id, device1);
    this.gpuDevices.set(device2.id, device2);

    // 模拟分配记录
    const allocation1 = {
      id: 'alloc-00000000-0000-0000-0000-000000000001',
      gpuId: device2.id,
      deviceId: '10000000-0000-0000-0000-000000000001',
      mode: GPUAllocationMode.EXCLUSIVE,
      status: GPUAllocationStatus.ACTIVE,
      allocatedAt: new Date('2024-11-01'),
      releasedAt: null,
    };

    this.gpuAllocations.set(allocation1.id, allocation1);
  }

  /**
   * 获取 GPU 设备列表
   */
  async getGPUDevices(query: QueryGPUDevicesDto) {
    const { page = 1, pageSize = 10, status, nodeId } = query;

    let devices = Array.from(this.gpuDevices.values());

    // 过滤
    if (status) {
      devices = devices.filter((d) => d.status === status);
    }
    if (nodeId) {
      devices = devices.filter((d) => d.nodeId === nodeId);
    }

    // 分页
    const total = devices.length;
    const data = devices.slice((page - 1) * pageSize, page * pageSize);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取 GPU 设备详情
   */
  async getGPUDevice(id: string) {
    const device = this.gpuDevices.get(id);
    if (!device) {
      throw new NotFoundException(`GPU device ${id} not found`);
    }

    return device;
  }

  /**
   * 获取 GPU 实时状态
   */
  async getGPUStatus(id: string) {
    const device = await this.getGPUDevice(id);

    // 在实际实现中，这里应该从 nvidia-smi 或其他工具获取实时数据
    return {
      id: device.id,
      status: device.status,
      utilization: device.utilization,
      memory: {
        total: device.memory,
        used: Math.floor(device.memory * (device.utilization / 100)),
        free: Math.floor(device.memory * (1 - device.utilization / 100)),
      },
      temperature: device.temperature,
      powerUsage: device.powerUsage,
      processes: [], // 当前使用此 GPU 的进程列表
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 分配 GPU 到设备
   */
  async allocateGPU(gpuId: string, dto: AllocateGPUDto) {
    const { deviceId, mode = GPUAllocationMode.EXCLUSIVE } = dto;

    const gpu = this.gpuDevices.get(gpuId);
    if (!gpu) {
      throw new NotFoundException(`GPU ${gpuId} not found`);
    }

    // 检查 GPU 是否可用
    if (gpu.status !== GPUDeviceStatus.AVAILABLE && mode === GPUAllocationMode.EXCLUSIVE) {
      throw new BadRequestException(`GPU ${gpuId} is not available for exclusive allocation`);
    }

    // 创建分配记录
    const allocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gpuId,
      deviceId,
      mode,
      status: GPUAllocationStatus.ACTIVE,
      allocatedAt: new Date(),
      releasedAt: null,
    };

    this.gpuAllocations.set(allocation.id, allocation);

    // 更新 GPU 状态
    if (mode === GPUAllocationMode.EXCLUSIVE) {
      gpu.status = GPUDeviceStatus.ALLOCATED;
      this.gpuDevices.set(gpuId, gpu);
    }

    this.logger.log(`GPU ${gpuId} allocated to device ${deviceId} in ${mode} mode`);

    return {
      success: true,
      message: 'GPU allocated successfully',
      allocation,
    };
  }

  /**
   * 释放 GPU 分配
   */
  async deallocateGPU(gpuId: string, dto: DeallocateGPUDto) {
    const { deviceId } = dto;

    const gpu = this.gpuDevices.get(gpuId);
    if (!gpu) {
      throw new NotFoundException(`GPU ${gpuId} not found`);
    }

    // 查找活跃的分配记录
    const allocations = Array.from(this.gpuAllocations.values()).filter(
      (a) =>
        a.gpuId === gpuId &&
        a.status === GPUAllocationStatus.ACTIVE &&
        (!deviceId || a.deviceId === deviceId)
    );

    if (allocations.length === 0) {
      throw new NotFoundException(`No active allocation found for GPU ${gpuId}`);
    }

    // 释放分配
    allocations.forEach((allocation) => {
      allocation.status = GPUAllocationStatus.RELEASED;
      allocation.releasedAt = new Date();
      this.gpuAllocations.set(allocation.id, allocation);
    });

    // 更新 GPU 状态
    gpu.status = GPUDeviceStatus.AVAILABLE;
    gpu.utilization = 0;
    this.gpuDevices.set(gpuId, gpu);

    this.logger.log(`GPU ${gpuId} deallocated${deviceId ? ` from device ${deviceId}` : ''}`);

    return {
      success: true,
      message: 'GPU deallocated successfully',
      releasedCount: allocations.length,
    };
  }

  /**
   * 获取分配记录
   */
  async getGPUAllocations(query: QueryGPUAllocationsDto) {
    const { page = 1, pageSize = 10, gpuId, deviceId, status } = query;

    let allocations = Array.from(this.gpuAllocations.values());

    // 过滤
    if (gpuId) {
      allocations = allocations.filter((a) => a.gpuId === gpuId);
    }
    if (deviceId) {
      allocations = allocations.filter((a) => a.deviceId === deviceId);
    }
    if (status) {
      allocations = allocations.filter((a) => a.status === status);
    }

    // 排序（最新的在前）
    allocations.sort((a, b) => b.allocatedAt.getTime() - a.allocatedAt.getTime());

    // 分页
    const total = allocations.length;
    const data = allocations.slice((page - 1) * pageSize, page * pageSize);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取 GPU 统计信息
   */
  async getGPUStats() {
    const devices = Array.from(this.gpuDevices.values());
    const allocations = Array.from(this.gpuAllocations.values());

    const totalGPUs = devices.length;
    const availableGPUs = devices.filter((d) => d.status === GPUDeviceStatus.AVAILABLE).length;
    const allocatedGPUs = devices.filter((d) => d.status === GPUDeviceStatus.ALLOCATED).length;
    const maintenanceGPUs = devices.filter((d) => d.status === GPUDeviceStatus.MAINTENANCE).length;
    const errorGPUs = devices.filter((d) => d.status === GPUDeviceStatus.ERROR).length;

    const activeAllocations = allocations.filter((a) => a.status === GPUAllocationStatus.ACTIVE).length;

    const avgUtilization = devices.reduce((sum, d) => sum + d.utilization, 0) / totalGPUs || 0;
    const avgTemperature = devices.reduce((sum, d) => sum + d.temperature, 0) / totalGPUs || 0;
    const totalPowerUsage = devices.reduce((sum, d) => sum + d.powerUsage, 0);

    return {
      total: totalGPUs,
      available: availableGPUs,
      allocated: allocatedGPUs,
      maintenance: maintenanceGPUs,
      error: errorGPUs,
      activeAllocations,
      utilizationRate: (allocatedGPUs / totalGPUs) * 100,
      avgUtilization: Math.round(avgUtilization * 10) / 10,
      avgTemperature: Math.round(avgTemperature * 10) / 10,
      totalPowerUsage: Math.round(totalPowerUsage),
    };
  }

  /**
   * 获取 GPU 使用趋势
   */
  async getGPUUsageTrend(gpuId: string, query: QueryGPUUsageTrendDto) {
    const { startDate, endDate } = query;

    const gpu = this.gpuDevices.get(gpuId);
    if (!gpu) {
      throw new NotFoundException(`GPU ${gpuId} not found`);
    }

    // 模拟趋势数据
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        timestamp: timestamp.toISOString(),
        utilization: Math.random() * 100,
        memoryUsage: Math.random() * gpu.memory,
        temperature: 40 + Math.random() * 40,
        powerUsage: 50 + Math.random() * 250,
      });
    }

    return data;
  }

  /**
   * 获取集群 GPU 使用趋势
   */
  async getClusterGPUTrend(query: QueryGPUUsageTrendDto) {
    const { startDate, endDate } = query;

    // 模拟集群趋势数据
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        timestamp: timestamp.toISOString(),
        avgUtilization: Math.random() * 80,
        totalMemoryUsed: Math.random() * 50000,
        avgTemperature: 50 + Math.random() * 30,
        totalPowerUsage: 300 + Math.random() * 500,
        activeGPUs: Math.floor(Math.random() * 3) + 1,
      });
    }

    return data;
  }

  /**
   * 获取 GPU 性能分析
   */
  async getGPUPerformanceAnalysis(gpuId: string) {
    const gpu = this.gpuDevices.get(gpuId);
    if (!gpu) {
      throw new NotFoundException(`GPU ${gpuId} not found`);
    }

    return {
      gpuId,
      name: gpu.name,
      period: '24h',
      performance: {
        avgUtilization: 65.2,
        peakUtilization: 98.5,
        avgMemoryUsage: 18432, // MB
        peakMemoryUsage: 22000,
        avgTemperature: 68.5,
        peakTemperature: 82,
        avgPowerUsage: 220,
        peakPowerUsage: 320,
      },
      efficiency: {
        score: 85, // 0-100
        idleTime: 15, // %
        fullLoadTime: 25, // %
        recommendation: 'GPU utilization is good. Consider allocating more workloads during idle periods.',
      },
      bottlenecks: [
        { type: 'memory', severity: 'low', message: 'Memory usage occasionally reaches 90%' },
        { type: 'temperature', severity: 'medium', message: 'Temperature peaks above 80°C, consider improving cooling' },
      ],
    };
  }

  /**
   * 获取驱动信息
   */
  async getGPUDriverInfo(nodeId: string) {
    // 在实际实现中，应该从节点获取真实的驱动信息
    return {
      nodeId,
      driver: {
        name: 'NVIDIA',
        version: '535.104.05',
        cudaVersion: '12.2',
        releaseDate: '2023-09-15',
      },
      gpus: Array.from(this.gpuDevices.values())
        .filter((gpu) => gpu.nodeId === nodeId)
        .map((gpu) => ({
          id: gpu.id,
          name: gpu.name,
          pciAddress: gpu.pciAddress,
        })),
      updateAvailable: true,
      latestVersion: '545.29.06',
    };
  }

  /**
   * 更新驱动
   */
  async updateGPUDriver(nodeId: string, dto: UpdateGPUDriverDto) {
    const { driverVersion } = dto;

    this.logger.log(`Updating GPU driver on node ${nodeId} to version ${driverVersion}`);

    // 在实际实现中，这里应该触发驱动更新任务
    // 可能需要：
    // 1. 下载新驱动
    // 2. 停止使用该节点的所有GPU
    // 3. 安装驱动
    // 4. 重启节点或GPU服务
    // 5. 验证驱动安装

    return {
      success: true,
      message: `Driver update to version ${driverVersion} initiated on node ${nodeId}`,
      taskId: `driver-update-${Date.now()}`,
      estimatedTime: '10-15 minutes',
    };
  }
}
