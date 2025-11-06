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
import {
  AllocationService,
  AllocationRequest,
  SchedulingStrategy as AllocationStrategy,
} from './allocation.service';
import {
  BatchAllocateDto,
  BatchReleaseDto,
  BatchExtendDto,
  BatchQueryDto,
} from './dto/batch-allocation.dto';
import { ExtendAllocationDto } from './dto/extend-allocation.dto';
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  QueryReservationsDto,
} from './dto/reservation.dto';
import { JoinQueueDto, CancelQueueDto, QueryQueueDto, ProcessQueueBatchDto } from './dto/queue.dto';
import { ReservationService } from './reservation.service';
import { QueueService } from './queue.service';
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
    private readonly allocationService: AllocationService,
    private readonly reservationService: ReservationService,
    private readonly queueService: QueueService
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
  async setMaintenance(@Param('id') id: string, @Body() body: { enable: boolean }) {
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
    }
  ) {
    return await this.nodeManagerService.addTaint(id, body.key, body.value, body.effect);
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
  async updateLabels(@Param('id') id: string, @Body() labels: Record<string, string>) {
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
  async getNodesByLabel(@Query('key') key: string, @Query('value') value?: string) {
    return await this.nodeManagerService.getNodesByLabel(key, value);
  }

  // ==================== 设备分配 API (新增) ====================

  /**
   * 为用户分配设备
   * POST /scheduler/devices/allocate
   */
  @Post('devices/allocate')
  async allocateDevice(@Body() request: AllocationRequest) {
    this.logger.log(
      `Allocating device for user: ${request.userId}, tenant: ${request.tenantId || 'default'}`
    );
    const result = await this.allocationService.allocateDevice(request);
    return {
      success: true,
      data: result,
      message: 'Device allocated successfully',
    };
  }

  /**
   * 释放设备
   * POST /scheduler/devices/release
   */
  @Post('devices/release')
  async releaseDevice(@Body() body: { deviceId: string; userId?: string }) {
    this.logger.log(`Releasing device: ${body.deviceId}, user: ${body.userId || 'any'}`);
    const result = await this.allocationService.releaseDevice(body.deviceId, body.userId);
    return {
      success: true,
      data: result,
      message: 'Device released successfully',
    };
  }

  /**
   * 获取可用设备列表
   * GET /scheduler/devices/available
   */
  @Get('devices/available')
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
  @Get('allocations/stats')
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
  @Get('allocations')
  async getAllocations(@Query('userId') userId?: string, @Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit, 10) || 10;

    if (userId) {
      const allocations = await this.allocationService.getUserAllocations(userId, limitNum);
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
      message: 'userId parameter required',
    };
  }

  /**
   * 设置分配调度策略
   * POST /scheduler/allocations/strategy
   */
  @Post('allocations/strategy')
  async setAllocationStrategy(@Body() body: { strategy: AllocationStrategy }) {
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
  @Post('allocations/release-expired')
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
  @Get('config')
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

  // ==================== 批量操作 API (Phase 3) ====================

  /**
   * 批量分配设备
   * POST /scheduler/allocations/batch
   */
  @Post('allocations/batch')
  async batchAllocate(@Body() dto: BatchAllocateDto) {
    this.logger.log(`Batch allocating ${dto.requests.length} devices...`);

    const result = await this.allocationService.batchAllocate(dto.requests, dto.continueOnError);

    return {
      success: true,
      data: result,
      message: `Batch allocation completed: ${result.successCount}/${result.totalCount} succeeded`,
    };
  }

  /**
   * 批量释放设备
   * POST /scheduler/allocations/batch/release
   */
  @Post('allocations/batch/release')
  async batchRelease(@Body() dto: BatchReleaseDto) {
    this.logger.log(`Batch releasing ${dto.allocationIds.length} allocations...`);

    const result = await this.allocationService.batchRelease(
      dto.allocationIds,
      dto.reason,
      dto.continueOnError
    );

    return {
      success: true,
      data: result,
      message: `Batch release completed: ${result.successCount}/${result.totalCount} succeeded`,
    };
  }

  /**
   * 批量续期设备
   * POST /scheduler/allocations/batch/extend
   */
  @Post('allocations/batch/extend')
  async batchExtend(@Body() dto: BatchExtendDto) {
    this.logger.log(
      `Batch extending ${dto.allocationIds.length} allocations by ${dto.additionalMinutes} minutes...`
    );

    const result = await this.allocationService.batchExtend(
      dto.allocationIds,
      dto.additionalMinutes,
      dto.continueOnError
    );

    return {
      success: true,
      data: result,
      message: `Batch extend completed: ${result.successCount}/${result.totalCount} succeeded`,
    };
  }

  /**
   * 批量查询用户设备分配
   * POST /scheduler/allocations/batch/query
   */
  @Post('allocations/batch/query')
  async batchQuery(@Body() dto: BatchQueryDto) {
    this.logger.log(`Batch querying allocations for ${dto.userIds.length} users...`);

    const result = await this.allocationService.batchQuery(dto.userIds, dto.activeOnly);

    return {
      success: true,
      data: result,
      message: `Found ${result.totalAllocations} allocations for ${result.userCount} users`,
    };
  }

  // ==================== 单设备续期 API (Phase 3) ====================

  /**
   * 延长单个设备分配的使用时间
   * PUT /scheduler/allocations/:id/extend
   */
  @Put('allocations/:id/extend')
  async extendAllocation(@Param('id') allocationId: string, @Body() dto: ExtendAllocationDto) {
    this.logger.log(`Extending allocation ${allocationId} by ${dto.additionalMinutes} minutes...`);

    const result = await this.allocationService.extendAllocation(
      allocationId,
      dto.additionalMinutes,
      dto.reason
    );

    return {
      success: true,
      data: result,
      message: `Allocation extended by ${dto.additionalMinutes} minutes`,
    };
  }

  /**
   * 获取分配的续期信息
   * GET /scheduler/allocations/:id/extend-info
   */
  @Get('allocations/:id/extend-info')
  async getAllocationExtendInfo(@Param('id') allocationId: string) {
    this.logger.log(`Getting extend info for allocation ${allocationId}...`);

    const result = await this.allocationService.getAllocationExtendInfo(allocationId);

    return {
      success: true,
      data: result,
      message: result.canExtend
        ? 'Allocation can be extended'
        : `Cannot extend: ${result.cannotExtendReason}`,
    };
  }

  // ==================== 设备预约 API (Phase 3) ====================

  /**
   * 创建设备预约
   * POST /scheduler/reservations
   */
  @Post('reservations')
  async createReservation(
    @Body() dto: CreateReservationDto,
    @Query('userId') userId: string,
    @Query('tenantId') tenantId?: string
  ) {
    this.logger.log(`Creating reservation for user ${userId} at ${dto.reservedStartTime}`);

    const result = await this.reservationService.createReservation(userId, tenantId, dto);

    return {
      success: true,
      data: result,
      message: 'Reservation created successfully',
    };
  }

  /**
   * 获取预约详情
   * GET /scheduler/reservations/:id
   */
  @Get('reservations/:id')
  async getReservation(@Param('id') reservationId: string) {
    this.logger.log(`Getting reservation ${reservationId}`);

    const result = await this.reservationService.getReservation(reservationId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 查询预约列表
   * GET /scheduler/reservations?userId=xxx&status=pending&page=1&pageSize=10
   */
  @Get('reservations')
  async getReservations(@Query() query: QueryReservationsDto) {
    this.logger.log(`Querying reservations with filters: ${JSON.stringify(query)}`);

    const result = await this.reservationService.getUserReservations(query);

    return {
      success: true,
      data: result,
      message: `Found ${result.total} reservation(s)`,
    };
  }

  /**
   * 更新预约
   * PUT /scheduler/reservations/:id
   */
  @Put('reservations/:id')
  async updateReservation(@Param('id') reservationId: string, @Body() dto: UpdateReservationDto) {
    this.logger.log(`Updating reservation ${reservationId}`);

    const result = await this.reservationService.updateReservation(reservationId, dto);

    return {
      success: true,
      data: result,
      message: 'Reservation updated successfully',
    };
  }

  /**
   * 取消预约
   * POST /scheduler/reservations/:id/cancel
   */
  @Post('reservations/:id/cancel')
  async cancelReservation(@Param('id') reservationId: string, @Body() dto: CancelReservationDto) {
    this.logger.log(`Cancelling reservation ${reservationId}`);

    const result = await this.reservationService.cancelReservation(reservationId, dto);

    return {
      success: true,
      data: result,
      message: 'Reservation cancelled successfully',
    };
  }

  /**
   * 检查时间冲突
   * POST /scheduler/reservations/check-conflict
   */
  @Post('reservations/check-conflict')
  async checkReservationConflict(
    @Body()
    body: {
      userId: string;
      startTime: string;
      endTime: string;
    }
  ) {
    this.logger.log(
      `Checking reservation conflict for user ${body.userId} between ${body.startTime} and ${body.endTime}`
    );

    const result = await this.reservationService.checkConflict(
      body.userId,
      new Date(body.startTime),
      new Date(body.endTime)
    );

    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  /**
   * 获取预约统计信息
   * GET /scheduler/reservations/stats?userId=xxx
   */
  @Get('reservations/stats/summary')
  async getReservationStatistics(@Query('userId') userId?: string) {
    this.logger.log(`Getting reservation statistics for user: ${userId || 'all'}`);

    const result = await this.reservationService.getReservationStatistics(userId);

    return {
      success: true,
      data: result,
    };
  }

  // ==================== 优先级队列 API (Phase 3) ====================

  /**
   * 加入队列
   * POST /scheduler/queue/join
   */
  @Post('queue/join')
  async joinQueue(
    @Body() dto: JoinQueueDto,
    @Query('userId') userId: string,
    @Query('tenantId') tenantId?: string,
    @Query('userTier') userTier: string = 'standard'
  ) {
    this.logger.log(`User ${userId} (${userTier}) joining queue`);

    const result = await this.queueService.joinQueue(userId, tenantId, userTier, dto);

    return {
      success: true,
      data: result,
      message: `Joined queue at position ${result.queuePosition}`,
    };
  }

  /**
   * 取消队列条目
   * POST /scheduler/queue/:id/cancel
   */
  @Post('queue/:id/cancel')
  async cancelQueue(@Param('id') queueId: string, @Body() dto: CancelQueueDto) {
    this.logger.log(`Cancelling queue entry ${queueId}`);

    const result = await this.queueService.cancelQueue(queueId, dto);

    return {
      success: true,
      data: result,
      message: 'Queue entry cancelled successfully',
    };
  }

  /**
   * 获取队列条目详情
   * GET /scheduler/queue/:id
   */
  @Get('queue/:id')
  async getQueueEntry(@Param('id') queueId: string) {
    this.logger.log(`Getting queue entry ${queueId}`);

    const result = await this.queueService.getQueueEntry(queueId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 查询队列列表
   * GET /scheduler/queue?userId=xxx&status=waiting&page=1&pageSize=10
   */
  @Get('queue')
  async getQueueList(@Query() query: QueryQueueDto) {
    this.logger.log(`Querying queue with filters: ${JSON.stringify(query)}`);

    const result = await this.queueService.getQueueList(query);

    return {
      success: true,
      data: result,
      message: `Found ${result.total} queue entry(ies)`,
    };
  }

  /**
   * 获取队列位置信息
   * GET /scheduler/queue/:id/position
   */
  @Get('queue/:id/position')
  async getQueuePosition(@Param('id') queueId: string) {
    this.logger.log(`Getting position for queue entry ${queueId}`);

    const result = await this.queueService.getQueuePosition(queueId);

    return {
      success: true,
      data: result,
      message: `Currently at position ${result.position}`,
    };
  }

  /**
   * 手动处理下一个队列条目（管理员）
   * POST /scheduler/queue/process-next
   */
  @Post('queue/process-next')
  async processNextQueueEntry() {
    this.logger.log('Manually processing next queue entry...');

    const result = await this.queueService.processNextQueueEntry();

    return {
      success: result,
      message: result
        ? 'Queue entry processed successfully'
        : 'No queue entries to process or processing failed',
    };
  }

  /**
   * 批量处理队列（管理员）
   * POST /scheduler/queue/process-batch
   */
  @Post('queue/process-batch')
  async processQueueBatch(@Body() dto: ProcessQueueBatchDto) {
    this.logger.log(`Batch processing queue (max: ${dto.maxCount || 10} entries)...`);

    const result = await this.queueService.processQueueBatch(dto);

    return {
      success: true,
      data: result,
      message: `Processed ${result.totalProcessed} entries: ${result.successCount} succeeded, ${result.failedCount} failed`,
    };
  }

  /**
   * 获取队列统计信息
   * GET /scheduler/queue/stats
   */
  @Get('queue/stats')
  async getQueueStatistics() {
    this.logger.log('Getting queue statistics...');

    const result = await this.queueService.getQueueStatistics();

    return {
      success: true,
      data: result,
    };
  }

  // ==================== 任务队列别名 API (兼容性) ====================

  /**
   * 查询任务列表（队列别名）
   * GET /scheduler/tasks?userId=xxx&status=waiting&page=1&pageSize=10
   * 这是 GET /scheduler/queue 的别名接口，用于兼容前端
   */
  @Get('tasks')
  async getTaskList(@Query() query: QueryQueueDto) {
    this.logger.log(`Querying tasks (queue alias) with filters: ${JSON.stringify(query)}`);

    const result = await this.queueService.getQueueList(query);

    return {
      success: true,
      data: result,
      message: `Found ${result.total} task(s)`,
    };
  }

  // ==================== 设备重新调度 API ====================

  /**
   * 重新调度设备
   * POST /scheduler/reschedule/:deviceId
   * 用于将已分配的设备重新调度到更合适的节点
   */
  @Post('reschedule/:deviceId')
  async rescheduleDevice(
    @Param('deviceId') deviceId: string,
    @Body()
    body?: {
      reason?: string;
      preferredNode?: string;
      durationMinutes?: number;
    }
  ) {
    this.logger.log(
      `Rescheduling device ${deviceId}, reason: ${body?.reason || 'manual'}, preferredNode: ${body?.preferredNode || 'auto'}`
    );

    // 获取当前设备的分配信息
    const allocations = await this.allocationService.getDeviceAllocations(deviceId);

    if (!allocations || allocations.length === 0) {
      return {
        success: false,
        message: 'Device is not currently allocated',
        deviceId,
      };
    }

    const currentAllocation = allocations[0];
    const previousAllocationId = currentAllocation.id;

    try {
      // 准备调度请求（基于原分配的资源需求）
      const scheduleRequest: ScheduleRequest = {
        cpuCores: 2, // 可以从设备元数据中获取
        memoryMB: 2048,
        storageMB: 8192,
        preferredNode: body?.preferredNode,
      };

      // 重新调度到新节点
      const newNode = await this.schedulerService.scheduleDevice(scheduleRequest);

      // 释放当前分配
      await this.allocationService.releaseDevice(deviceId, currentAllocation.userId);

      // 创建新的分配
      const newAllocation = await this.allocationService.allocateDevice({
        userId: currentAllocation.userId,
        tenantId: currentAllocation.tenantId,
        durationMinutes: body?.durationMinutes || currentAllocation.durationMinutes || 60,
        preferredSpecs: {
          minCpu: 2,
          minMemory: 2048,
        },
      });

      return {
        success: true,
        message: 'Device rescheduled successfully',
        data: {
          deviceId,
          previousAllocationId,
          previousNodeId: newNode.nodeId, // 之前的节点ID（这里简化处理）
          newNodeId: newNode.nodeId,
          newAllocationId: newAllocation.allocationId,
          newDeviceId: newAllocation.deviceId,
          reason: body?.reason || 'manual reschedule',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to reschedule device ${deviceId}:`, error);

      return {
        success: false,
        message: `Reschedule failed: ${error.message}`,
        deviceId,
        error: error.message,
      };
    }
  }

  // ==================== 资源使用趋势分析 API ====================

  /**
   * 获取节点使用趋势
   * GET /scheduler/nodes/:nodeId/usage-trend?hours=24
   */
  @Get('nodes/:nodeId/usage-trend')
  async getNodeUsageTrend(
    @Param('nodeId') nodeId: string,
    @Query('hours') hours: string = '24'
  ) {
    this.logger.log(`Getting usage trend for node ${nodeId}, hours: ${hours}`);

    try {
      const hoursNum = parseInt(hours, 10) || 24;
      const trend = await this.resourceMonitorService.getNodeUsageTrend(nodeId, hoursNum);

      return {
        success: true,
        data: trend,
        message: `Node usage trend data retrieved (${trend.dataPoints} data points)`,
      };
    } catch (error) {
      this.logger.error(`Failed to get node usage trend: ${error.message}`);

      return {
        success: false,
        message: `Failed to get node usage trend: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 获取集群使用趋势
   * GET /scheduler/cluster/usage-trend?hours=24
   */
  @Get('cluster/usage-trend')
  async getClusterUsageTrend(@Query('hours') hours: string = '24') {
    this.logger.log(`Getting cluster usage trend, hours: ${hours}`);

    try {
      const hoursNum = parseInt(hours, 10) || 24;
      const trend = await this.resourceMonitorService.getClusterUsageTrend(hoursNum);

      return {
        success: true,
        data: trend,
        message: `Cluster usage trend data retrieved (${trend.dataPoints} data points)`,
      };
    } catch (error) {
      this.logger.error(`Failed to get cluster usage trend: ${error.message}`);

      return {
        success: false,
        message: `Failed to get cluster usage trend: ${error.message}`,
        error: error.message,
      };
    }
  }
}
