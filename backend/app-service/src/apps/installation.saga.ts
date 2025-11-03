import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  EventBusService,
} from '@cloudphone/shared';
import { Application, AppStatus } from '../entities/application.entity';
import { DeviceApplication, InstallStatus } from '../entities/device-application.entity';
import { MinioService } from '../minio/minio.service';

/**
 * 应用安装 Saga 状态接口
 */
export interface AppInstallationSagaState {
  // 输入参数
  applicationId: string;
  deviceId: string;
  userId: string;

  // Step 1: VALIDATE_APP
  app?: Application;
  apkPath?: string;

  // Step 2: CREATE_INSTALLATION_RECORD
  installationId?: string;

  // Step 3: DOWNLOAD_APK
  tempFilePath?: string;

  // Step 4: TRANSFER_TO_DEVICE
  deviceTempPath?: string;

  // Step 5: INSTALL_APK
  installed?: boolean;
  installedAt?: Date;

  // Step 6: VERIFY_INSTALLATION
  verified?: boolean;

  // Step 7: UPDATE_DATABASE
  updated?: boolean;

  // 错误信息
  errorMessage?: string;
}

/**
 * 应用安装 Saga
 *
 * 确保应用安装流程的原子性，失败时自动回滚
 *
 * 流程步骤:
 * 1. VALIDATE_APP - 验证应用存在且可用
 * 2. CREATE_INSTALLATION_RECORD - 创建安装记录
 * 3. DOWNLOAD_APK - 从 MinIO 下载 APK
 * 4. TRANSFER_TO_DEVICE - 传输到设备
 * 5. INSTALL_APK - 执行 adb install
 * 6. VERIFY_INSTALLATION - 验证安装成功
 * 7. UPDATE_DATABASE - 更新安装记录
 * 8. CLEANUP_TEMP_FILES - 清理临时文件
 *
 * 补偿逻辑:
 * - DOWNLOAD_APK: 删除临时文件
 * - TRANSFER_TO_DEVICE: 删除设备上的临时文件
 * - INSTALL_APK: 卸载应用
 * - VERIFY_INSTALLATION: 卸载应用
 * - UPDATE_DATABASE: 删除安装记录
 */
@Injectable()
export class AppInstallationSaga {
  private readonly logger = new Logger(AppInstallationSaga.name);

  constructor(
    @InjectRepository(Application)
    private readonly appsRepository: Repository<Application>,
    @InjectRepository(DeviceApplication)
    private readonly deviceAppsRepository: Repository<DeviceApplication>,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly minioService: MinioService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * 启动应用安装 Saga
   */
  async startInstallation(
    applicationId: string,
    deviceId: string,
    userId: string
  ): Promise<{ sagaId: string; installationId?: string }> {
    this.logger.log(`Starting app installation Saga: app=${applicationId}, device=${deviceId}`);

    const initialState: AppInstallationSagaState = {
      applicationId,
      deviceId,
      userId,
    };

    const sagaDefinition = this.createSagaDefinition();
    const sagaId = await this.sagaOrchestrator.executeSaga(sagaDefinition, initialState);

    this.logger.log(`App installation Saga started: ${sagaId}`);

    return { sagaId };
  }

  /**
   * 创建 Saga 定义
   */
  private createSagaDefinition(): SagaDefinition<AppInstallationSagaState> {
    return {
      type: SagaType.APP_INSTALLATION,
      timeoutMs: 10 * 60 * 1000, // 10分钟超时
      maxRetries: 3,
      steps: [
        {
          name: 'VALIDATE_APP',
          execute: this.validateApp.bind(this),
          compensate: async () => {}, // 无需补偿
        },
        {
          name: 'CREATE_INSTALLATION_RECORD',
          execute: this.createInstallationRecord.bind(this),
          compensate: this.deleteInstallationRecord.bind(this),
        },
        {
          name: 'DOWNLOAD_APK',
          execute: this.downloadApk.bind(this),
          compensate: this.deleteTempFile.bind(this),
        },
        {
          name: 'TRANSFER_TO_DEVICE',
          execute: this.transferToDevice.bind(this),
          compensate: this.deleteDeviceTempFile.bind(this),
        },
        {
          name: 'INSTALL_APK',
          execute: this.installApk.bind(this),
          compensate: this.uninstallApk.bind(this),
        },
        {
          name: 'VERIFY_INSTALLATION',
          execute: this.verifyInstallation.bind(this),
          compensate: this.uninstallApk.bind(this),
        },
        {
          name: 'UPDATE_DATABASE',
          execute: this.updateDatabase.bind(this),
          compensate: this.revertDatabaseUpdate.bind(this),
        },
        {
          name: 'CLEANUP_TEMP_FILES',
          execute: this.cleanupTempFiles.bind(this),
          compensate: async () => {}, // 无需补偿
        },
      ],
    };
  }

  // ==================== Step 1: Validate App ====================

  /**
   * 验证应用有效性
   */
  private async validateApp(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[VALIDATE_APP] Validating app ${state.applicationId}`);

    // 查询应用
    const app = await this.appsRepository.findOne({
      where: { id: state.applicationId },
    });

    if (!app) {
      throw new NotFoundException(`Application ${state.applicationId} not found`);
    }

    if (app.status !== AppStatus.AVAILABLE) {
      throw new BadRequestException(`Application ${app.name} is not available (status: ${app.status})`);
    }

    if (!app.downloadUrl && !app.objectKey) {
      throw new BadRequestException(`Application ${app.name} has no downloadable APK`);
    }

    // 检查是否已安装
    const existing = await this.deviceAppsRepository.findOne({
      where: {
        applicationId: state.applicationId,
        deviceId: state.deviceId,
        status: InstallStatus.INSTALLED,
      },
    });

    if (existing) {
      throw new BadRequestException(`App already installed on device ${state.deviceId}`);
    }

    this.logger.log(`[VALIDATE_APP] App validated: ${app.name} (${app.packageName})`);

    return { app, apkPath: app.downloadUrl || app.objectKey };
  }

  // ==================== Step 2: Create Installation Record ====================

  /**
   * 创建安装记录
   */
  private async createInstallationRecord(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[CREATE_INSTALLATION_RECORD] Creating record for ${state.deviceId}`);

    const deviceApp = this.deviceAppsRepository.create({
      deviceId: state.deviceId,
      applicationId: state.applicationId,
      status: InstallStatus.PENDING,
    });

    const saved = await this.deviceAppsRepository.save(deviceApp);

    this.logger.log(`[CREATE_INSTALLATION_RECORD] Record created: ${saved.id}`);

    return { installationId: saved.id };
  }

  // ==================== Step 3: Download APK ====================

  /**
   * 从 MinIO 下载 APK
   */
  private async downloadApk(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[DOWNLOAD_APK] Downloading APK from ${state.apkPath}`);

    const tempFilePath = `/tmp/apk_${state.app!.id}_${Date.now()}.apk`;

    try {
      if (state.app!.objectKey) {
        // 从 MinIO 下载
        const fileStream = await this.minioService.getFileStream(state.app!.objectKey);
        const writeStream = fs.createWriteStream(tempFilePath);

        await new Promise((resolve, reject) => {
          fileStream.pipe(writeStream);
          fileStream.on('end', resolve);
          fileStream.on('error', reject);
          writeStream.on('error', reject);
        });

        this.logger.log(`[DOWNLOAD_APK] APK downloaded to ${tempFilePath}`);
      } else {
        throw new Error('No objectKey available for download');
      }

      return { tempFilePath };
    } catch (error) {
      this.logger.error(`[DOWNLOAD_APK] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Step 4: Transfer to Device ====================

  /**
   * 传输 APK 到设备
   */
  private async transferToDevice(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[TRANSFER_TO_DEVICE] Transferring to device ${state.deviceId}`);

    const deviceServiceUrl =
      this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

    const deviceTempPath = `/data/local/tmp/${path.basename(state.tempFilePath!)}`;

    try {
      // 调用 device-service 的 ADB push 接口
      await firstValueFrom(
        this.httpService.post(
          `${deviceServiceUrl}/devices/${state.deviceId}/push-file`,
          {
            localPath: state.tempFilePath,
            remotePath: deviceTempPath,
          },
          { timeout: 60000 } // 60秒超时
        )
      );

      this.logger.log(`[TRANSFER_TO_DEVICE] File transferred to ${deviceTempPath}`);

      return { deviceTempPath };
    } catch (error) {
      this.logger.error(`[TRANSFER_TO_DEVICE] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Step 5: Install APK ====================

  /**
   * 在设备上安装 APK
   */
  private async installApk(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[INSTALL_APK] Installing on device ${state.deviceId}`);

    const deviceServiceUrl =
      this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

    try {
      // 调用 device-service 的 ADB install 接口
      await firstValueFrom(
        this.httpService.post(
          `${deviceServiceUrl}/devices/${state.deviceId}/install-apk`,
          {
            apkPath: state.deviceTempPath,
            reinstall: false,
          },
          { timeout: 120000 } // 120秒超时
        )
      );

      this.logger.log(`[INSTALL_APK] APK installed successfully`);

      return {
        installed: true,
        installedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`[INSTALL_APK] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Step 6: Verify Installation ====================

  /**
   * 验证安装成功
   */
  private async verifyInstallation(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[VERIFY_INSTALLATION] Verifying installation on ${state.deviceId}`);

    const deviceServiceUrl =
      this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

    try {
      // 调用 device-service 查询已安装包列表
      const response = await firstValueFrom(
        this.httpService.get(
          `${deviceServiceUrl}/devices/${state.deviceId}/packages`,
          { timeout: 30000 }
        )
      );

      const packages: string[] = response.data.packages || [];
      const isInstalled = packages.includes(state.app!.packageName);

      if (!isInstalled) {
        throw new Error(`Package ${state.app!.packageName} not found after installation`);
      }

      this.logger.log(`[VERIFY_INSTALLATION] Installation verified`);

      return { verified: true };
    } catch (error) {
      this.logger.error(`[VERIFY_INSTALLATION] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Step 7: Update Database ====================

  /**
   * 更新数据库安装状态
   */
  private async updateDatabase(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[UPDATE_DATABASE] Updating installation record ${state.installationId}`);

    try {
      // 更新安装记录
      await this.deviceAppsRepository.update(state.installationId!, {
        status: InstallStatus.INSTALLED,
        installedAt: state.installedAt,
      });

      // 增加应用安装次数
      await this.appsRepository.increment({ id: state.applicationId }, 'installCount', 1);

      // 发布安装成功事件
      await this.eventBus.publishAppEvent('installed', {
        installationId: state.installationId,
        applicationId: state.applicationId,
        deviceId: state.deviceId,
        userId: state.userId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`[UPDATE_DATABASE] Database updated successfully`);

      return { updated: true };
    } catch (error) {
      this.logger.error(`[UPDATE_DATABASE] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Step 8: Cleanup Temp Files ====================

  /**
   * 清理临时文件
   */
  private async cleanupTempFiles(
    state: AppInstallationSagaState
  ): Promise<Partial<AppInstallationSagaState>> {
    this.logger.log(`[CLEANUP_TEMP_FILES] Cleaning up temporary files`);

    // 清理本地临时文件
    if (state.tempFilePath && fs.existsSync(state.tempFilePath)) {
      await fs.promises.unlink(state.tempFilePath);
      this.logger.log(`[CLEANUP_TEMP_FILES] Deleted local temp file: ${state.tempFilePath}`);
    }

    // 清理设备上的临时文件
    if (state.deviceTempPath) {
      try {
        const deviceServiceUrl =
          this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

        await firstValueFrom(
          this.httpService.delete(
            `${deviceServiceUrl}/devices/${state.deviceId}/files`,
            {
              data: { path: state.deviceTempPath },
              timeout: 10000,
            }
          )
        );

        this.logger.log(`[CLEANUP_TEMP_FILES] Deleted device temp file: ${state.deviceTempPath}`);
      } catch (error) {
        this.logger.warn(`[CLEANUP_TEMP_FILES] Failed to delete device temp file: ${error.message}`);
        // 不抛出错误，清理失败不影响安装成功
      }
    }

    return {};
  }

  // ==================== Compensation Methods ====================

  /**
   * 补偿: 删除安装记录
   */
  private async deleteInstallationRecord(state: AppInstallationSagaState): Promise<void> {
    if (!state.installationId) return;

    this.logger.log(`[COMPENSATE] Deleting installation record ${state.installationId}`);

    try {
      await this.deviceAppsRepository.delete(state.installationId);
      this.logger.log(`[COMPENSATE] Installation record deleted`);
    } catch (error) {
      this.logger.error(`[COMPENSATE] Failed to delete installation record: ${error.message}`);
    }
  }

  /**
   * 补偿: 删除本地临时文件
   */
  private async deleteTempFile(state: AppInstallationSagaState): Promise<void> {
    if (!state.tempFilePath) return;

    this.logger.log(`[COMPENSATE] Deleting temp file ${state.tempFilePath}`);

    try {
      if (fs.existsSync(state.tempFilePath)) {
        await fs.promises.unlink(state.tempFilePath);
        this.logger.log(`[COMPENSATE] Temp file deleted`);
      }
    } catch (error) {
      this.logger.error(`[COMPENSATE] Failed to delete temp file: ${error.message}`);
    }
  }

  /**
   * 补偿: 删除设备上的临时文件
   */
  private async deleteDeviceTempFile(state: AppInstallationSagaState): Promise<void> {
    if (!state.deviceTempPath) return;

    this.logger.log(`[COMPENSATE] Deleting device temp file ${state.deviceTempPath}`);

    try {
      const deviceServiceUrl =
        this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

      await firstValueFrom(
        this.httpService.delete(`${deviceServiceUrl}/devices/${state.deviceId}/files`, {
          data: { path: state.deviceTempPath },
          timeout: 10000,
        })
      );

      this.logger.log(`[COMPENSATE] Device temp file deleted`);
    } catch (error) {
      this.logger.warn(`[COMPENSATE] Failed to delete device temp file: ${error.message}`);
    }
  }

  /**
   * 补偿: 卸载应用
   */
  private async uninstallApk(state: AppInstallationSagaState): Promise<void> {
    if (!state.app) return;

    this.logger.log(`[COMPENSATE] Uninstalling package ${state.app.packageName}`);

    try {
      const deviceServiceUrl =
        this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

      await firstValueFrom(
        this.httpService.post(
          `${deviceServiceUrl}/devices/${state.deviceId}/uninstall-apk`,
          {
            packageName: state.app.packageName,
          },
          { timeout: 60000 }
        )
      );

      this.logger.log(`[COMPENSATE] Package uninstalled`);
    } catch (error) {
      this.logger.warn(`[COMPENSATE] Failed to uninstall package: ${error.message}`);
    }
  }

  /**
   * 补偿: 回滚数据库更新
   */
  private async revertDatabaseUpdate(state: AppInstallationSagaState): Promise<void> {
    if (!state.installationId) return;

    this.logger.log(`[COMPENSATE] Reverting database update for ${state.installationId}`);

    try {
      // 恢复安装记录状态为失败
      await this.deviceAppsRepository.update(state.installationId, {
        status: InstallStatus.FAILED,
      });

      // 减少应用安装次数
      await this.appsRepository.decrement({ id: state.applicationId }, 'installCount', 1);

      this.logger.log(`[COMPENSATE] Database update reverted`);
    } catch (error) {
      this.logger.error(`[COMPENSATE] Failed to revert database update: ${error.message}`);
    }
  }

  /**
   * 查询 Saga 状态
   */
  async getSagaStatus(sagaId: string) {
    return await this.sagaOrchestrator.getSagaState(sagaId);
  }
}
