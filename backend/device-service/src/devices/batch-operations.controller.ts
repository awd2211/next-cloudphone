import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { BatchOperationsService } from "./batch-operations.service";
import {
  BatchCreateDeviceDto,
  BatchOperationDto,
  BatchOperationResult,
  DeviceGroupDto,
} from "./dto/batch-operation.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Batch Operations - 批量操作")
@Controller("devices/batch")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchOperationsController {
  constructor(
    private readonly batchOperationsService: BatchOperationsService,
  ) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "批量创建设备",
    description: "一次性创建多个相同配置的设备，支持自定义前缀和分组",
  })
  @ApiResponse({
    status: 201,
    description: "批量创建成功",
    type: BatchOperationResult,
  })
  async batchCreate(
    @Body() batchCreateDto: BatchCreateDeviceDto,
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchCreate(batchCreateDto);
  }

  @Post("operate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量操作设备",
    description: "对多个设备执行相同操作（启动/停止/重启/删除/执行命令等）",
  })
  @ApiResponse({
    status: 200,
    description: "批量操作成功",
    type: BatchOperationResult,
  })
  async batchOperate(
    @Body() batchOperationDto: BatchOperationDto,
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate(batchOperationDto);
  }

  @Post("start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量启动设备",
    description: "启动指定的多个设备",
  })
  async batchStart(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "start" as any,
      ...body,
    });
  }

  @Post("stop")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量停止设备",
    description: "停止指定的多个设备",
  })
  async batchStop(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "stop" as any,
      ...body,
    });
  }

  @Post("restart")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量重启设备",
    description: "重启指定的多个设备",
  })
  async batchRestart(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "restart" as any,
      ...body,
    });
  }

  @Post("delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量删除设备",
    description: "删除指定的多个设备（危险操作）",
  })
  async batchDelete(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "delete" as any,
      ...body,
    });
  }

  @Post("execute")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量执行命令",
    description: "在多个设备上执行相同的 Shell 命令",
  })
  async batchExecute(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      command: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "execute_command" as any,
      ...body,
    });
  }

  @Post("install")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量安装应用",
    description: "在多个设备上安装相同的 APK",
  })
  async batchInstall(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      apkPath: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "install_app" as any,
      ...body,
    });
  }

  @Post("uninstall")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量卸载应用",
    description: "在多个设备上卸载指定的应用",
  })
  async batchUninstall(
    @Body()
    body: {
      deviceIds?: string[];
      groupName?: string;
      userId?: string;
      packageName: string;
      maxConcurrency?: number;
    },
  ): Promise<BatchOperationResult> {
    return await this.batchOperationsService.batchOperate({
      operation: "uninstall_app" as any,
      ...body,
    });
  }

  @Get("groups/statistics")
  @ApiOperation({
    summary: "获取分组统计",
    description: "获取所有设备分组的统计信息",
  })
  async getGroupStatistics(): Promise<Record<string, any>> {
    return await this.batchOperationsService.getGroupStatistics();
  }

  @Get("groups/:groupName/devices")
  @ApiOperation({
    summary: "获取分组设备列表",
    description: "获取指定分组下的所有设备",
  })
  async getDevicesByGroup(@Query("groupName") groupName: string) {
    return await this.batchOperationsService.getDevicesByGroup(groupName);
  }

  @Patch("groups/update")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "更新设备分组",
    description: "将多个设备移动到指定分组",
  })
  async updateDeviceGroup(
    @Body() body: { deviceIds: string[]; groupName: string },
  ): Promise<{ message: string }> {
    await this.batchOperationsService.updateDeviceGroup(
      body.deviceIds,
      body.groupName,
    );
    return {
      message: `Successfully updated ${body.deviceIds.length} devices to group "${body.groupName}"`,
    };
  }

  @Post("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量获取设备状态",
    description: "快速获取多个设备的当前状态",
  })
  async batchGetStatus(
    @Body() body: { deviceIds: string[] },
  ): Promise<Record<string, any>> {
    return await this.batchOperationsService.batchGetStatus(body.deviceIds);
  }

  @Post("execute-collect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "批量执行命令并收集结果",
    description: "在多个设备上执行命令并返回所有设备的执行结果",
  })
  async batchExecuteAndCollect(
    @Body()
    body: {
      deviceIds: string[];
      command: string;
      maxConcurrency?: number;
    },
  ): Promise<Record<string, string>> {
    return await this.batchOperationsService.batchExecuteAndCollect(
      body.deviceIds,
      body.command,
      body.maxConcurrency,
    );
  }
}
