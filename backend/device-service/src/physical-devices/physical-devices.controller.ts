import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DeviceDiscoveryService } from "../providers/physical/device-discovery.service";
import { DevicePoolService } from "../providers/physical/device-pool.service";
import { ScanNetworkDto } from "./dto/scan-network.dto";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { QueryDevicesDto } from "./dto/query-devices.dto";
import {
  PhysicalDeviceInfo,
  PooledDevice,
  DevicePoolStatus,
} from "../providers/physical/physical.types";

/**
 * 物理设备池管理 Controller
 *
 * 提供设备发现、注册、查询、健康检查等管理功能
 */
@ApiTags("Physical Devices Management")
@ApiBearerAuth()
@Controller("admin/physical-devices")
export class PhysicalDevicesController {
  constructor(
    private readonly discoveryService: DeviceDiscoveryService,
    private readonly poolService: DevicePoolService,
  ) {}

  /**
   * 网络扫描发现设备
   */
  @Post("scan")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "网络扫描发现物理设备",
    description: "扫描指定 CIDR 网络范围，自动发现可用的 Android 设备",
  })
  @ApiResponse({
    status: 200,
    description: "扫描完成，返回发现的设备列表",
  })
  async scanNetwork(
    @Body() scanDto: ScanNetworkDto,
  ): Promise<PhysicalDeviceInfo[]> {
    const devices = await this.discoveryService.scanNetwork({
      networkCidr: scanDto.networkCidr,
      portRange: {
        start: scanDto.portStart || 5555,
        end: scanDto.portEnd || 5565,
      },
      concurrency: scanDto.concurrency || 50,
      timeoutMs: scanDto.timeoutMs || 2000,
    });

    return devices;
  }

  /**
   * 手动注册设备
   */
  @Post()
  @ApiOperation({
    summary: "手动注册物理设备",
    description: "将已知 IP 和端口的设备注册到设备池",
  })
  @ApiResponse({
    status: 201,
    description: "设备注册成功",
  })
  async registerDevice(
    @Body() registerDto: RegisterDeviceDto,
  ): Promise<PooledDevice> {
    // 调用 discovery service 注册设备
    const deviceInfo = await this.discoveryService.registerDevice(
      registerDto.ipAddress,
      registerDto.adbPort,
      registerDto.deviceGroup,
    );

    // 更新名称和标签（如果提供）
    if (registerDto.name) {
      deviceInfo.name = registerDto.name;
    }
    if (registerDto.tags) {
      deviceInfo.tags = registerDto.tags;
    }

    // 添加到设备池
    return await this.poolService.addDevice(deviceInfo);
  }

  /**
   * 查询设备列表
   */
  @Get()
  @ApiOperation({
    summary: "查询设备池中的设备",
    description: "支持按状态、分组过滤，支持分页",
  })
  @ApiResponse({
    status: 200,
    description: "设备列表",
  })
  async getDevices(
    @Query() query: QueryDevicesDto,
  ): Promise<{
    data: PooledDevice[];
    total: number;
    page: number;
    limit: number;
  }> {
    let devices = await this.poolService.getAllDevices();

    // 状态过滤
    if (query.status) {
      devices = devices.filter((d) => d.poolStatus === query.status);
    }

    // 分组过滤
    if (query.deviceGroup) {
      devices = devices.filter((d) => d.deviceGroup === query.deviceGroup);
    }

    // 分页
    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = devices.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDevices = devices.slice(startIndex, endIndex);

    return {
      data: paginatedDevices,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取可用设备列表
   */
  @Get("available")
  @ApiOperation({
    summary: "获取所有可用设备",
    description: "返回状态为 available 的设备",
  })
  @ApiResponse({
    status: 200,
    description: "可用设备列表",
  })
  async getAvailableDevices(): Promise<PooledDevice[]> {
    return await this.poolService.getAvailableDevices();
  }

  /**
   * 获取设备详情
   */
  @Get(":deviceId")
  @ApiOperation({
    summary: "获取设备详细信息",
  })
  @ApiResponse({
    status: 200,
    description: "设备详情",
  })
  @ApiResponse({
    status: 404,
    description: "设备不存在",
  })
  async getDevice(@Param("deviceId") deviceId: string): Promise<PooledDevice> {
    const device = await this.poolService.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    return device;
  }

  /**
   * 更新设备信息
   */
  @Patch(":deviceId")
  @ApiOperation({
    summary: "更新设备信息",
    description: "更新设备名称、分组、标签或状态",
  })
  @ApiResponse({
    status: 200,
    description: "更新成功",
  })
  async updateDevice(
    @Param("deviceId") deviceId: string,
    @Body() updateDto: UpdateDeviceDto,
  ): Promise<PooledDevice> {
    const device = await this.poolService.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    // 更新字段
    if (updateDto.name !== undefined) {
      device.name = updateDto.name;
    }
    if (updateDto.deviceGroup !== undefined) {
      device.deviceGroup = updateDto.deviceGroup;
    }
    if (updateDto.tags !== undefined) {
      device.tags = updateDto.tags;
    }
    if (updateDto.status !== undefined) {
      device.poolStatus = updateDto.status;
    }

    // 保存更新（通过重新添加）
    await this.poolService.removeDevice(deviceId);
    return await this.poolService.addDevice(device);
  }

  /**
   * 触发健康检查
   */
  @Post(":deviceId/health-check")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "触发设备健康检查",
    description: "检查设备连接性、启动状态、存储、电池、温度等",
  })
  @ApiResponse({
    status: 200,
    description: "健康检查完成",
  })
  async healthCheck(@Param("deviceId") deviceId: string) {
    return await this.poolService.checkDeviceHealth(deviceId);
  }

  /**
   * 批量健康检查
   */
  @Post("health-check/batch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量健康检查所有设备",
    description: "对设备池中所有设备进行健康检查",
  })
  @ApiResponse({
    status: 200,
    description: "批量健康检查完成",
  })
  async batchHealthCheck(): Promise<{
    total: number;
    healthy: number;
    unhealthy: number;
    results: any[];
  }> {
    const devices = await this.poolService.getAllDevices();
    const results = [];
    let healthy = 0;
    let unhealthy = 0;

    for (const device of devices) {
      try {
        const result = await this.poolService.checkDeviceHealth(device.id);
        results.push(result);
        if (result.healthy) {
          healthy++;
        } else {
          unhealthy++;
        }
      } catch (error) {
        unhealthy++;
        results.push({
          deviceId: device.id,
          healthy: false,
          error: error.message,
        });
      }
    }

    return {
      total: devices.length,
      healthy,
      unhealthy,
      results,
    };
  }

  /**
   * 移除设备
   */
  @Delete(":deviceId")
  @ApiOperation({
    summary: "从设备池中移除设备",
    description: "只能移除未分配的设备",
  })
  @ApiResponse({
    status: 200,
    description: "移除成功",
  })
  @ApiResponse({
    status: 400,
    description: "设备正在使用中，无法移除",
  })
  async removeDevice(@Param("deviceId") deviceId: string): Promise<void> {
    await this.poolService.removeDevice(deviceId);
  }

  /**
   * 设置设备为维护模式
   */
  @Post(":deviceId/maintenance")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "设置设备为维护模式",
    description: "维护模式下设备不会被分配",
  })
  @ApiResponse({
    status: 200,
    description: "设置成功",
  })
  async setMaintenance(@Param("deviceId") deviceId: string): Promise<void> {
    await this.poolService.updateDeviceStatus(
      deviceId,
      DevicePoolStatus.MAINTENANCE,
    );
  }

  /**
   * 恢复设备为可用状态
   */
  @Post(":deviceId/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "恢复设备为可用状态",
    description: "将维护模式或离线的设备恢复为可用",
  })
  @ApiResponse({
    status: 200,
    description: "恢复成功",
  })
  async restoreDevice(@Param("deviceId") deviceId: string): Promise<void> {
    await this.poolService.updateDeviceStatus(
      deviceId,
      DevicePoolStatus.AVAILABLE,
    );
  }

  /**
   * 获取设备池统计信息
   */
  @Get("stats/summary")
  @ApiOperation({
    summary: "获取设备池统计信息",
    description: "返回各状态设备数量、平均健康评分等",
  })
  @ApiResponse({
    status: 200,
    description: "统计信息",
  })
  async getStats(): Promise<{
    total: number;
    available: number;
    allocated: number;
    offline: number;
    maintenance: number;
    error: number;
    averageHealthScore: number;
    deviceGroups: Record<string, number>;
  }> {
    const devices = await this.poolService.getAllDevices();

    const stats = {
      total: devices.length,
      available: 0,
      allocated: 0,
      offline: 0,
      maintenance: 0,
      error: 0,
      averageHealthScore: 0,
      deviceGroups: {} as Record<string, number>,
    };

    let totalHealthScore = 0;

    for (const device of devices) {
      // 状态统计
      switch (device.poolStatus) {
        case DevicePoolStatus.AVAILABLE:
          stats.available++;
          break;
        case DevicePoolStatus.ALLOCATED:
          stats.allocated++;
          break;
        case DevicePoolStatus.OFFLINE:
          stats.offline++;
          break;
        case DevicePoolStatus.MAINTENANCE:
          stats.maintenance++;
          break;
        case DevicePoolStatus.ERROR:
          stats.error++;
          break;
      }

      // 健康评分
      totalHealthScore += device.healthScore;

      // 设备分组统计
      if (device.deviceGroup) {
        stats.deviceGroups[device.deviceGroup] =
          (stats.deviceGroups[device.deviceGroup] || 0) + 1;
      }
    }

    // 平均健康评分
    stats.averageHealthScore =
      devices.length > 0 ? Math.round(totalHealthScore / devices.length) : 0;

    return stats;
  }
}
