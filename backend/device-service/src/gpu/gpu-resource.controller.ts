import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { GpuResourceService } from './gpu-resource.service';
import {
  QueryGPUDevicesDto,
  AllocateGPUDto,
  DeallocateGPUDto,
  QueryGPUAllocationsDto,
  QueryGPUUsageTrendDto,
  UpdateGPUDriverDto,
} from './dto/gpu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * GPU 资源管理控制器
 */
@Controller('resources')
@UseGuards(JwtAuthGuard)
export class GpuResourceController {
  private readonly logger = new Logger(GpuResourceController.name);

  constructor(private readonly gpuResourceService: GpuResourceService) {}

  // ========== GPU 设备管理 ==========

  /**
   * 获取 GPU 设备列表
   * GET /resources/gpu
   */
  @Get('gpu')
  async getGPUDevices(@Query() query: QueryGPUDevicesDto) {
    this.logger.log(`Fetching GPU devices with filters: ${JSON.stringify(query)}`);
    return this.gpuResourceService.getGPUDevices(query);
  }

  /**
   * 获取 GPU 设备详情
   * GET /resources/gpu/:id
   */
  @Get('gpu/:id')
  async getGPUDevice(@Param('id') id: string) {
    this.logger.log(`Fetching GPU device: ${id}`);
    return this.gpuResourceService.getGPUDevice(id);
  }

  /**
   * 获取 GPU 实时状态
   * GET /resources/gpu/:id/status
   */
  @Get('gpu/:id/status')
  async getGPUStatus(@Param('id') id: string) {
    this.logger.log(`Fetching GPU status: ${id}`);
    return this.gpuResourceService.getGPUStatus(id);
  }

  // ========== GPU 分配管理 ==========

  /**
   * 分配 GPU 到设备
   * POST /resources/gpu/:gpuId/allocate
   */
  @Post('gpu/:gpuId/allocate')
  async allocateGPU(@Param('gpuId') gpuId: string, @Body() dto: AllocateGPUDto) {
    this.logger.log(`Allocating GPU ${gpuId} to device ${dto.deviceId}`);
    return this.gpuResourceService.allocateGPU(gpuId, dto);
  }

  /**
   * 释放 GPU 分配
   * DELETE /resources/gpu/:gpuId/deallocate
   */
  @Delete('gpu/:gpuId/deallocate')
  async deallocateGPU(@Param('gpuId') gpuId: string, @Body() dto: DeallocateGPUDto) {
    this.logger.log(`Deallocating GPU ${gpuId}`);
    return this.gpuResourceService.deallocateGPU(gpuId, dto);
  }

  /**
   * 获取分配记录
   * GET /resources/gpu/allocations
   */
  @Get('gpu/allocations')
  async getGPUAllocations(@Query() query: QueryGPUAllocationsDto) {
    this.logger.log(`Fetching GPU allocations with filters: ${JSON.stringify(query)}`);
    return this.gpuResourceService.getGPUAllocations(query);
  }

  // ========== GPU 监控统计 ==========

  /**
   * 获取 GPU 统计信息
   * GET /resources/gpu/stats
   */
  @Get('gpu/stats')
  async getGPUStats() {
    this.logger.log('Fetching GPU statistics');
    return this.gpuResourceService.getGPUStats();
  }

  /**
   * 获取 GPU 使用趋势
   * GET /resources/gpu/:gpuId/usage-trend
   */
  @Get('gpu/:gpuId/usage-trend')
  async getGPUUsageTrend(@Param('gpuId') gpuId: string, @Query() query: QueryGPUUsageTrendDto) {
    this.logger.log(`Fetching GPU usage trend: ${gpuId}`);
    return this.gpuResourceService.getGPUUsageTrend(gpuId, query);
  }

  /**
   * 获取集群 GPU 使用趋势
   * GET /resources/gpu/cluster-trend
   */
  @Get('gpu/cluster-trend')
  async getClusterGPUTrend(@Query() query: QueryGPUUsageTrendDto) {
    this.logger.log('Fetching cluster GPU usage trend');
    return this.gpuResourceService.getClusterGPUTrend(query);
  }

  /**
   * 获取 GPU 性能分析
   * GET /resources/gpu/:gpuId/performance
   */
  @Get('gpu/:gpuId/performance')
  async getGPUPerformanceAnalysis(@Param('gpuId') gpuId: string) {
    this.logger.log(`Fetching GPU performance analysis: ${gpuId}`);
    return this.gpuResourceService.getGPUPerformanceAnalysis(gpuId);
  }

  // ========== GPU 驱动管理 ==========

  /**
   * 获取驱动信息
   * GET /resources/gpu/driver/:nodeId
   */
  @Get('gpu/driver/:nodeId')
  async getGPUDriverInfo(@Param('nodeId') nodeId: string) {
    this.logger.log(`Fetching GPU driver info for node: ${nodeId}`);
    return this.gpuResourceService.getGPUDriverInfo(nodeId);
  }

  /**
   * 更新驱动
   * POST /resources/gpu/driver/:nodeId/update
   */
  @Post('gpu/driver/:nodeId/update')
  async updateGPUDriver(@Param('nodeId') nodeId: string, @Body() dto: UpdateGPUDriverDto) {
    this.logger.log(`Updating GPU driver for node: ${nodeId}`);
    return this.gpuResourceService.updateGPUDriver(nodeId, dto);
  }
}
