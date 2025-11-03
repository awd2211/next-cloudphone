import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { ProxyDeviceGroupService } from '../services/proxy-device-group.service';
import {
  CreateDeviceGroupDto,
  UpdateDeviceGroupDto,
  AddDeviceToGroupDto,
  BatchAddDevicesDto,
  AssignProxiesToGroupDto,
  DeviceGroupDetailsResponseDto,
  AutoScaleResultDto,
  BatchOperationResultDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理设备组控制器
 *
 * 提供设备组管理、成员管理、代理池分配功能
 */
@ApiTags('Proxy Device Groups')
@Controller('proxy/device-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyDeviceGroupController {
  constructor(
    private readonly deviceGroupService: ProxyDeviceGroupService,
  ) {}

  /**
   * 创建设备组
   */
  @Post()
  @RequirePermission('proxy:device-group:create')
  @ApiOperation({
    summary: '创建设备组',
    description: '创建新的设备组，支持专属代理池和自动扩展',
  })
  @ApiResponse({
    status: 201,
    description: '创建成功',
    type: Object,
  })
  async createDeviceGroup(
    @Request() req: any,
    @Body() dto: CreateDeviceGroupDto,
  ): Promise<ProxyApiResponse<any>> {
    const userId = req.user.sub;

    const group = await this.deviceGroupService.createDeviceGroup({
      ...dto,
      userId,
    });

    return ProxyApiResponse.success(group, 'Device group created');
  }

  /**
   * 获取用户的所有设备组
   */
  @Get()
  @RequirePermission('proxy:device-group:read')
  @ApiOperation({
    summary: '设备组列表',
    description: '获取当前用户的所有设备组',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [Object],
  })
  async getUserGroups(
    @Request() req: any,
  ): Promise<ProxyApiResponse<any[]>> {
    const userId = req.user.sub;
    const groups = await this.deviceGroupService.getUserGroups(userId);
    return ProxyApiResponse.success(groups);
  }

  /**
   * 获取设备组详情
   */
  @Get(':groupId')
  @RequirePermission('proxy:device-group:read')
  @ApiOperation({
    summary: '设备组详情',
    description: '获取设备组的详细信息，包括设备列表、代理池和统计数据',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: DeviceGroupDetailsResponseDto,
  })
  async getGroupDetails(
    @Param('groupId') groupId: string,
  ): Promise<ProxyApiResponse<DeviceGroupDetailsResponseDto>> {
    const details = await this.deviceGroupService.getGroupDetails(groupId);
    return ProxyApiResponse.success(details as any);
  }

  /**
   * 更新设备组配置
   */
  @Put(':groupId')
  @RequirePermission('proxy:device-group:update')
  @ApiOperation({
    summary: '更新设备组',
    description: '更新设备组的配置参数',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: Object,
  })
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateDeviceGroupDto,
  ): Promise<ProxyApiResponse<any>> {
    const group = await this.deviceGroupService.updateGroup(groupId, dto);
    return ProxyApiResponse.success(group, 'Device group updated');
  }

  /**
   * 删除设备组
   */
  @Delete(':groupId')
  @RequirePermission('proxy:device-group:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除设备组',
    description: '删除设备组及其所有关联数据',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 204,
    description: '删除成功',
  })
  async deleteGroup(@Param('groupId') groupId: string): Promise<void> {
    await this.deviceGroupService.deleteGroup(groupId);
  }

  /**
   * 添加设备到组
   */
  @Post(':groupId/devices')
  @RequirePermission('proxy:device-group:manage-devices')
  @ApiOperation({
    summary: '添加设备',
    description: '将设备添加到设备组',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 201,
    description: '添加成功',
    type: Object,
  })
  async addDevice(
    @Param('groupId') groupId: string,
    @Body() dto: AddDeviceToGroupDto,
  ): Promise<ProxyApiResponse<any>> {
    const groupDevice = await this.deviceGroupService.addDeviceToGroup(
      groupId,
      dto.deviceId,
    );

    return ProxyApiResponse.success(groupDevice, 'Device added to group');
  }

  /**
   * 批量添加设备
   */
  @Post(':groupId/devices/batch')
  @RequirePermission('proxy:device-group:manage-devices')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量添加设备',
    description: '将多个设备批量添加到设备组',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '批量添加完成',
    type: BatchOperationResultDto,
  })
  async batchAddDevices(
    @Param('groupId') groupId: string,
    @Body() dto: BatchAddDevicesDto,
  ): Promise<ProxyApiResponse<BatchOperationResultDto>> {
    const result = await this.deviceGroupService.addDevicesToGroup(
      groupId,
      dto.deviceIds,
    );

    return ProxyApiResponse.success(result);
  }

  /**
   * 从组中移除设备
   */
  @Delete(':groupId/devices/:deviceId')
  @RequirePermission('proxy:device-group:manage-devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '移除设备',
    description: '从设备组中移除指定设备',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiParam({ name: 'deviceId', description: '设备ID' })
  @ApiResponse({
    status: 204,
    description: '移除成功',
  })
  async removeDevice(
    @Param('groupId') groupId: string,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    await this.deviceGroupService.removeDeviceFromGroup(groupId, deviceId);
  }

  /**
   * 获取组的设备列表
   */
  @Get(':groupId/devices')
  @RequirePermission('proxy:device-group:read')
  @ApiOperation({
    summary: '设备列表',
    description: '获取设备组中的所有设备',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [Object],
  })
  async getGroupDevices(
    @Param('groupId') groupId: string,
  ): Promise<ProxyApiResponse<any[]>> {
    const devices = await this.deviceGroupService.getGroupDevices(groupId);
    return ProxyApiResponse.success(devices);
  }

  /**
   * 分配代理到组
   */
  @Post(':groupId/proxies')
  @RequirePermission('proxy:device-group:manage-proxies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '分配代理',
    description: '将代理分配给设备组的专属代理池',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '分配成功',
    type: Object,
  })
  async assignProxies(
    @Param('groupId') groupId: string,
    @Body() dto: AssignProxiesToGroupDto,
  ): Promise<ProxyApiResponse<{ assigned: number }>> {
    const result = await this.deviceGroupService.assignProxiesToGroup({
      groupId,
      proxyIds: dto.proxyIds,
      priority: dto.priority,
    });

    return ProxyApiResponse.success(result, `Assigned ${result.assigned} proxies`);
  }

  /**
   * 获取组的代理列表
   */
  @Get(':groupId/proxies')
  @RequirePermission('proxy:device-group:read')
  @ApiOperation({
    summary: '代理列表',
    description: '获取设备组的专属代理池',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [Object],
  })
  async getGroupProxies(
    @Param('groupId') groupId: string,
  ): Promise<ProxyApiResponse<any[]>> {
    const proxies = await this.deviceGroupService.getGroupProxies(groupId);
    return ProxyApiResponse.success(proxies);
  }

  /**
   * 获取组统计
   */
  @Get(':groupId/stats')
  @RequirePermission('proxy:device-group:read')
  @ApiOperation({
    summary: '组统计',
    description: '获取设备组的统计数据',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: Object,
  })
  async getGroupStats(
    @Param('groupId') groupId: string,
  ): Promise<ProxyApiResponse<any>> {
    const stats = await this.deviceGroupService.getGroupStats(groupId);
    return ProxyApiResponse.success(stats);
  }

  /**
   * 更新组统计
   */
  @Post(':groupId/stats/refresh')
  @RequirePermission('proxy:device-group:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新统计',
    description: '手动触发统计数据更新',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: Object,
  })
  async refreshGroupStats(
    @Param('groupId') groupId: string,
  ): Promise<ProxyApiResponse<any>> {
    const stats = await this.deviceGroupService.updateGroupStats(groupId);
    return ProxyApiResponse.success(stats, 'Stats refreshed');
  }

  /**
   * 自动扩展组代理池
   */
  @Post(':groupId/auto-scale')
  @RequirePermission('proxy:device-group:admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '自动扩展',
    description: '手动触发代理池自动扩展',
  })
  @ApiParam({ name: 'groupId', description: '设备组ID' })
  @ApiResponse({
    status: 200,
    description: '扩展完成',
    type: AutoScaleResultDto,
  })
  async triggerAutoScale(
    @Param('groupId') groupId: string,
  ): Promise<ProxyApiResponse<AutoScaleResultDto>> {
    const result = await this.deviceGroupService.autoScaleGroupProxies(groupId);
    return ProxyApiResponse.success(result);
  }
}
