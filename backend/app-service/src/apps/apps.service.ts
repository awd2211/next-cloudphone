import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { Application, AppStatus } from '../entities/application.entity';
import { DeviceApplication, InstallStatus } from '../entities/device-application.entity';
import { MinioService } from '../minio/minio.service';
import { ApkParserService } from '../apk/apk-parser.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class AppsService {
  private readonly logger = new Logger(AppsService.name);

  constructor(
    @InjectRepository(Application)
    private appsRepository: Repository<Application>,
    @InjectRepository(DeviceApplication)
    private deviceAppsRepository: Repository<DeviceApplication>,
    private minioService: MinioService,
    private apkParserService: ApkParserService,
    private httpService: HttpService,
    private configService: ConfigService,
    @Optional() private eventBus: EventBusService,
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
    // 使用真实的 APK 解析服务
    return await this.apkParserService.parseApk(filePath);
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

    // 创建安装记录（状态：pending）
    const deviceApp = this.deviceAppsRepository.create({
      deviceId,
      applicationId,
      status: InstallStatus.PENDING,
    });

    const saved = await this.deviceAppsRepository.save(deviceApp);

    // 发布应用安装请求事件到 RabbitMQ
    await this.eventBus.publishAppEvent('install.requested', {
      installationId: saved.id,
      deviceId,
      appId: app.id,
      downloadUrl: app.downloadUrl,
      userId: null, // 从请求上下文获取
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `App install request published: ${app.id} for device ${deviceId}, installationId: ${saved.id}`,
    );

    return saved;
  }

  private async performInstall(
    deviceAppId: string,
    app: Application,
    deviceId: string,
  ): Promise<void> {
    try {
      // 调用设备服务安装应用（通过 HTTP）
      const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

      // 下载 APK 到临时文件
      const tempApkPath = `/tmp/apk_${app.id}_${Date.now()}.apk`;

      // 从 MinIO 下载 APK
      if (app.objectKey) {
        const fileStream = await this.minioService.getFileStream(app.objectKey);
        const writeStream = fs.createWriteStream(tempApkPath);

        await new Promise((resolve, reject) => {
          fileStream.pipe(writeStream);
          fileStream.on('end', resolve);
          fileStream.on('error', reject);
        });
      }

      // 调用设备服务的 ADB 安装接口
      const response = await firstValueFrom(
        this.httpService.post(`${deviceServiceUrl}/devices/${deviceId}/install`, {
          apkPath: tempApkPath,
          reinstall: false,
        })
      );

      // 清理临时文件
      if (fs.existsSync(tempApkPath)) {
        fs.unlinkSync(tempApkPath);
      }

      // 更新安装状态
      await this.updateInstallStatus(deviceAppId, InstallStatus.INSTALLED);

      // 增加安装次数
      await this.appsRepository.increment({ id: app.id }, 'installCount', 1);
    } catch (error) {
      // 清理临时文件
      const tempApkPath = `/tmp/apk_${app.id}_${Date.now()}.apk`;
      if (fs.existsSync(tempApkPath)) {
        fs.unlinkSync(tempApkPath);
      }
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

    const app = await this.findOne(applicationId);

    // 更新状态为卸载中
    deviceApp.status = InstallStatus.UNINSTALLING;
    await this.deviceAppsRepository.save(deviceApp);

    // 发布应用卸载请求事件
    await this.eventBus.publishAppEvent('uninstall.requested', {
      deviceId,
      appId: app.id,
      packageName: app.packageName,
      userId: null, // 从请求上下文获取
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `App uninstall request published: ${app.packageName} from device ${deviceId}`,
    );
  }

  private async performUninstall(
    deviceAppId: string,
    deviceId: string,
    applicationId: string,
  ): Promise<void> {
    try {
      const app = await this.findOne(applicationId);

      // 调用设备服务卸载应用
      const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

      const response = await firstValueFrom(
        this.httpService.post(`${deviceServiceUrl}/devices/${deviceId}/uninstall`, {
          packageName: app.packageName,
        })
      );

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
