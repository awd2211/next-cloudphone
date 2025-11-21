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
  UploadedFile,
  UseInterceptors,
  Res,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { DevicesService } from './devices.service';
import { DeviceDeletionSaga } from './deletion.saga';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceStatus } from '../entities/device.entity';
import { DeviceMetrics } from '../providers/provider.types';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';
import { CursorPaginationDto, DataScopeGuard, DataScope, DataScopeType } from '@cloudphone/shared';
import {
  ShellCommandDto,
  PushFileDto,
  PullFileDto,
  InstallApkDto,
  UninstallApkDto,
} from '../adb/dto/shell-command.dto';
import { QuotaGuard, QuotaCheck, QuotaCheckType } from '../quota/quota.guard';
import {
  StartAppDto,
  StopAppDto,
  ClearAppDataDto,
  CreateSnapshotDto,
  RestoreSnapshotDto,
} from './dto/app-operations.dto';
import {
  RequestSmsDto,
  BatchRequestSmsDto,
  CancelSmsDto,
  SmsNumberResponse,
  BatchSmsNumberResponse,
  SmsMessageDto,
} from './dto/sms-request.dto';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(AuthGuard('jwt'), PermissionsGuard, DataScopeGuard)
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly deletionSaga: DeviceDeletionSaga,
  ) {}

  @Post()
  @RequirePermission('device.create')
  @UseGuards(QuotaGuard)
  @QuotaCheck(QuotaCheckType.DEVICE_CREATION)
  @ApiOperation({
    summary: '创建设备',
    description: '创建新的云手机设备，使用 Saga 模式保证原子性（需检查配额）',
  })
  @ApiResponse({ status: 201, description: '设备创建 Saga 已启动' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足或配额超限' })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    const { sagaId, device } = await this.devicesService.create(createDeviceDto);
    // TransformInterceptor 会自动包装为 { success, data, timestamp }
    return {
      sagaId,
      device,
      message: '设备创建 Saga 已启动，请稍候...',
    };
  }

  @Get('stats')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备统计信息',
    description: '获取所有设备的状态统计',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getOverallStats() {
    const result = await this.devicesService.findAll(1, 9999);
    const devices = result.data;

    // TransformInterceptor 会自动包装
    return {
      total: devices.length,
      idle: devices.filter((d) => d.status === DeviceStatus.IDLE).length,
      running: devices.filter((d) => d.status === DeviceStatus.RUNNING).length,
      stopped: devices.filter((d) => d.status === DeviceStatus.STOPPED).length,
      error: devices.filter((d) => d.status === DeviceStatus.ERROR).length,
    };
  }

  @Get('available')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取可用设备列表',
    description: '获取所有状态为IDLE的可用设备',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAvailableDevices() {
    const result = await this.devicesService.findAll(
      1,
      9999,
      undefined,
      undefined,
      DeviceStatus.IDLE
    );
    // TransformInterceptor 会自动包装
    return {
      items: result.data,
      total: result.total,
    };
  }

  // TODO: 临时注释 - 等待实现 getQuickList 方法
  // @Get('quick-list')
  // @RequirePermission('device.read')
  // @ApiOperation({
  //   summary: '设备快速列表',
  //   description: '返回轻量级设备列表，用于下拉框等UI组件（带缓存优化）',
  // })
  // @ApiQuery({ name: 'status', required: false, description: '状态过滤', example: 'online' })
  // @ApiQuery({ name: 'search', required: false, description: '搜索关键词', example: 'device' })
  // @ApiQuery({ name: 'limit', required: false, description: '限制数量', example: 100 })
  // @ApiResponse({
  //   status: 200,
  //   description: '获取成功',
  //   schema: {
  //     example: {
  //       items: [
  //         {
  //           id: '123e4567-e89b-12d3-a456-426614174000',
  //           name: 'device-001',
  //           status: 'online',
  //           extra: { provider: 'redroid', region: 'us-west' },
  //         },
  //       ],
  //       total: 42,
  //       cached: false,
  //     },
  //   },
  // })
  // @ApiResponse({ status: 403, description: '权限不足' })
  // async getQuickList(@Query() query: any) {
  //   return this.devicesService.getQuickList(query);
  // }

  // TODO: 临时注释 - 等待实现 getFiltersMetadata 方法
  // @Get('filters/metadata')
  // @RequirePermission('device.read')
  // @ApiOperation({
  //   summary: '设备筛选元数据',
  //   description: '获取设备列表页所有可用的筛选选项及统计信息（用于生成动态筛选表单）',
  // })
  // @ApiQuery({
  //   name: 'includeCount',
  //   required: false,
  //   description: '是否包含每个选项的记录数量',
  //   example: true,
  // })
  // @ApiQuery({
  //   name: 'onlyWithData',
  //   required: false,
  //   description: '是否只返回有数据的筛选选项',
  //   example: false,
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: '获取成功',
  //   schema: {
  //     example: {
  //       filters: [
  //         {
  //           field: 'status',
  //           label: '设备状态',
  //           type: 'select',
  //           options: [
  //             { value: 'online', label: '在线', count: 42 },
  //             { value: 'offline', label: '离线', count: 15 },
  //           ],
  //           required: false,
  //           placeholder: '请选择设备状态',
  //         },
  //         {
  //           field: 'providerType',
  //           label: '提供商类型',
  //           type: 'select',
  //           options: [{ value: 'redroid', label: 'Redroid', count: 30 }],
  //           required: false,
  //           placeholder: '请选择提供商',
  //         },
  //       ],
  //       totalRecords: 150,
  //       lastUpdated: '2025-11-03T10:30:00.000Z',
  //       cached: false,
  //       quickFilters: {
  //         online: { status: 'online', label: '在线设备' },
  //         offline: { status: 'offline', label: '离线设备' },
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({ status: 403, description: '权限不足' })
  // async getFiltersMetadata(@Query() query: any) {
  //   return this.devicesService.getFiltersMetadata(query);
  // }

  @Get()
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备列表',
    description: '分页获取设备列表，支持多种筛选条件',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（兼容参数）', example: 10 })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeviceStatus,
    description: '设备状态',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: DeviceStatus
  ) {
    // 支持 pageSize 或 limit 参数
    const itemsPerPage = pageSize || limit || '10';
    const result = await this.devicesService.findAll(
      parseInt(page),
      parseInt(itemsPerPage),
      userId,
      tenantId,
      status
    );

    // 返回标准格式：将 limit 转换为 pageSize
    // TransformInterceptor 会自动包装
    const { limit: _, ...rest } = result;
    return {
      ...rest,
      pageSize: result.limit,
    };
  }

  @Get('cursor')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备列表 (游标分页)',
    description:
      '使用游标分页获取设备列表，性能优化版本。适用于大数据集的高效分页查询（O(1)复杂度）',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '游标（base64编码的时间戳），获取下一页时传入上一页的 nextCursor',
    example: 'MTY5ODc2NTQzMjAwMA==',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量 (1-100)',
    example: 20,
  })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeviceStatus,
    description: '设备状态',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        success: true,
        data: [],
        nextCursor: 'MTY5ODc2NTQzMjAwMA==',
        hasMore: true,
        count: 20,
      },
    },
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAllCursor(
    @Query() paginationDto: CursorPaginationDto,
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: DeviceStatus
  ) {
    const result = await this.devicesService.findAllCursor(paginationDto, userId, tenantId, status);
    // TransformInterceptor 会自动包装
    return result;
  }

  @Get('batch')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '批量获取设备信息',
    description: '根据 ID 列表批量获取设备基本信息（用于服务间调用）',
  })
  @ApiQuery({ name: 'ids', description: '设备 ID 列表（逗号分隔）', example: 'id1,id2,id3' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async batchFindDevices(@Query('ids') idsParam: string) {
    if (!idsParam) {
      return [];
    }

    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      return [];
    }

    // 批量查询设备（最多100个）
    const limitedIds = ids.slice(0, 100);
    const devices = await this.devicesService.findByIds(limitedIds);

    // 只返回基本信息
    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      deviceType: device.type,
      providerType: device.providerType,
      status: device.status,
    }));
  }

  @Get('my')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取我的设备列表',
    description: '获取当前用户的设备列表',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeviceStatus,
    description: '设备状态',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getMyDevices(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('status') status?: DeviceStatus,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    const result = await this.devicesService.findAll(
      parseInt(page),
      parseInt(pageSize),
      userId,
      undefined,
      status,
    );

    // 直接返回 PaginatedResponse 格式，API Gateway 会自动包装
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    };
  }

  @Get('my/stats')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取我的设备统计',
    description: '获取当前用户的设备统计信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getMyDeviceStats(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId;
    const result = await this.devicesService.findAll(1, 9999, userId);
    const devices = result.data;

    // 直接返回统计数据，API Gateway 会自动包装
    return {
      total: devices.length,
      idle: devices.filter((d) => d.status === DeviceStatus.IDLE).length,
      running: devices.filter((d) => d.status === DeviceStatus.RUNNING).length,
      stopped: devices.filter((d) => d.status === DeviceStatus.STOPPED).length,
      error: devices.filter((d) => d.status === DeviceStatus.ERROR).length,
    };
  }

  @Get(':id')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备详情',
    description: '根据 ID 获取设备详细信息',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Get(':id/stats')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备统计',
    description: '获取设备的资源使用统计信息',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStats(@Param('id') id: string) {
    return this.devicesService.getStats(id);
  }

  @Patch(':id')
  @RequirePermission('device.update')
  @ApiOperation({ summary: '更新设备', description: '更新设备配置信息' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    const device = await this.devicesService.update(id, updateDeviceDto);
    return { ...device, message: '设备更新成功' };
  }

  @Post(':id/start')
  @RequirePermission('device.update')
  @ApiOperation({ summary: '启动设备', description: '启动已停止的设备容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '启动成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async start(@Param('id') id: string) {
    const device = await this.devicesService.start(id);
    return { ...device, message: '设备启动成功' };
  }

  @Post(':id/stop')
  @RequirePermission('device.update')
  @ApiOperation({ summary: '停止设备', description: '停止正在运行的设备容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '停止成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async stop(@Param('id') id: string) {
    const device = await this.devicesService.stop(id);
    return { ...device, message: '设备停止成功' };
  }

  @Post(':id/restart')
  @RequirePermission('device.update')
  @ApiOperation({ summary: '重启设备', description: '重启设备容器' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '重启成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async restart(@Param('id') id: string) {
    const device = await this.devicesService.restart(id);
    return { ...device, message: '设备重启成功' };
  }

  /**
   * reboot别名 - 与前端保持一致
   */
  @Post(':id/reboot')
  @RequirePermission('device.update')
  @ApiOperation({ summary: '重启设备 (别名)', description: '重启设备容器 - restart的别名' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '重启成功' })
  @ApiResponse({ status: 400, description: '设备状态不允许此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async reboot(@Param('id') id: string) {
    // 直接调用restart方法
    return this.restart(id);
  }

  @Post(':id/heartbeat')
  @RequirePermission('device.update')
  @ApiOperation({
    summary: '更新心跳',
    description: '更新设备心跳和资源使用情况',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '心跳更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async heartbeat(@Param('id') id: string, @Body() stats: DeviceMetrics) {
    await this.devicesService.updateHeartbeat(id, stats);
    return { message: '心跳更新成功' };
  }

  @Delete(':id')
  @RequirePermission('device.delete')
  @ApiOperation({ summary: '删除设备', description: '通过 Saga 模式删除设备并清理相关资源' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '删除 Saga 已启动' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub || 'system';

    // 启动设备删除 Saga
    const { sagaId } = await this.deletionSaga.startDeletion(id, userId);

    return { sagaId, message: '设备删除 Saga 已启动' };
  }

  @Get('deletion/saga/:sagaId')
  @RequirePermission('device.read')
  @ApiOperation({ summary: '查询设备删除 Saga 状态' })
  @ApiParam({ name: 'sagaId', description: 'Saga ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getDeletionSagaStatus(@Param('sagaId') sagaId: string) {
    return this.deletionSaga.getSagaStatus(sagaId);
  }

  // ADB 相关接口

  @Post(':id/shell')
  @RequirePermission('device.control')
  @ApiOperation({
    summary: '执行 Shell 命令',
    description: '在设备上执行 ADB shell 命令',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: ShellCommandDto })
  @ApiResponse({ status: 200, description: '命令执行成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async executeShell(@Param('id') id: string, @Body() dto: ShellCommandDto) {
    const output = await this.devicesService.executeShellCommand(id, dto.command, dto.timeout);
    return { output, message: '命令执行成功' };
  }

  @Post(':id/screenshot')
  @RequirePermission('device.control')
  @ApiOperation({ summary: '设备截图', description: '获取设备当前屏幕截图' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '截图成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async takeScreenshot(@Param('id') id: string, @Res() res: Response) {
    const imagePath = await this.devicesService.takeScreenshot(id);
    res.sendFile(imagePath);
  }

  @Post(':id/push')
  @RequirePermission('device.control')
  @ApiOperation({ summary: '推送文件', description: '从本地推送文件到设备' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        targetPath: { type: 'string', example: '/sdcard/Download/file.txt' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 200, description: '推送成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async pushFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PushFileDto
  ) {
    await this.devicesService.pushFile(id, file.path, dto.targetPath);
    return { message: '文件推送成功' };
  }

  @Post(':id/pull')
  @RequirePermission('device.control')
  @ApiOperation({ summary: '拉取文件', description: '从设备拉取文件到本地' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: PullFileDto })
  @ApiResponse({ status: 200, description: '拉取成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async pullFile(@Param('id') id: string, @Body() dto: PullFileDto, @Res() res: Response) {
    const localPath = `/tmp/${id}_${Date.now()}_${dto.sourcePath.split('/').pop()}`;
    await this.devicesService.pullFile(id, dto.sourcePath, localPath);
    res.download(localPath);
  }

  @Post(':id/install')
  @RequirePermission('device.control')
  @ApiOperation({ summary: '安装应用', description: '在设备上安装 APK 应用' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: InstallApkDto })
  @ApiResponse({ status: 200, description: '安装成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async installApk(@Param('id') id: string, @Body() dto: InstallApkDto) {
    await this.devicesService.installApk(id, dto.apkPath, dto.reinstall);
    return { message: 'APK 安装成功' };
  }

  @Post(':id/uninstall')
  @RequirePermission('device.control')
  @ApiOperation({ summary: '卸载应用', description: '从设备卸载应用' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: UninstallApkDto })
  @ApiResponse({ status: 200, description: '卸载成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async uninstallApp(@Param('id') id: string, @Body() dto: UninstallApkDto) {
    await this.devicesService.uninstallApp(id, dto.packageName);
    return { message: '应用卸载成功' };
  }

  @Get(':id/packages')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取已安装应用',
    description: '获取设备上已安装的应用列表',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getInstalledPackages(@Param('id') id: string) {
    const packages = await this.devicesService.getInstalledPackages(id);
    return { packages, count: packages.length };
  }

  @Get(':id/logcat')
  @RequirePermission('device.read')
  @ApiOperation({ summary: '读取日志', description: '读取设备 logcat 日志' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiQuery({ name: 'filter', required: false, description: '日志过滤关键词' })
  @ApiQuery({
    name: 'lines',
    required: false,
    description: '读取行数',
    example: 100,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async readLogcat(
    @Param('id') id: string,
    @Query('filter') filter?: string,
    @Query('lines') lines?: string
  ) {
    const logs = await this.devicesService.readLogcat(
      id,
      filter,
      lines ? parseInt(lines) : undefined
    );
    return { logs };
  }

  @Post(':id/logcat/clear')
  @RequirePermission('device.control')
  @ApiOperation({ summary: '清空日志', description: '清空设备 logcat 日志' })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '清空成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async clearLogcat(@Param('id') id: string) {
    await this.devicesService.clearLogcat(id);
    return { message: '日志清空成功' };
  }

  @Get(':id/properties')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备属性',
    description: '获取设备的系统属性信息',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getDeviceProperties(@Param('id') id: string) {
    return this.devicesService.getDeviceProperties(id);
  }

  @Get(':id/stream-info')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备流信息',
    description: '获取设备屏幕流的连接信息（供 Media Service 使用）',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStreamInfo(@Param('id') id: string) {
    return this.devicesService.getStreamInfo(id);
  }

  @Get(':id/screenshot')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备截图',
    description: '获取设备当前屏幕截图（PNG 格式）',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({
    status: 200,
    description: '截图获取成功',
    content: { 'image/png': {} },
  })
  @ApiResponse({ status: 404, description: '设备不存在或未连接' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getScreenshot(@Param('id') id: string, @Res() res: Response) {
    const screenshot = await this.devicesService.getScreenshot(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="device-${id}-screenshot.png"`);
    res.send(screenshot);
  }

  /**
   * ========== 批量操作接口 ==========
   */

  @Post('batch/start')
  @RequirePermission('device.update')
  @ApiOperation({
    summary: '批量启动设备',
    description: '批量启动多个设备',
  })
  @ApiResponse({ status: 200, description: '批量启动成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchStart(@Body('ids') ids: string[]) {
    if (!ids || ids.length === 0) {
      return { succeeded: 0, failed: 0, total: 0, message: '请提供要启动的设备ID列表' };
    }

    const results = await Promise.allSettled(ids.map((id) => this.devicesService.start(id)));

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      succeeded,
      failed,
      total: ids.length,
      message: `批量启动完成：成功 ${succeeded} 个，失败 ${failed} 个`,
    };
  }

  @Post('batch/stop')
  @RequirePermission('device.update')
  @ApiOperation({
    summary: '批量停止设备',
    description: '批量停止多个设备',
  })
  @ApiResponse({ status: 200, description: '批量停止成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchStop(@Body('ids') ids: string[]) {
    if (!ids || ids.length === 0) {
      return { succeeded: 0, failed: 0, total: 0, message: '请提供要停止的设备ID列表' };
    }

    const results = await Promise.allSettled(ids.map((id) => this.devicesService.stop(id)));

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      succeeded,
      failed,
      total: ids.length,
      message: `批量停止完成：成功 ${succeeded} 个，失败 ${failed} 个`,
    };
  }

  @Post('batch/reboot')
  @RequirePermission('device.update')
  @ApiOperation({
    summary: '批量重启设备',
    description: '批量重启多个设备',
  })
  @ApiResponse({ status: 200, description: '批量重启成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchReboot(@Body('ids') ids: string[]) {
    if (!ids || ids.length === 0) {
      return { succeeded: 0, failed: 0, total: 0, message: '请提供要重启的设备ID列表' };
    }

    const results = await Promise.allSettled(ids.map((id) => this.devicesService.restart(id)));

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      succeeded,
      failed,
      total: ids.length,
      message: `批量重启完成：成功 ${succeeded} 个，失败 ${failed} 个`,
    };
  }

  @Post('batch/delete')
  @RequirePermission('device.delete')
  @ApiOperation({
    summary: '批量删除设备',
    description: '通过 Saga 模式批量删除多个设备',
  })
  @ApiResponse({ status: 200, description: '批量删除 Saga 已启动' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchDelete(@Body('ids') ids: string[], @Req() req: any) {
    if (!ids || ids.length === 0) {
      return { succeeded: 0, failed: 0, total: 0, sagaIds: [], message: '请提供要删除的设备ID列表' };
    }

    const userId = req.user?.userId || req.user?.sub || 'system';

    // 为每个设备启动删除 Saga
    const results = await Promise.allSettled(
      ids.map((id) => this.deletionSaga.startDeletion(id, userId))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // 收集所有 Saga ID
    const sagaIds = results
      .filter((r) => r.status === 'fulfilled')
      .map((r: any) => r.value.sagaId);

    return {
      succeeded,
      failed,
      total: ids.length,
      sagaIds,
      message: `批量删除 Saga 已启动：成功 ${succeeded} 个，失败 ${failed} 个`,
    };
  }

  @Post('batch/stats')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '批量获取设备统计信息',
    description: '一次性获取多个设备的统计数据，避免 N+1 查询问题',
  })
  @ApiResponse({
    status: 200,
    description: '批量获取成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: '设备统计映射 (deviceId => stats)',
          additionalProperties: {
            type: 'object',
            properties: {
              deviceId: { type: 'string' },
              providerType: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              cpuUsage: { type: 'number' },
              memoryUsage: { type: 'number' },
              memoryUsed: { type: 'number' },
              storageUsed: { type: 'number' },
              storageUsage: { type: 'number' },
              networkRx: { type: 'number' },
              networkTx: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchStats(@Body('deviceIds') deviceIds: string[]) {
    if (!deviceIds || deviceIds.length === 0) {
      return { stats: {}, message: '请提供设备ID列表' };
    }

    if (deviceIds.length > 200) {
      return { stats: {}, message: '单次最多支持查询 200 个设备' };
    }

    const stats = await this.devicesService.getStatsBatch(deviceIds);

    return {
      stats,
      message: `成功获取 ${Object.keys(stats).length}/${deviceIds.length} 个设备的统计信息`,
    };
  }

  // ============================================================
  // 应用操作端点 (阿里云专属)
  // ============================================================

  @Post(':id/apps/start')
  @RequirePermission('device.app-operate')
  @ApiOperation({
    summary: '启动应用',
    description: '启动设备上的应用 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '应用启动成功' })
  @ApiResponse({ status: 400, description: '设备未运行或不支持此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async startApp(@Param('id') id: string, @Body() dto: StartAppDto) {
    await this.devicesService.startApp(id, dto.packageName);
    return { message: `应用 ${dto.packageName} 启动成功` };
  }

  @Post(':id/apps/stop')
  @RequirePermission('device.app-operate')
  @ApiOperation({
    summary: '停止应用',
    description: '停止设备上的应用 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '应用停止成功' })
  @ApiResponse({ status: 400, description: '设备未运行或不支持此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async stopApp(@Param('id') id: string, @Body() dto: StopAppDto) {
    await this.devicesService.stopApp(id, dto.packageName);
    return { message: `应用 ${dto.packageName} 停止成功` };
  }

  @Post(':id/apps/clear-data')
  @RequirePermission('device.app-operate')
  @ApiOperation({
    summary: '清除应用数据',
    description: '清除设备上应用的数据 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '应用数据清除成功' })
  @ApiResponse({ status: 400, description: '设备未运行或不支持此操作' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async clearAppData(@Param('id') id: string, @Body() dto: ClearAppDataDto) {
    await this.devicesService.clearAppData(id, dto.packageName);
    return { message: `应用 ${dto.packageName} 数据清除成功` };
  }

  // ============================================================
  // 快照管理端点 (阿里云专属)
  // ============================================================

  @Post(':id/snapshots')
  @RequirePermission('device.snapshot.create')
  @ApiOperation({
    summary: '创建设备快照',
    description: '为设备创建快照备份 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '快照创建成功，返回快照 ID' })
  @ApiResponse({ status: 400, description: '设备不支持快照功能' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createSnapshot(@Param('id') id: string, @Body() dto: CreateSnapshotDto) {
    const snapshotId = await this.devicesService.createSnapshot(id, dto.name, dto.description);
    return { snapshotId, message: '快照创建成功' };
  }

  @Post(':id/snapshots/restore')
  @RequirePermission('device.snapshot.restore')
  @ApiOperation({
    summary: '恢复设备快照',
    description: '从快照恢复设备 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '快照恢复成功，设备将重启' })
  @ApiResponse({ status: 400, description: '设备不支持快照功能' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async restoreSnapshot(@Param('id') id: string, @Body() dto: RestoreSnapshotDto) {
    await this.devicesService.restoreSnapshot(id, dto.snapshotId);
    return { message: '快照恢复成功，设备将重启' };
  }

  @Get(':id/snapshots')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备快照列表',
    description: '获取设备的所有快照 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '快照列表获取成功' })
  @ApiResponse({ status: 400, description: '设备不支持快照功能' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async listSnapshots(@Param('id') id: string) {
    return this.devicesService.listSnapshots(id);
  }

  @Delete(':id/snapshots/:snapshotId')
  @RequirePermission('device.snapshot.delete')
  @ApiOperation({
    summary: '删除设备快照',
    description: '删除指定的设备快照 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiParam({ name: 'snapshotId', description: '快照 ID' })
  @ApiResponse({ status: 200, description: '快照删除成功' })
  @ApiResponse({ status: 400, description: '设备不支持快照功能' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deleteSnapshot(@Param('id') id: string, @Param('snapshotId') snapshotId: string) {
    await this.devicesService.deleteSnapshot(id, snapshotId);
    return { message: '快照删除成功' };
  }

  // ==================== 设备连接和远程控制 ====================

  @Get(':id/connection')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备连接信息',
    description: '获取设备的 ADB 连接信息，包括主机、端口和连接命令',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '连接信息获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getConnection(@Param('id') id: string) {
    const device = await this.devicesService.findOne(id);

    if (!device) {
      throw new Error('设备不存在');
    }

    // 获取设备的ADB连接信息
    return {
      deviceId: device.id,
      deviceName: device.name,
      host: device.adbHost || 'localhost',
      adbPort: device.adbPort,
      status: device.status,
      // ADB连接命令
      adbCommand: `adb connect ${device.adbHost || 'localhost'}:${device.adbPort}`,
      // 容器信息
      containerId: device.containerId,
      // 连接状态
      isOnline: device.status === 'running',
      message: '连接信息获取成功',
    };
  }

  @Post(':id/webrtc/token')
  @RequirePermission('device.control')
  @ApiOperation({
    summary: '获取 WebRTC token',
    description: '生成用于 WebRTC 屏幕共享和远程控制的授权 token',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: 'Token 生成成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getWebRTCToken(@Param('id') id: string, @Req() req: any) {
    const device = await this.devicesService.findOne(id);

    if (!device) {
      throw new Error('设备不存在');
    }

    // 生成 WebRTC token (这里简化实现，实际应该使用JWT或其他安全方案)
    const crypto = require('crypto');
    const token = crypto
      .createHash('sha256')
      .update(`${device.id}-${req.user.id}-${Date.now()}`)
      .digest('hex');

    // Token 有效期 1 小时
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    return {
      deviceId: device.id,
      deviceName: device.name,
      token,
      expiresAt,
      // WebRTC 服务器配置（应该从环境变量读取）
      signaling: {
        url: process.env.WEBRTC_SIGNALING_URL || 'ws://localhost:8088',
        protocol: 'wss',
      },
      // STUN/TURN 服务器配置
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
      message: 'WebRTC token 生成成功',
    };
  }

  // ==================== SMS 虚拟号码管理 ====================

  @Post(':id/request-sms')
  @RequirePermission('device.sms.request')
  @ApiOperation({
    summary: '为设备请求虚拟 SMS 号码',
    description: '为指定设备请求一个虚拟手机号码，用于接收短信验证码。号码由 SMS Receive Service 管理。',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: RequestSmsDto })
  @ApiResponse({ status: 200, description: '虚拟号码请求成功', type: Object })
  @ApiResponse({ status: 400, description: '请求参数错误或设备状态不允许' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async requestSms(@Param('id') deviceId: string, @Body() dto: RequestSmsDto): Promise<SmsNumberResponse> {
    return this.devicesService.requestSms(deviceId, dto);
  }

  @Get(':id/sms-number')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备的虚拟 SMS 号码信息',
    description: '获取设备当前分配的虚拟手机号码信息（如果有）',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '虚拟号码信息获取成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未分配虚拟号码' })
  async getSmsNumber(@Param('id') deviceId: string): Promise<SmsNumberResponse | null> {
    const device = await this.devicesService.findOne(deviceId);
    const smsNumberRequest = device.metadata?.smsNumberRequest;
    return smsNumberRequest ? (smsNumberRequest as SmsNumberResponse) : null;
  }

  @Delete(':id/sms-number')
  @RequirePermission('device.sms.cancel')
  @ApiOperation({
    summary: '取消设备的虚拟 SMS 号码',
    description: '取消设备当前分配的虚拟手机号码（主动释放或使用完毕）',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: CancelSmsDto, required: false })
  @ApiResponse({ status: 200, description: '虚拟号码取消成功' })
  @ApiResponse({ status: 404, description: '设备不存在或未分配虚拟号码' })
  async cancelSms(@Param('id') deviceId: string, @Body() dto?: CancelSmsDto) {
    return this.devicesService.cancelSms(deviceId, dto);
  }

  @Get(':id/sms-messages')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备收到的 SMS 消息历史',
    description: '获取设备收到的所有短信验证码消息历史记录',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiResponse({ status: 200, description: 'SMS 消息历史获取成功', type: [Object] })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async getSmsMessages(@Param('id') deviceId: string): Promise<SmsMessageDto[]> {
    return this.devicesService.getSmsMessages(deviceId);
  }
}
