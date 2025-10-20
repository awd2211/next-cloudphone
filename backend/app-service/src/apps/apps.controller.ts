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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { InstallAppDto, UninstallAppDto } from './dto/install-app.dto';

// 确保上传目录存在
const uploadDir = '/tmp/apk-uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post('upload')
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
  async findOne(@Param('id') id: string) {
    const app = await this.appsService.findOne(id);
    return {
      success: true,
      data: app,
    };
  }

  @Get(':id/devices')
  async getAppDevices(@Param('id') id: string) {
    const devices = await this.appsService.getAppDevices(id);
    return {
      success: true,
      data: devices,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAppDto: UpdateAppDto) {
    const app = await this.appsService.update(id, updateAppDto);
    return {
      success: true,
      data: app,
      message: '应用更新成功',
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.appsService.remove(id);
    return {
      success: true,
      message: '应用删除成功',
    };
  }

  @Post('install')
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
  async getDeviceApps(@Param('deviceId') deviceId: string) {
    const apps = await this.appsService.getDeviceApps(deviceId);
    return {
      success: true,
      data: apps,
    };
  }
}
