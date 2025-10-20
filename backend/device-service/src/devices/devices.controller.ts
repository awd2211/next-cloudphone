import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceStatus } from '../entities/device.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermission('devices.create')
  @ApiOperation({ summary: '创建设备', description: '创建新的云手机设备，自动创建 Docker 容器' })
  @ApiResponse({ status: 201, description: '设备创建中' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    const device = await this.devicesService.create(createDeviceDto);
    return {
      success: true,
      data: device,
      message: '设备创建中，请稍候...',
    };
  }

  @Get()
  @RequirePermission('devices.read')
  @ApiOperation({ summary: '获取设备列表', description: '分页获取设备列表，支持多种筛选条件' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiQuery({ name: 'status', required: false, enum: DeviceStatus, description: '设备状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: DeviceStatus,
  ) {
    const result = await this.devicesService.findAll(
      parseInt(page),
      parseInt(limit),
      userId,
      tenantId,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  @RequirePermission('devices.read')
  @ApiOperation({ summary: '获取设备详情', description: '根据 ID 获取设备详细信息' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    const device = await this.devicesService.findOne(id);
    return {
      success: true,
      data: device,
    };
  }

  @Get(':id/stats')
  @RequirePermission('devices.read')
  @ApiOperation({ summary: '获取设备统计', description: '获取设备的资源使用统计信息' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStats(@Param('id') id: string) {
    const stats = await this.devicesService.getStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  @Patch(':id')
  @RequirePermission('devices.update')
  @ApiOperation({ summary: '更新设备', description: '更新设备配置信息' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    const device = await this.devicesService.update(id, updateDeviceDto);
    return {
      success: true,
      data: device,
      message: '设备更新成功',
    };
  }

  @Post(':id/start')
  @RequirePermission('devices.update')
  @ApiOperation({ summary: '启动设备', description: '启动已停止的设备容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '启动成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async start(@Param('id') id: string) {
    const device = await this.devicesService.start(id);
    return {
      success: true,
      data: device,
      message: '设备启动成功',
    };
  }

  @Post(':id/stop')
  @RequirePermission('devices.update')
  @ApiOperation({ summary: '停止设备', description: '停止正在运行的设备容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '停止成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async stop(@Param('id') id: string) {
    const device = await this.devicesService.stop(id);
    return {
      success: true,
      data: device,
      message: '设备停止成功',
    };
  }

  @Post(':id/restart')
  @RequirePermission('devices.update')
  @ApiOperation({ summary: '重启设备', description: '重启设备容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '重启成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async restart(@Param('id') id: string) {
    const device = await this.devicesService.restart(id);
    return {
      success: true,
      data: device,
      message: '设备重启成功',
    };
  }

  @Post(':id/heartbeat')
  @RequirePermission('devices.update')
  @ApiOperation({ summary: '更新心跳', description: '更新设备心跳和资源使用情况' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '心跳更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async heartbeat(@Param('id') id: string, @Body() stats: any) {
    await this.devicesService.updateHeartbeat(id, stats);
    return {
      success: true,
      message: '心跳更新成功',
    };
  }

  @Delete(':id')
  @RequirePermission('devices.delete')
  @ApiOperation({ summary: '删除设备', description: '删除设备并清理相关容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string) {
    await this.devicesService.remove(id);
    return {
      success: true,
      message: '设备删除成功',
    };
  }
}
