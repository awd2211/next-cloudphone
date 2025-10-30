import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { Application, AppStatus } from '../entities/application.entity';
import { DeviceApplication, InstallStatus } from '../entities/device-application.entity';
import { AppAuditRecord, AuditAction, AuditStatus } from '../entities/app-audit-record.entity';
import { MinioService } from '../minio/minio.service';
import { ApkParserService } from '../apk/apk-parser.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { ApproveAppDto, RejectAppDto, RequestChangesDto, SubmitReviewDto } from './dto/audit-app.dto';
import {
  EventBusService,
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  SagaStep,
  CursorPagination,
  CursorPaginationDto,
  CursorPaginatedResponse,
} from '@cloudphone/shared';

@Injectable()
export class AppsService {
  private readonly logger = new Logger(AppsService.name);

  constructor(
    @InjectRepository(Application)
    private appsRepository: Repository<Application>,
    @InjectRepository(DeviceApplication)
    private deviceAppsRepository: Repository<DeviceApplication>,
    @InjectRepository(AppAuditRecord)
    private auditRecordsRepository: Repository<AppAuditRecord>,
    private minioService: MinioService,
    private apkParserService: ApkParserService,
    private httpService: HttpService,
    private configService: ConfigService,
    private eventBus: EventBusService,
    private sagaOrchestrator: SagaOrchestratorService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * 上传 APK (使用 Saga 模式防止存储泄漏)
   *
   * Issue #3 修复: 使用 Saga 分布式事务编排上传流程
   *
   * 修复前问题:
   * - MinIO 上传和数据库记录创建不在同一事务中
   * - 如果数据库操作失败，MinIO 中的文件成为孤儿文件（存储泄漏）
   * - 如果 MinIO 上传失败但数据库记录成功，数据库记录变成无效记录
   * - 缺乏崩溃恢复机制
   *
   * 修复后:
   * - 使用 Saga 编排器管理整个上传流程
   * - 每个步骤都有补偿逻辑（compensation）
   * - 自动重试机制（最多 3 次）
   * - 超时检测（10 分钟）
   * - 崩溃恢复（从 saga_state 表恢复）
   * - 步骤追踪和状态持久化
   *
   * Saga 步骤:
   * 1. PARSE_APK - 解析 APK 文件并验证
   * 2. CREATE_APP_RECORD - 创建 Application 数据库记录（状态: UPLOADING）
   * 3. UPLOAD_TO_MINIO - 上传文件到 MinIO 存储
   * 4. UPDATE_APP_STATUS - 更新 Application 状态为 AVAILABLE
   * 5. UPDATE_LATEST_VERSION - 更新最新版本标记
   */
  async uploadApp(
    file: Express.Multer.File,
    createAppDto: CreateAppDto,
  ): Promise<{ sagaId: string; application: Application }> {
    let apkInfo: any;
    const filePath = file.path;

    try {
      // 1. 解析 APK 文件（前置验证）
      apkInfo = await this.parseApk(filePath);

      // 2. 检查相同版本是否已存在
      const existing = await this.appsRepository.findOne({
        where: {
          packageName: apkInfo.packageName,
          versionCode: apkInfo.versionCode,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `应用 ${apkInfo.packageName} 版本 ${apkInfo.versionName} (${apkInfo.versionCode}) 已存在`,
        );
      }
    } catch (error) {
      // 发布严重错误事件（APK 解析或验证失败）
      if (this.eventBus) {
        try {
          await this.eventBus.publishSystemError(
            'medium',
            'APK_UPLOAD_FAILED',
            `APK upload failed: ${error.message}`,
            'app-service',
            {
              userMessage: 'APK 上传失败，请检查文件格式',
              stackTrace: error.stack,
              metadata: {
                fileName: file.originalname,
                fileSize: file.size,
                errorMessage: error.message,
              },
            }
          );
        } catch (eventError) {
          this.logger.error('Failed to publish APK upload failed event', eventError);
        }
      }
      throw error;
    }

    try {

      // 3. 生成对象键
      const objectKey = `apps/${apkInfo.packageName}/${apkInfo.versionName}_${Date.now()}.apk`;
      const bucketName = this.minioService.getBucketName();

      // 4. 定义上传 Saga
      const uploadSaga: SagaDefinition = {
        type: SagaType.APP_UPLOAD,
        timeoutMs: 600000, // 10 分钟超时（考虑大文件上传）
        maxRetries: 3,
        steps: [
          // 步骤 1: 创建 App 数据库记录（状态: UPLOADING）
          {
            name: 'CREATE_APP_RECORD',
            execute: async (state: any) => {
              this.logger.log(`Saga step 1: Creating app record for ${apkInfo.packageName}`);

              const queryRunner = this.dataSource.createQueryRunner();
              await queryRunner.connect();
              await queryRunner.startTransaction();

              try {
                const app = queryRunner.manager.create(Application, {
                  ...createAppDto,
                  name: createAppDto.name || apkInfo.appName,
                  packageName: apkInfo.packageName,
                  versionName: apkInfo.versionName,
                  versionCode: apkInfo.versionCode,
                  size: file.size,
                  minSdkVersion: apkInfo.minSdkVersion,
                  targetSdkVersion: apkInfo.targetSdkVersion,
                  permissions: apkInfo.permissions,
                  bucketName: bucketName,
                  objectKey: objectKey,
                  downloadUrl: '', // 稍后更新
                  status: AppStatus.UPLOADING, // 🔑 关键: 初始状态为 UPLOADING
                  isLatest: false,
                });

                const savedApp = await queryRunner.manager.save(Application, app);
                await queryRunner.commitTransaction();

                this.logger.log(`Saga step 1 completed: App record created with ID ${savedApp.id}`);
                return { appId: savedApp.id };
              } catch (error) {
                await queryRunner.rollbackTransaction();
                throw error;
              } finally {
                await queryRunner.release();
              }
            },
            compensate: async (state: any) => {
              this.logger.log(`Saga step 1 compensation: Deleting app record ${state.appId}`);

              if (!state.appId) return;

              const queryRunner = this.dataSource.createQueryRunner();
              await queryRunner.connect();
              await queryRunner.startTransaction();

              try {
                await queryRunner.manager.delete(Application, { id: state.appId });
                await queryRunner.commitTransaction();
                this.logger.log(`Saga step 1 compensation completed: App record deleted`);
              } catch (error) {
                this.logger.error(`Saga step 1 compensation failed: ${error.message}`);
                await queryRunner.rollbackTransaction();
              } finally {
                await queryRunner.release();
              }
            },
          } as SagaStep,

          // 步骤 2: 上传到 MinIO
          {
            name: 'UPLOAD_TO_MINIO',
            execute: async (state: any) => {
              this.logger.log(`Saga step 2: Uploading file to MinIO: ${objectKey}`);

              const uploadResult = await this.minioService.uploadFile(
                filePath,
                objectKey,
                {
                  packageName: apkInfo.packageName,
                  versionName: apkInfo.versionName,
                },
              );

              this.logger.log(`Saga step 2 completed: File uploaded to MinIO`);
              return {
                uploaded: true,
                uploadResult,
              };
            },
            compensate: async (state: any) => {
              this.logger.log(`Saga step 2 compensation: Deleting file from MinIO: ${objectKey}`);

              try {
                await this.minioService.deleteFile(objectKey);
                this.logger.log(`Saga step 2 compensation completed: File deleted from MinIO`);
              } catch (error) {
                this.logger.error(`Saga step 2 compensation failed: ${error.message}`);
                // 不抛出异常，继续补偿其他步骤
              }
            },
          } as SagaStep,

          // 步骤 3: 更新 App 状态为 AVAILABLE
          {
            name: 'UPDATE_APP_STATUS',
            execute: async (state: any) => {
              this.logger.log(`Saga step 3: Updating app ${state.appId} status to AVAILABLE`);

              const queryRunner = this.dataSource.createQueryRunner();
              await queryRunner.connect();
              await queryRunner.startTransaction();

              try {
                const downloadUrl = await this.minioService.getFileUrl(objectKey);

                await queryRunner.manager.update(Application,
                  { id: state.appId },
                  {
                    status: AppStatus.AVAILABLE,
                    downloadUrl: downloadUrl,
                  }
                );

                await queryRunner.commitTransaction();
                this.logger.log(`Saga step 3 completed: App status updated to AVAILABLE`);
                return { statusUpdated: true };
              } catch (error) {
                await queryRunner.rollbackTransaction();
                throw error;
              } finally {
                await queryRunner.release();
              }
            },
            compensate: async (state: any) => {
              this.logger.log(`Saga step 3 compensation: Reverting app ${state.appId} to UPLOADING`);

              const queryRunner = this.dataSource.createQueryRunner();
              await queryRunner.connect();
              await queryRunner.startTransaction();

              try {
                await queryRunner.manager.update(Application,
                  { id: state.appId },
                  {
                    status: AppStatus.UPLOADING,
                    downloadUrl: '',
                  }
                );

                await queryRunner.commitTransaction();
                this.logger.log(`Saga step 3 compensation completed`);
              } catch (error) {
                this.logger.error(`Saga step 3 compensation failed: ${error.message}`);
                await queryRunner.rollbackTransaction();
              } finally {
                await queryRunner.release();
              }
            },
          } as SagaStep,

          // 步骤 4: 更新最新版本标记
          {
            name: 'UPDATE_LATEST_VERSION',
            execute: async (state: any) => {
              this.logger.log(`Saga step 4: Updating latest version for ${apkInfo.packageName}`);

              await this.updateLatestVersion(apkInfo.packageName);

              this.logger.log(`Saga step 4 completed: Latest version updated`);
              return { latestVersionUpdated: true };
            },
            compensate: async (state: any) => {
              this.logger.log(`Saga step 4 compensation: Re-updating latest version`);

              try {
                // 重新计算最新版本（排除当前上传失败的应用）
                await this.updateLatestVersion(apkInfo.packageName);
                this.logger.log(`Saga step 4 compensation completed`);
              } catch (error) {
                this.logger.error(`Saga step 4 compensation failed: ${error.message}`);
              }
            },
          } as SagaStep,
        ],
      };

      // 5. 执行 Saga
      const sagaId = await this.sagaOrchestrator.executeSaga(uploadSaga, {
        packageName: apkInfo.packageName,
        versionName: apkInfo.versionName,
        versionCode: apkInfo.versionCode,
        filePath,
        objectKey,
        bucketName,
      });

      this.logger.log(`Upload saga initiated: ${sagaId}`);

      // 6. 等待 App 记录创建（第一步必须同步完成）
      // 注意: 实际上 Saga 是异步执行的，但我们可以轮询等待第一步完成
      await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms

      const app = await this.appsRepository.findOne({
        where: { packageName: apkInfo.packageName, versionCode: apkInfo.versionCode },
      });

      if (!app) {
        throw new InternalServerErrorException('App record creation failed');
      }

      return {
        sagaId,
        application: app,
      };
    } finally {
      // 确保临时文件被清理（无论成功或失败）
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.debug(`已清理上传临时文件: ${filePath}`);
        } catch (cleanupError) {
          this.logger.warn(`清理上传临时文件失败: ${filePath}`, cleanupError.message);
        }
      }
    }
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

  /**
   * Cursor-based pagination for efficient large dataset queries
   *
   * @param dto - Cursor pagination parameters
   * @param tenantId - Optional tenant ID filter
   * @param category - Optional category filter
   * @returns Cursor paginated response
   */
  async findAllCursor(
    dto: CursorPaginationDto,
    tenantId?: string,
    category?: string,
  ): Promise<CursorPaginatedResponse<Application>> {
    const { cursor, limit = 20 } = dto;

    const qb = this.appsRepository.createQueryBuilder('app');

    // Always filter by available status
    qb.andWhere('app.status = :status', { status: AppStatus.AVAILABLE });

    // Apply filters
    if (tenantId) {
      qb.andWhere('app.tenantId = :tenantId', { tenantId });
    }
    if (category) {
      qb.andWhere('app.category = :category', { category });
    }

    // Apply cursor condition
    if (cursor) {
      const cursorCondition = CursorPagination.applyCursorCondition(cursor, 'app');
      if (cursorCondition) {
        qb.andWhere(cursorCondition.condition, cursorCondition.parameters);
      }
    }

    // Order by createdAt DESC and fetch limit + 1
    qb.orderBy('app.createdAt', 'DESC')
      .limit(limit + 1);

    const apps = await qb.getMany();

    return CursorPagination.paginate(apps, limit);
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
    // 生成临时文件路径
    const tempApkPath = `/tmp/apk_${app.id}_${Date.now()}.apk`;

    try {
      // 调用设备服务安装应用（通过 HTTP）
      const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL') || 'http://localhost:30002';

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

      // 更新安装状态
      await this.updateInstallStatus(deviceAppId, InstallStatus.INSTALLED);

      // 增加安装次数
      await this.appsRepository.increment({ id: app.id }, 'installCount', 1);
    } catch (error) {
      this.logger.error(`安装应用失败: ${error.message}`, error.stack);
      throw error;
    } finally {
      // 确保临时文件被清理（无论成功或失败）
      if (fs.existsSync(tempApkPath)) {
        try {
          fs.unlinkSync(tempApkPath);
          this.logger.debug(`已清理临时文件: ${tempApkPath}`);
        } catch (cleanupError) {
          this.logger.warn(`清理临时文件失败: ${tempApkPath}`, cleanupError.message);
        }
      }
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

  /**
   * 更新指定包名的最新版本标记
   * 将 versionCode 最大的版本标记为 isLatest = true，其他版本为 false
   */
  private async updateLatestVersion(packageName: string): Promise<void> {
    // 找到该包名的所有版本，按 versionCode 降序排序
    const allVersions = await this.appsRepository.find({
      where: { packageName, status: AppStatus.AVAILABLE },
      order: { versionCode: 'DESC' },
    });

    if (allVersions.length === 0) {
      return;
    }

    // 最高版本号的应用
    const latestVersion = allVersions[0];

    // 将所有版本的 isLatest 设置为 false
    await this.appsRepository.update(
      { packageName, status: AppStatus.AVAILABLE },
      { isLatest: false },
    );

    // 将最高版本标记为 isLatest
    await this.appsRepository.update(
      { id: latestVersion.id },
      { isLatest: true },
    );

    this.logger.log(
      `已更新 ${packageName} 的最新版本标记: ${latestVersion.versionName} (${latestVersion.versionCode})`,
    );
  }

  /**
   * 获取指定包名的所有版本
   */
  async getAppVersions(packageName: string): Promise<Application[]> {
    return await this.appsRepository.find({
      where: { packageName, status: AppStatus.AVAILABLE },
      order: { versionCode: 'DESC' },
    });
  }

  /**
   * 获取指定包名的最新版本
   */
  async getLatestVersion(packageName: string): Promise<Application | null> {
    return await this.appsRepository.findOne({
      where: { packageName, isLatest: true, status: AppStatus.AVAILABLE },
    });
  }

  /**
   * ==================== 应用审核相关方法 ====================
   */

  /**
   * 提交应用审核
   */
  async submitForReview(applicationId: string, dto: SubmitReviewDto): Promise<Application> {
    const app = await this.findOne(applicationId);

    // 检查当前状态是否允许提交审核
    if (app.status !== AppStatus.UPLOADING && app.status !== AppStatus.REJECTED) {
      throw new BadRequestException(
        `应用当前状态 (${app.status}) 不允许提交审核，只有 UPLOADING 或 REJECTED 状态可以提交`,
      );
    }

    // 更新状态为待审核
    app.status = AppStatus.PENDING_REVIEW;
    await this.appsRepository.save(app);

    // 创建审核记录
    const auditRecord = this.auditRecordsRepository.create({
      applicationId: app.id,
      action: AuditAction.SUBMIT,
      status: AuditStatus.PENDING,
      comment: dto.comment,
    });
    await this.auditRecordsRepository.save(auditRecord);

    this.logger.log(`应用 ${app.name} (${app.id}) 已提交审核`);

    return app;
  }

  /**
   * 批准应用
   */
  async approveApp(applicationId: string, dto: ApproveAppDto): Promise<Application> {
    const app = await this.findOne(applicationId);

    // 检查当前状态
    if (app.status !== AppStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `应用当前状态 (${app.status}) 不是待审核状态，无法批准`,
      );
    }

    // 更新状态为已批准
    app.status = AppStatus.APPROVED;
    await this.appsRepository.save(app);

    // 创建审核记录
    const auditRecord = this.auditRecordsRepository.create({
      applicationId: app.id,
      action: AuditAction.APPROVE,
      status: AuditStatus.APPROVED,
      reviewerId: dto.reviewerId,
      comment: dto.comment,
    });
    await this.auditRecordsRepository.save(auditRecord);

    // 发布应用批准事件
    await this.eventBus.publishAppEvent('审核.批准', {
      appId: app.id,
      packageName: app.packageName,
      versionName: app.versionName,
      reviewerId: dto.reviewerId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`应用 ${app.name} (${app.id}) 已被批准`);

    return app;
  }

  /**
   * 拒绝应用
   */
  async rejectApp(applicationId: string, dto: RejectAppDto): Promise<Application> {
    const app = await this.findOne(applicationId);

    // 检查当前状态
    if (app.status !== AppStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `应用当前状态 (${app.status}) 不是待审核状态，无法拒绝`,
      );
    }

    // 更新状态为已拒绝
    app.status = AppStatus.REJECTED;
    await this.appsRepository.save(app);

    // 创建审核记录
    const auditRecord = this.auditRecordsRepository.create({
      applicationId: app.id,
      action: AuditAction.REJECT,
      status: AuditStatus.REJECTED,
      reviewerId: dto.reviewerId,
      comment: dto.comment,
    });
    await this.auditRecordsRepository.save(auditRecord);

    // 发布应用拒绝事件
    await this.eventBus.publishAppEvent('审核.拒绝', {
      appId: app.id,
      packageName: app.packageName,
      versionName: app.versionName,
      reviewerId: dto.reviewerId,
      reason: dto.comment,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`应用 ${app.name} (${app.id}) 已被拒绝`);

    return app;
  }

  /**
   * 要求修改
   */
  async requestChanges(applicationId: string, dto: RequestChangesDto): Promise<Application> {
    const app = await this.findOne(applicationId);

    // 检查当前状态
    if (app.status !== AppStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `应用当前状态 (${app.status}) 不是待审核状态，无法要求修改`,
      );
    }

    // 状态保持为 PENDING_REVIEW，但记录要求修改
    // 创建审核记录
    const auditRecord = this.auditRecordsRepository.create({
      applicationId: app.id,
      action: AuditAction.REQUEST_CHANGES,
      status: AuditStatus.CHANGES_REQUESTED,
      reviewerId: dto.reviewerId,
      comment: dto.comment,
    });
    await this.auditRecordsRepository.save(auditRecord);

    this.logger.log(`应用 ${app.name} (${app.id}) 被要求修改`);

    return app;
  }

  /**
   * 获取应用的审核记录
   */
  async getAuditRecords(applicationId: string): Promise<AppAuditRecord[]> {
    return await this.auditRecordsRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取待审核的应用列表
   */
  async getPendingReviewApps(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.appsRepository.findAndCount({
      where: { status: AppStatus.PENDING_REVIEW },
      skip,
      take: limit,
      order: { createdAt: 'ASC' }, // 按提交时间升序，优先处理早提交的
    });

    return { data, total, page, limit };
  }

  /**
   * 获取所有审核记录（支持筛选）
   */
  async getAllAuditRecords(
    page: number = 1,
    limit: number = 10,
    filters?: {
      applicationId?: string;
      reviewerId?: string;
      action?: AuditAction;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.applicationId) where.applicationId = filters.applicationId;
    if (filters?.reviewerId) where.reviewerId = filters.reviewerId;
    if (filters?.action) where.action = filters.action;

    const [data, total] = await this.auditRecordsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['application'],
    });

    return { data, total, page, limit };
  }
}
