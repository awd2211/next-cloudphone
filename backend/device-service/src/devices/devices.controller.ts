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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { Response } from "express";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { DeviceStatus } from "../entities/device.entity";
import { DeviceMetrics } from "../providers/provider.types";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/permissions.decorator";
import { CursorPaginationDto, DataScopeGuard, DataScope, DataScopeType } from "@cloudphone/shared";
import {
  ShellCommandDto,
  PushFileDto,
  PullFileDto,
  InstallApkDto,
  UninstallApkDto,
} from "../adb/dto/shell-command.dto";
import { QuotaGuard, QuotaCheck, QuotaCheckType } from "../quota/quota.guard";

@ApiTags("devices")
@ApiBearerAuth()
@Controller("devices")
@UseGuards(AuthGuard("jwt"), PermissionsGuard, DataScopeGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermission("device.create")
  @UseGuards(QuotaGuard)
  @QuotaCheck(QuotaCheckType.DEVICE_CREATION)
  @ApiOperation({
    summary: "创建设备",
    description: "创建新的云手机设备，使用 Saga 模式保证原子性（需检查配额）",
  })
  @ApiResponse({ status: 201, description: "设备创建 Saga 已启动" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 403, description: "权限不足或配额超限" })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    const { sagaId, device } = await this.devicesService.create(createDeviceDto);
    return {
      success: true,
      data: {
        sagaId,
        device,
      },
      message: "设备创建 Saga 已启动，请稍候...",
    };
  }

  @Get("stats")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备统计信息",
    description: "获取所有设备的状态统计",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getOverallStats() {
    const result = await this.devicesService.findAll(1, 9999);
    const devices = result.data;

    const stats = {
      total: devices.length,
      idle: devices.filter((d) => d.status === DeviceStatus.IDLE).length,
      running: devices.filter((d) => d.status === DeviceStatus.RUNNING).length,
      stopped: devices.filter((d) => d.status === DeviceStatus.STOPPED).length,
      error: devices.filter((d) => d.status === DeviceStatus.ERROR).length,
    };

    return {
      success: true,
      data: stats,
    };
  }

  @Get("available")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取可用设备列表",
    description: "获取所有状态为IDLE的可用设备",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getAvailableDevices() {
    const result = await this.devicesService.findAll(1, 9999, undefined, undefined, DeviceStatus.IDLE);
    return {
      success: true,
      data: result.data,
      total: result.total,
    };
  }

  @Get()
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备列表",
    description: "分页获取设备列表，支持多种筛选条件",
  })
  @ApiQuery({ name: "page", required: false, description: "页码", example: 1 })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "每页数量",
    example: 10,
  })
  @ApiQuery({ name: "userId", required: false, description: "用户 ID" })
  @ApiQuery({ name: "tenantId", required: false, description: "租户 ID" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: DeviceStatus,
    description: "设备状态",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async findAll(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("userId") userId?: string,
    @Query("tenantId") tenantId?: string,
    @Query("status") status?: DeviceStatus,
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

  @Get("cursor")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备列表 (游标分页)",
    description:
      "使用游标分页获取设备列表，性能优化版本。适用于大数据集的高效分页查询（O(1)复杂度）",
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    description: "游标（base64编码的时间戳），获取下一页时传入上一页的 nextCursor",
    example: "MTY5ODc2NTQzMjAwMA==",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "每页数量 (1-100)",
    example: 20,
  })
  @ApiQuery({ name: "userId", required: false, description: "用户 ID" })
  @ApiQuery({ name: "tenantId", required: false, description: "租户 ID" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: DeviceStatus,
    description: "设备状态",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    schema: {
      example: {
        success: true,
        data: [],
        nextCursor: "MTY5ODc2NTQzMjAwMA==",
        hasMore: true,
        count: 20,
      },
    },
  })
  @ApiResponse({ status: 403, description: "权限不足" })
  async findAllCursor(
    @Query() paginationDto: CursorPaginationDto,
    @Query("userId") userId?: string,
    @Query("tenantId") tenantId?: string,
    @Query("status") status?: DeviceStatus,
  ) {
    const result = await this.devicesService.findAllCursor(
      paginationDto,
      userId,
      tenantId,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(":id")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备详情",
    description: "根据 ID 获取设备详细信息",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "设备不存在" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async findOne(@Param("id") id: string) {
    const device = await this.devicesService.findOne(id);
    return {
      success: true,
      data: device,
    };
  }

  @Get(":id/stats")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备统计",
    description: "获取设备的资源使用统计信息",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "设备不存在" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getStats(@Param("id") id: string) {
    const stats = await this.devicesService.getStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  @Patch(":id")
  @RequirePermission("device.update")
  @ApiOperation({ summary: "更新设备", description: "更新设备配置信息" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "设备不存在" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async update(
    @Param("id") id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    const device = await this.devicesService.update(id, updateDeviceDto);
    return {
      success: true,
      data: device,
      message: "设备更新成功",
    };
  }

  @Post(":id/start")
  @RequirePermission("device.update")
  @ApiOperation({ summary: "启动设备", description: "启动已停止的设备容器" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "启动成功" })
  @ApiResponse({ status: 400, description: "设备状态不允许此操作" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async start(@Param("id") id: string) {
    const device = await this.devicesService.start(id);
    return {
      success: true,
      data: device,
      message: "设备启动成功",
    };
  }

  @Post(":id/stop")
  @RequirePermission("device.update")
  @ApiOperation({ summary: "停止设备", description: "停止正在运行的设备容器" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "停止成功" })
  @ApiResponse({ status: 400, description: "设备状态不允许此操作" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async stop(@Param("id") id: string) {
    const device = await this.devicesService.stop(id);
    return {
      success: true,
      data: device,
      message: "设备停止成功",
    };
  }

  @Post(":id/restart")
  @RequirePermission("device.update")
  @ApiOperation({ summary: "重启设备", description: "重启设备容器" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "重启成功" })
  @ApiResponse({ status: 400, description: "设备状态不允许此操作" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async restart(@Param("id") id: string) {
    const device = await this.devicesService.restart(id);
    return {
      success: true,
      data: device,
      message: "设备重启成功",
    };
  }

  /**
   * reboot别名 - 与前端保持一致
   */
  @Post(":id/reboot")
  @RequirePermission("device.update")
  @ApiOperation({ summary: "重启设备 (别名)", description: "重启设备容器 - restart的别名" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "重启成功" })
  @ApiResponse({ status: 400, description: "设备状态不允许此操作" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async reboot(@Param("id") id: string) {
    // 直接调用restart方法
    return this.restart(id);
  }

  @Post(":id/heartbeat")
  @RequirePermission("device.update")
  @ApiOperation({
    summary: "更新心跳",
    description: "更新设备心跳和资源使用情况",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "心跳更新成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async heartbeat(@Param("id") id: string, @Body() stats: DeviceMetrics) {
    await this.devicesService.updateHeartbeat(id, stats);
    return {
      success: true,
      message: "心跳更新成功",
    };
  }

  @Delete(":id")
  @RequirePermission("device.delete")
  @ApiOperation({ summary: "删除设备", description: "删除设备并清理相关容器" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "设备不存在" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async remove(@Param("id") id: string) {
    await this.devicesService.remove(id);
    return {
      success: true,
      message: "设备删除成功",
    };
  }

  // ADB 相关接口

  @Post(":id/shell")
  @RequirePermission("device.control")
  @ApiOperation({
    summary: "执行 Shell 命令",
    description: "在设备上执行 ADB shell 命令",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiBody({ type: ShellCommandDto })
  @ApiResponse({ status: 200, description: "命令执行成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async executeShell(@Param("id") id: string, @Body() dto: ShellCommandDto) {
    const output = await this.devicesService.executeShellCommand(
      id,
      dto.command,
      dto.timeout,
    );
    return {
      success: true,
      data: { output },
      message: "命令执行成功",
    };
  }

  @Post(":id/screenshot")
  @RequirePermission("device.control")
  @ApiOperation({ summary: "设备截图", description: "获取设备当前屏幕截图" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "截图成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async takeScreenshot(@Param("id") id: string, @Res() res: Response) {
    const imagePath = await this.devicesService.takeScreenshot(id);
    res.sendFile(imagePath);
  }

  @Post(":id/push")
  @RequirePermission("device.control")
  @ApiOperation({ summary: "推送文件", description: "从本地推送文件到设备" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        targetPath: { type: "string", example: "/sdcard/Download/file.txt" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  @ApiResponse({ status: 200, description: "推送成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async pushFile(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PushFileDto,
  ) {
    await this.devicesService.pushFile(id, file.path, dto.targetPath);
    return {
      success: true,
      message: "文件推送成功",
    };
  }

  @Post(":id/pull")
  @RequirePermission("device.control")
  @ApiOperation({ summary: "拉取文件", description: "从设备拉取文件到本地" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiBody({ type: PullFileDto })
  @ApiResponse({ status: 200, description: "拉取成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async pullFile(
    @Param("id") id: string,
    @Body() dto: PullFileDto,
    @Res() res: Response,
  ) {
    const localPath = `/tmp/${id}_${Date.now()}_${dto.sourcePath.split("/").pop()}`;
    await this.devicesService.pullFile(id, dto.sourcePath, localPath);
    res.download(localPath);
  }

  @Post(":id/install")
  @RequirePermission("device.control")
  @ApiOperation({ summary: "安装应用", description: "在设备上安装 APK 应用" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiBody({ type: InstallApkDto })
  @ApiResponse({ status: 200, description: "安装成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async installApk(@Param("id") id: string, @Body() dto: InstallApkDto) {
    await this.devicesService.installApk(id, dto.apkPath, dto.reinstall);
    return {
      success: true,
      message: "APK 安装成功",
    };
  }

  @Post(":id/uninstall")
  @RequirePermission("device.control")
  @ApiOperation({ summary: "卸载应用", description: "从设备卸载应用" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiBody({ type: UninstallApkDto })
  @ApiResponse({ status: 200, description: "卸载成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async uninstallApp(@Param("id") id: string, @Body() dto: UninstallApkDto) {
    await this.devicesService.uninstallApp(id, dto.packageName);
    return {
      success: true,
      message: "应用卸载成功",
    };
  }

  @Get(":id/packages")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取已安装应用",
    description: "获取设备上已安装的应用列表",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getInstalledPackages(@Param("id") id: string) {
    const packages = await this.devicesService.getInstalledPackages(id);
    return {
      success: true,
      data: { packages, count: packages.length },
    };
  }

  @Get(":id/logcat")
  @RequirePermission("device.read")
  @ApiOperation({ summary: "读取日志", description: "读取设备 logcat 日志" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiQuery({ name: "filter", required: false, description: "日志过滤关键词" })
  @ApiQuery({
    name: "lines",
    required: false,
    description: "读取行数",
    example: 100,
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async readLogcat(
    @Param("id") id: string,
    @Query("filter") filter?: string,
    @Query("lines") lines?: string,
  ) {
    const logs = await this.devicesService.readLogcat(
      id,
      filter,
      lines ? parseInt(lines) : undefined,
    );
    return {
      success: true,
      data: { logs },
    };
  }

  @Post(":id/logcat/clear")
  @RequirePermission("device.control")
  @ApiOperation({ summary: "清空日志", description: "清空设备 logcat 日志" })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "清空成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async clearLogcat(@Param("id") id: string) {
    await this.devicesService.clearLogcat(id);
    return {
      success: true,
      message: "日志清空成功",
    };
  }

  @Get(":id/properties")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备属性",
    description: "获取设备的系统属性信息",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getDeviceProperties(@Param("id") id: string) {
    const properties = await this.devicesService.getDeviceProperties(id);
    return {
      success: true,
      data: properties,
    };
  }

  @Get(":id/stream-info")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备流信息",
    description: "获取设备屏幕流的连接信息（供 Media Service 使用）",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "设备不存在" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getStreamInfo(@Param("id") id: string) {
    const streamInfo = await this.devicesService.getStreamInfo(id);
    return {
      success: true,
      data: streamInfo,
    };
  }

  @Get(":id/screenshot")
  @RequirePermission("device.read")
  @ApiOperation({
    summary: "获取设备截图",
    description: "获取设备当前屏幕截图（PNG 格式）",
  })
  @ApiParam({ name: "id", description: "设备 ID" })
  @ApiResponse({
    status: 200,
    description: "截图获取成功",
    content: { "image/png": {} },
  })
  @ApiResponse({ status: 404, description: "设备不存在或未连接" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async getScreenshot(@Param("id") id: string, @Res() res: Response) {
    const screenshot = await this.devicesService.getScreenshot(id);
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="device-${id}-screenshot.png"`,
    );
    res.send(screenshot);
  }

  /**
   * ========== 批量操作接口 ==========
   */

  @Post("batch/start")
  @RequirePermission("device.update")
  @ApiOperation({
    summary: "批量启动设备",
    description: "批量启动多个设备",
  })
  @ApiResponse({ status: 200, description: "批量启动成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async batchStart(@Body("ids") ids: string[]) {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: "请提供要启动的设备ID列表",
      };
    }

    const results = await Promise.allSettled(
      ids.map((id) => this.devicesService.start(id)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: true,
      message: `批量启动完成：成功 ${succeeded} 个，失败 ${failed} 个`,
      data: { succeeded, failed, total: ids.length },
    };
  }

  @Post("batch/stop")
  @RequirePermission("device.update")
  @ApiOperation({
    summary: "批量停止设备",
    description: "批量停止多个设备",
  })
  @ApiResponse({ status: 200, description: "批量停止成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async batchStop(@Body("ids") ids: string[]) {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: "请提供要停止的设备ID列表",
      };
    }

    const results = await Promise.allSettled(
      ids.map((id) => this.devicesService.stop(id)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: true,
      message: `批量停止完成：成功 ${succeeded} 个，失败 ${failed} 个`,
      data: { succeeded, failed, total: ids.length },
    };
  }

  @Post("batch/reboot")
  @RequirePermission("device.update")
  @ApiOperation({
    summary: "批量重启设备",
    description: "批量重启多个设备",
  })
  @ApiResponse({ status: 200, description: "批量重启成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async batchReboot(@Body("ids") ids: string[]) {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: "请提供要重启的设备ID列表",
      };
    }

    const results = await Promise.allSettled(
      ids.map((id) => this.devicesService.restart(id)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: true,
      message: `批量重启完成：成功 ${succeeded} 个，失败 ${failed} 个`,
      data: { succeeded, failed, total: ids.length },
    };
  }

  @Post("batch/delete")
  @RequirePermission("device.delete")
  @ApiOperation({
    summary: "批量删除设备",
    description: "批量删除多个设备",
  })
  @ApiResponse({ status: 200, description: "批量删除成功" })
  @ApiResponse({ status: 403, description: "权限不足" })
  async batchDelete(@Body("ids") ids: string[]) {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: "请提供要删除的设备ID列表",
      };
    }

    const results = await Promise.allSettled(
      ids.map((id) => this.devicesService.remove(id)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: true,
      message: `批量删除完成：成功 ${succeeded} 个，失败 ${failed} 个`,
      data: { succeeded, failed, total: ids.length },
    };
  }
}
