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
} from '@nestjs/common';
import { SchedulerService, ScheduleRequest, SchedulingStrategy } from './scheduler.service';
import { NodeManagerService, CreateNodeDto, UpdateNodeDto } from './node-manager.service';
import { ResourceMonitorService } from './resource-monitor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NodeStatus } from '../entities/node.entity';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly nodeManagerService: NodeManagerService,
    private readonly resourceMonitorService: ResourceMonitorService,
  ) {}

  // ==================== 节点管理 API ====================

  /**
   * 注册新节点
   * POST /scheduler/nodes
   */
  @Post('nodes')
  async registerNode(@Body() dto: CreateNodeDto) {
    this.logger.log(`Registering node: ${dto.name}`);
    return await this.nodeManagerService.registerNode(dto);
  }

  /**
   * 获取节点列表
   * GET /scheduler/nodes?status=online
   */
  @Get('nodes')
  async listNodes(@Query('status') status?: NodeStatus) {
    return await this.nodeManagerService.listNodes(status);
  }

  /**
   * 获取节点详情
   * GET /scheduler/nodes/:id
   */
  @Get('nodes/:id')
  async getNode(@Param('id') id: string) {
    return await this.nodeManagerService.getNode(id);
  }

  /**
   * 更新节点信息
   * PUT /scheduler/nodes/:id
   */
  @Put('nodes/:id')
  async updateNode(@Param('id') id: string, @Body() dto: UpdateNodeDto) {
    return await this.nodeManagerService.updateNode(id, dto);
  }

  /**
   * 删除节点
   * DELETE /scheduler/nodes/:id
   */
  @Delete('nodes/:id')
  async unregisterNode(@Param('id') id: string) {
    await this.nodeManagerService.unregisterNode(id);
    return { message: 'Node unregistered successfully' };
  }

  /**
   * 设置节点维护模式
   * POST /scheduler/nodes/:id/maintenance
   */
  @Post('nodes/:id/maintenance')
  async setMaintenance(
    @Param('id') id: string,
    @Body() body: { enable: boolean },
  ) {
    return await this.nodeManagerService.setMaintenance(id, body.enable);
  }

  /**
   * 排空节点
   * POST /scheduler/nodes/:id/drain
   */
  @Post('nodes/:id/drain')
  async drainNode(@Param('id') id: string) {
    return await this.nodeManagerService.drainNode(id);
  }

  /**
   * 添加节点污点
   * POST /scheduler/nodes/:id/taints
   */
  @Post('nodes/:id/taints')
  async addTaint(
    @Param('id') id: string,
    @Body()
    body: {
      key: string;
      value: string;
      effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
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
  @Delete('nodes/:id/taints/:key')
  async removeTaint(@Param('id') id: string, @Param('key') key: string) {
    return await this.nodeManagerService.removeTaint(id, key);
  }

  /**
   * 更新节点标签
   * PUT /scheduler/nodes/:id/labels
   */
  @Put('nodes/:id/labels')
  async updateLabels(
    @Param('id') id: string,
    @Body() labels: Record<string, string>,
  ) {
    return await this.nodeManagerService.updateLabels(id, labels);
  }

  /**
   * 删除节点标签
   * DELETE /scheduler/nodes/:id/labels/:key
   */
  @Delete('nodes/:id/labels/:key')
  async removeLabel(@Param('id') id: string, @Param('key') key: string) {
    return await this.nodeManagerService.removeLabel(id, key);
  }

  /**
   * 获取节点统计信息
   * GET /scheduler/nodes/stats/summary
   */
  @Get('nodes/stats/summary')
  async getNodesStats() {
    return await this.nodeManagerService.getNodesStats();
  }

  // ==================== 调度器 API ====================

  /**
   * 为设备选择节点
   * POST /scheduler/schedule
   */
  @Post('schedule')
  async scheduleDevice(@Body() request: ScheduleRequest) {
    return await this.schedulerService.scheduleDevice(request);
  }

  /**
   * 批量调度设备
   * POST /scheduler/schedule/batch
   */
  @Post('schedule/batch')
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
  @Post('strategy')
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
  @Get('stats')
  async getSchedulingStats() {
    return await this.schedulerService.getSchedulingStats();
  }

  /**
   * 重新平衡集群
   * POST /scheduler/rebalance
   */
  @Post('rebalance')
  async rebalanceCluster() {
    return await this.schedulerService.rebalanceCluster();
  }

  // ==================== 资源监控 API ====================

  /**
   * 更新节点资源使用情况
   * POST /scheduler/resources/update/:nodeId
   */
  @Post('resources/update/:nodeId')
  async updateNodeUsage(@Param('nodeId') nodeId: string) {
    await this.resourceMonitorService.updateNodeUsage(nodeId);
    return { message: 'Node usage updated successfully' };
  }

  /**
   * 获取集群资源统计
   * GET /scheduler/resources/cluster-stats
   */
  @Get('resources/cluster-stats')
  async getClusterStats() {
    return await this.resourceMonitorService.getClusterStats();
  }

  /**
   * 获取本地节点信息
   * GET /scheduler/resources/local-node-info
   */
  @Get('resources/local-node-info')
  async getLocalNodeInfo() {
    return await this.resourceMonitorService.getLocalNodeInfo();
  }

  // ==================== 便捷查询 API ====================

  /**
   * 按区域获取节点
   * GET /scheduler/nodes/by-region/:region
   */
  @Get('nodes/by-region/:region')
  async getNodesByRegion(@Param('region') region: string) {
    return await this.nodeManagerService.getNodesByRegion(region);
  }

  /**
   * 按标签获取节点
   * GET /scheduler/nodes/by-label?key=env&value=prod
   */
  @Get('nodes/by-label')
  async getNodesByLabel(
    @Query('key') key: string,
    @Query('value') value?: string,
  ) {
    return await this.nodeManagerService.getNodesByLabel(key, value);
  }
}
