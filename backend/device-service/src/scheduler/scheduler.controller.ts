import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from "@nestjs/common";
import {
  SchedulerService,
  ScheduleRequest,
  SchedulingStrategy,
} from "./scheduler.service";
import {
  NodeManagerService,
  CreateNodeDto,
  UpdateNodeDto,
} from "./node-manager.service";
import { ResourceMonitorService } from "./resource-monitor.service";
import {
  AllocationService,
  AllocationRequest,
  SchedulingStrategy as AllocationStrategy,
} from "./allocation.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NodeStatus } from "../entities/node.entity";

@Controller("scheduler")
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly nodeManagerService: NodeManagerService,
    private readonly resourceMonitorService: ResourceMonitorService,
    private readonly allocationService: AllocationService,
  ) {}

  // ==================== 节点管理 API ====================

  /**
   * 注册新节点
   * POST /scheduler/nodes
   */
  @Post("nodes")
  async registerNode(@Body() dto: CreateNodeDto) {
    this.logger.log(`Registering node: ${dto.name}`);
    return await this.nodeManagerService.registerNode(dto);
  }

  /**
   * 获取节点列表
   * GET /scheduler/nodes?status=online
   */
  @Get("nodes")
  async listNodes(@Query("status") status?: NodeStatus) {
    return await this.nodeManagerService.listNodes(status);
  }

  /**
   * 获取节点详情
   * GET /scheduler/nodes/:id
   */
  @Get("nodes/:id")
  async getNode(@Param("id") id: string) {
    return await this.nodeManagerService.getNode(id);
  }

  /**
   * 更新节点信息
   * PUT /scheduler/nodes/:id
   */
  @Put("nodes/:id")
  async updateNode(@Param("id") id: string, @Body() dto: UpdateNodeDto) {
    return await this.nodeManagerService.updateNode(id, dto);
  }

  /**
   * 删除节点
   * DELETE /scheduler/nodes/:id
   */
  @Delete("nodes/:id")
  async unregisterNode(@Param("id") id: string) {
    await this.nodeManagerService.unregisterNode(id);
    return { message: "Node unregistered successfully" };
  }

  /**
   * 设置节点维护模式
   * POST /scheduler/nodes/:id/maintenance
   */
  @Post("nodes/:id/maintenance")
  async setMaintenance(
    @Param("id") id: string,
    @Body() body: { enable: boolean },
  ) {
    return await this.nodeManagerService.setMaintenance(id, body.enable);
  }

  /**
   * 排空节点
   * POST /scheduler/nodes/:id/drain
   */
  @Post("nodes/:id/drain")
  async drainNode(@Param("id") id: string) {
    return await this.nodeManagerService.drainNode(id);
  }

  /**
   * 添加节点污点
   * POST /scheduler/nodes/:id/taints
   */
  @Post("nodes/:id/taints")
  async addTaint(
    @Param("id") id: string,
    @Body()
    body: {
      key: string;
      value: string;
      effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute";
    },
  ) {
    return await this.nodeManagerService.addTaint(
      id,
      body.key,
      body.value,
      body.effect,
    );
  }

  /**
   * 删除节点污点
   * DELETE /scheduler/nodes/:id/taints/:key
   */
  @Delete("nodes/:id/taints/:key")
  async removeTaint(@Param("id") id: string, @Param("key") key: string) {
    return await this.nodeManagerService.removeTaint(id, key);
  }

  /**
   * 更新节点标签
   * PUT /scheduler/nodes/:id/labels
   */
  @Put("nodes/:id/labels")
  async updateLabels(
    @Param("id") id: string,
    @Body() labels: Record<string, string>,
  ) {
    return await this.nodeManagerService.updateLabels(id, labels);
  }

  /**
   * 删除节点标签
   * DELETE /scheduler/nodes/:id/labels/:key
   */
  @Delete("nodes/:id/labels/:key")
  async removeLabel(@Param("id") id: string, @Param("key") key: string) {
    return await this.nodeManagerService.removeLabel(id, key);
  }

  /**
   * 获取节点统计信息
   * GET /scheduler/nodes/stats/summary
   */
  @Get("nodes/stats/summary")
  async getNodesStats() {
    return await this.nodeManagerService.getNodesStats();
  }

  // ==================== 调度器 API ====================

  /**
   * 为设备选择节点
   * POST /scheduler/schedule
   */
  @Post("schedule")
  async scheduleDevice(@Body() request: ScheduleRequest) {
    return await this.schedulerService.scheduleDevice(request);
  }

  /**
   * 批量调度设备
   * POST /scheduler/schedule/batch
   */
  @Post("schedule/batch")
  async scheduleDevices(@Body() requests: ScheduleRequest[]) {
    const results = await this.schedulerService.scheduleDevices(requests);
    return {
      total: requests.length,
      scheduled: results.size,
      results: Array.from(results.entries()).map(([key, value]) => ({
        device: key,
        ...value,
      })),
    };
  }

  /**
   * 设置调度策略
   * POST /scheduler/strategy
   */
  @Post("strategy")
  async setStrategy(@Body() body: { strategy: SchedulingStrategy }) {
    this.schedulerService.setStrategy(body.strategy);
    return {
      message: `Scheduling strategy set to: ${body.strategy}`,
      strategy: body.strategy,
    };
  }

  /**
   * 获取调度统计
   * GET /scheduler/stats
   */
  @Get("stats")
  async getSchedulingStats() {
    return await this.schedulerService.getSchedulingStats();
  }

  /**
   * 重新平衡集群
   * POST /scheduler/rebalance
   */
  @Post("rebalance")
  async rebalanceCluster() {
    return await this.schedulerService.rebalanceCluster();
  }

  // ==================== 资源监控 API ====================

  /**
   * 更新节点资源使用情况
   * POST /scheduler/resources/update/:nodeId
   */
  @Post("resources/update/:nodeId")
  async updateNodeUsage(@Param("nodeId") nodeId: string) {
    await this.resourceMonitorService.updateNodeUsage(nodeId);
    return { message: "Node usage updated successfully" };
  }

  /**
   * 获取集群资源统计
   * GET /scheduler/resources/cluster-stats
   */
  @Get("resources/cluster-stats")
  async getClusterStats() {
    return await this.resourceMonitorService.getClusterStats();
  }

  /**
   * 获取本地节点信息
   * GET /scheduler/resources/local-node-info
   */
  @Get("resources/local-node-info")
  async getLocalNodeInfo() {
    return await this.resourceMonitorService.getLocalNodeInfo();
  }

  // ==================== 便捷查询 API ====================

  /**
   * 按区域获取节点
   * GET /scheduler/nodes/by-region/:region
   */
  @Get("nodes/by-region/:region")
  async getNodesByRegion(@Param("region") region: string) {
    return await this.nodeManagerService.getNodesByRegion(region);
  }

  /**
   * 按标签获取节点
   * GET /scheduler/nodes/by-label?key=env&value=prod
   */
  @Get("nodes/by-label")
  async getNodesByLabel(
    @Query("key") key: string,
    @Query("value") value?: string,
  ) {
    return await this.nodeManagerService.getNodesByLabel(key, value);
  }

  // ==================== 设备分配 API (新增) ====================

  /**
   * 为用户分配设备
   * POST /scheduler/devices/allocate
   */
  @Post("devices/allocate")
  async allocateDevice(@Body() request: AllocationRequest) {
    this.logger.log(
      `Allocating device for user: ${request.userId}, tenant: ${request.tenantId || "default"}`,
    );
    const result = await this.allocationService.allocateDevice(request);
    return {
      success: true,
      data: result,
      message: "Device allocated successfully",
    };
  }

  /**
   * 释放设备
   * POST /scheduler/devices/release
   */
  @Post("devices/release")
  async releaseDevice(
    @Body() body: { deviceId: string; userId?: string },
  ) {
    this.logger.log(
      `Releasing device: ${body.deviceId}, user: ${body.userId || "any"}`,
    );
    const result = await this.allocationService.releaseDevice(
      body.deviceId,
      body.userId,
    );
    return {
      success: true,
      data: result,
      message: "Device released successfully",
    };
  }

  /**
   * 获取可用设备列表
   * GET /scheduler/devices/available
   */
  @Get("devices/available")
  async getAvailableDevices() {
    const devices = await this.allocationService.getAvailableDevices();
    return {
      success: true,
      data: devices,
      total: devices.length,
    };
  }

  /**
   * 获取分配统计信息
   * GET /scheduler/allocations/stats
   */
  @Get("allocations/stats")
  async getAllocationStats() {
    const stats = await this.allocationService.getAllocationStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 获取分配记录
   * GET /scheduler/allocations?userId=xxx&limit=10
   */
  @Get("allocations")
  async getAllocations(
    @Query("userId") userId?: string,
    @Query("limit") limit: string = "10",
  ) {
    const limitNum = parseInt(limit, 10) || 10;

    if (userId) {
      const allocations =
        await this.allocationService.getUserAllocations(userId, limitNum);
      return {
        success: true,
        data: allocations,
        total: allocations.length,
      };
    }

    return {
      success: true,
      data: [],
      total: 0,
      message: "userId parameter required",
    };
  }

  /**
   * 设置分配调度策略
   * POST /scheduler/allocations/strategy
   */
  @Post("allocations/strategy")
  async setAllocationStrategy(
    @Body() body: { strategy: AllocationStrategy },
  ) {
    this.allocationService.setStrategy(body.strategy);
    return {
      success: true,
      message: `Allocation strategy set to: ${body.strategy}`,
      strategy: body.strategy,
    };
  }

  /**
   * 检查并释放过期的分配
   * POST /scheduler/allocations/release-expired
   */
  @Post("allocations/release-expired")
  async releaseExpiredAllocations() {
    const count = await this.allocationService.releaseExpiredAllocations();
    return {
      success: true,
      message: `Released ${count} expired allocations`,
      count,
    };
  }

  /**
   * 获取调度器配置信息
   * GET /scheduler/config
   */
  @Get("config")
  async getConfig() {
    const stats = await this.allocationService.getAllocationStats();
    return {
      success: true,
      data: {
        allocation_strategy: stats.strategy,
        scheduling_strategy: await this.schedulerService
          .getSchedulingStats()
          .then((s) => s.strategy),
      },
    };
  }
}
