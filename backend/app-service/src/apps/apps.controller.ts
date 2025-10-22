import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { InstallAppDto, UninstallAppDto } from './dto/install-app.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

// 确保上传目录存在
const uploadDir = '/tmp/apk-uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('apps')
@ApiBearerAuth()
@Controller('apps')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post('upload')
  @RequirePermission('app.create')
  @ApiOperation({ summary: '上传 APK', description: '上传 Android 应用程序包文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'APK 文件上传',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'APK 文件（最大 200MB）',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @ApiResponse({ status: 400, description: '文件格式错误或文件过大' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
      },
      fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.apk') {
          cb(new BadRequestException('只允许上传 APK 文件'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadApp(
    @UploadedFile() file: Express.Multer.File,
    @Body() createAppDto: CreateAppDto,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的 APK 文件');
    }

    const app = await this.appsService.uploadApp(file, createAppDto);
    return {
      success: true,
      data: app,
      message: 'APK 上传成功',
    };
  }

  @Get()
  @RequirePermission('app.read')
  @ApiOperation({ summary: '获取应用列表', description: '分页获取应用列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiQuery({ name: 'category', required: false, description: '应用分类' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
  ) {
    const result = await this.appsService.findAll(
      parseInt(page),
      parseInt(limit),
      tenantId,
      category,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  @RequirePermission('app.read')
  @ApiOperation({ summary: '获取应用详情', description: '根据 ID 获取应用详细信息' })
  @ApiParam({ name: 'id', description: '应用 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '应用不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    const app = await this.appsService.findOne(id);
    return {
      success: true,
      data: app,
    };
  }

  @Get(':id/devices')
  @RequirePermission('app.read')
  @ApiOperation({ summary: '获取应用安装设备', description: '获取已安装该应用的设备列表' })
  @ApiParam({ name: 'id', description: '应用 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAppDevices(@Param('id') id: string) {
    const devices = await this.appsService.getAppDevices(id);
    return {
      success: true,
      data: devices,
    };
  }

  @Patch(':id')
  @RequirePermission('app.update')
  @ApiOperation({ summary: '更新应用', description: '更新应用信息' })
  @ApiParam({ name: 'id', description: '应用 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '应用不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateAppDto: UpdateAppDto) {
    const app = await this.appsService.update(id, updateAppDto);
    return {
      success: true,
      data: app,
      message: '应用更新成功',
    };
  }

  @Delete(':id')
  @RequirePermission('app.delete')
  @ApiOperation({ summary: '删除应用', description: '删除应用及相关文件' })
  @ApiParam({ name: 'id', description: '应用 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '应用不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string) {
    await this.appsService.remove(id);
    return {
      success: true,
      message: '应用删除成功',
    };
  }

  @Post('install')
  @RequirePermission('app.create')
  @ApiOperation({ summary: '安装应用', description: '将应用安装到指定设备' })
  @ApiResponse({ status: 201, description: '安装任务已创建' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async install(@Body() installAppDto: InstallAppDto) {
    const results = [];

    for (const deviceId of installAppDto.deviceIds) {
      try {
        const result = await this.appsService.installToDevice(
          installAppDto.applicationId,
          deviceId,
        );
        results.push({
          deviceId,
          success: true,
          data: result,
        });
      } catch (error) {
        results.push({
          deviceId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      data: results,
      message: '应用安装任务已创建',
    };
  }

  @Post('uninstall')
  @RequirePermission('app.delete')
  @ApiOperation({ summary: '卸载应用', description: '从指定设备卸载应用' })
  @ApiResponse({ status: 200, description: '卸载任务已创建' })
  @ApiResponse({ status: 404, description: '应用未安装' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async uninstall(@Body() uninstallAppDto: UninstallAppDto) {
    const results = [];

    for (const deviceId of uninstallAppDto.deviceIds) {
      try {
        await this.appsService.uninstallFromDevice(
          uninstallAppDto.applicationId,
          deviceId,
        );
        results.push({
          deviceId,
          success: true,
        });
      } catch (error) {
        results.push({
          deviceId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      data: results,
      message: '应用卸载任务已创建',
    };
  }

  @Get('devices/:deviceId/apps')
  @RequirePermission('app.read')
  @ApiOperation({ summary: '获取设备应用', description: '获取指定设备上已安装的应用列表' })
  @ApiParam({ name: 'deviceId', description: '设备 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getDeviceApps(@Param('deviceId') deviceId: string) {
    const apps = await this.appsService.getDeviceApps(deviceId);
    return {
      success: true,
      data: apps,
    };
  }
}
