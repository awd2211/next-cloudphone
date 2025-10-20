import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import axios from 'axios';
import { Application, AppStatus } from '../entities/application.entity';
import { DeviceApplication, InstallStatus } from '../entities/device-application.entity';
import { MinioService } from '../minio/minio.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(Application)
    private appsRepository: Repository<Application>,
    @InjectRepository(DeviceApplication)
    private deviceAppsRepository: Repository<DeviceApplication>,
    private minioService: MinioService,
    private configService: ConfigService,
  ) {}

  async uploadApp(
    file: Express.Multer.File,
    createAppDto: CreateAppDto,
  ): Promise<Application> {
    // 解析 APK 文件
    const apkInfo = await this.parseApk(file.path);

    // 检查应用是否已存在
    const existing = await this.appsRepository.findOne({
      where: { packageName: apkInfo.packageName },
    });

    if (existing) {
      // 清理临时文件
      fs.unlinkSync(file.path);
      throw new BadRequestException(`应用 ${apkInfo.packageName} 已存在`);
    }

    // 生成对象键
    const objectKey = `apps/${apkInfo.packageName}/${apkInfo.versionName}_${Date.now()}.apk`;

    // 上传到 MinIO
    const uploadResult = await this.minioService.uploadFile(
      file.path,
      objectKey,
      {
        packageName: apkInfo.packageName,
        versionName: apkInfo.versionName,
      },
    );

    // 生成下载 URL
    const downloadUrl = await this.minioService.getFileUrl(objectKey);

    // 创建应用记录
    const app = this.appsRepository.create({
      ...createAppDto,
      name: createAppDto.name || apkInfo.appName,
      packageName: apkInfo.packageName,
      versionName: apkInfo.versionName,
      versionCode: apkInfo.versionCode,
      size: file.size,
      minSdkVersion: apkInfo.minSdkVersion,
      targetSdkVersion: apkInfo.targetSdkVersion,
      permissions: apkInfo.permissions,
      bucketName: this.minioService.getBucketName(),
      objectKey: objectKey,
      downloadUrl: downloadUrl,
      status: AppStatus.AVAILABLE,
    });

    // 清理临时文件
    fs.unlinkSync(file.path);

    return await this.appsRepository.save(app);
  }

  private async parseApk(filePath: string): Promise<any> {
    try {
      const zip = new AdmZip(filePath);
      const manifestEntry = zip.getEntry('AndroidManifest.xml');

      if (!manifestEntry) {
        throw new BadRequestException('无效的 APK 文件：找不到 AndroidManifest.xml');
      }

      // 简化的 APK 解析（实际生产环境应使用专业的 APK 解析库）
      // 这里返回模拟数据
      const packageName = `com.cloudphone.app${Date.now()}`;

      return {
        packageName: packageName,
        appName: path.basename(filePath, '.apk'),
        versionName: '1.0.0',
        versionCode: 1,
        minSdkVersion: 21,
        targetSdkVersion: 33,
        permissions: [
          'android.permission.INTERNET',
          'android.permission.ACCESS_NETWORK_STATE',
        ],
      };
    } catch (error) {
      throw new BadRequestException(`APK 解析失败: ${error.message}`);
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    tenantId?: string,
    category?: string,
  ): Promise<{ data: Application[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: any = { status: AppStatus.AVAILABLE };
    if (tenantId) where.tenantId = tenantId;
    if (category) where.category = category;

    const [data, total] = await this.appsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Application> {
    const app = await this.appsRepository.findOne({ where: { id } });

    if (!app) {
      throw new NotFoundException(`应用 #${id} 不存在`);
    }

    // 刷新下载 URL
    if (app.objectKey) {
      app.downloadUrl = await this.minioService.getFileUrl(app.objectKey);
    }

    return app;
  }

  async update(id: string, updateAppDto: UpdateAppDto): Promise<Application> {
    const app = await this.findOne(id);

    Object.assign(app, updateAppDto);
    return await this.appsRepository.save(app);
  }

  async remove(id: string): Promise<void> {
    const app = await this.findOne(id);

    // 删除 MinIO 中的文件
    if (app.objectKey) {
      await this.minioService.deleteFile(app.objectKey);
    }

    // 软删除
    app.status = AppStatus.DELETED;
    await this.appsRepository.save(app);
  }

  async installToDevice(applicationId: string, deviceId: string): Promise<DeviceApplication> {
    const app = await this.findOne(applicationId);

    // 检查是否已安装
    const existing = await this.deviceAppsRepository.findOne({
      where: {
        deviceId,
        applicationId,
        status: InstallStatus.INSTALLED,
      },
    });

    if (existing) {
      throw new BadRequestException('应用已安装在该设备上');
    }

    // 创建安装记录
    const deviceApp = this.deviceAppsRepository.create({
      deviceId,
      applicationId,
      status: InstallStatus.INSTALLING,
    });

    const saved = await this.deviceAppsRepository.save(deviceApp);

    // 异步安装应用
    this.performInstall(saved.id, app, deviceId).catch((error) => {
      console.error(`Failed to install app ${app.id} on device ${deviceId}:`, error);
      this.updateInstallStatus(saved.id, InstallStatus.FAILED, error.message);
    });

    return saved;
  }

  private async performInstall(
    deviceAppId: string,
    app: Application,
    deviceId: string,
  ): Promise<void> {
    try {
      // 调用设备服务安装应用（通过 HTTP）
      const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:3002';

      // 这里应该调用设备服务的 ADB 安装接口
      // await axios.post(`${deviceServiceUrl}/devices/${deviceId}/install`, {
      //   downloadUrl: app.downloadUrl,
      //   packageName: app.packageName,
      // });

      // 模拟安装过程
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 更新安装状态
      await this.updateInstallStatus(deviceAppId, InstallStatus.INSTALLED);

      // 增加安装次数
      await this.appsRepository.increment({ id: app.id }, 'installCount', 1);
    } catch (error) {
      throw error;
    }
  }

  async uninstallFromDevice(applicationId: string, deviceId: string): Promise<void> {
    const deviceApp = await this.deviceAppsRepository.findOne({
      where: {
        deviceId,
        applicationId,
        status: InstallStatus.INSTALLED,
      },
    });

    if (!deviceApp) {
      throw new NotFoundException('应用未安装在该设备上');
    }

    deviceApp.status = InstallStatus.UNINSTALLING;
    await this.deviceAppsRepository.save(deviceApp);

    // 异步卸载
    this.performUninstall(deviceApp.id, deviceId, applicationId).catch((error) => {
      console.error(`Failed to uninstall app ${applicationId} from device ${deviceId}:`, error);
    });
  }

  private async performUninstall(
    deviceAppId: string,
    deviceId: string,
    applicationId: string,
  ): Promise<void> {
    try {
      const app = await this.findOne(applicationId);

      // 调用设备服务卸载应用
      // const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL');
      // await axios.post(`${deviceServiceUrl}/devices/${deviceId}/uninstall`, {
      //   packageName: app.packageName,
      // });

      // 模拟卸载过程
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await this.updateInstallStatus(deviceAppId, InstallStatus.UNINSTALLED);
    } catch (error) {
      throw error;
    }
  }

  private async updateInstallStatus(
    deviceAppId: string,
    status: InstallStatus,
    errorMessage?: string,
  ): Promise<void> {
    const update: any = { status };

    if (status === InstallStatus.INSTALLED) {
      update.installedAt = new Date();
    } else if (status === InstallStatus.UNINSTALLED) {
      update.uninstalledAt = new Date();
    } else if (status === InstallStatus.FAILED) {
      update.errorMessage = errorMessage;
    }

    await this.deviceAppsRepository.update(deviceAppId, update);
  }

  async getDeviceApps(deviceId: string): Promise<DeviceApplication[]> {
    return await this.deviceAppsRepository.find({
      where: { deviceId, status: InstallStatus.INSTALLED },
    });
  }

  async getAppDevices(applicationId: string): Promise<DeviceApplication[]> {
    return await this.deviceAppsRepository.find({
      where: { applicationId, status: InstallStatus.INSTALLED },
    });
  }
}
