import { Injectable, Logger, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DeviceTemplate,
  TemplateCategory,
} from "../entities/device-template.entity";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import {
  CreateDeviceFromTemplateDto,
  BatchCreateFromTemplateDto,
} from "./dto/create-from-template.dto";
import { DevicesService } from "../devices/devices.service";
import { BatchOperationsService } from "../devices/batch-operations.service";
import { CreateDeviceDto } from "../devices/dto/create-device.dto";
import { BatchCreateDeviceDto } from "../devices/dto/batch-operation.dto";
import { BusinessErrors } from "@cloudphone/shared";

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(DeviceTemplate)
    private templateRepository: Repository<DeviceTemplate>,
    private devicesService: DevicesService,
    private batchOperationsService: BatchOperationsService,
  ) {}

  /**
   * 创建设备模板
   */
  async create(
    createTemplateDto: CreateTemplateDto,
    userId: string,
  ): Promise<DeviceTemplate> {
    this.logger.log(`Creating template: ${createTemplateDto.name}`);

    // 设置默认值
    const template = this.templateRepository.create({
      ...createTemplateDto,
      resolution: createTemplateDto.resolution || "1080x1920",
      dpi: createTemplateDto.dpi || 320,
      androidVersion: createTemplateDto.androidVersion || "11",
      enableGpu: createTemplateDto.enableGpu ?? false,
      enableAudio: createTemplateDto.enableAudio ?? false,
      preInstalledApps: createTemplateDto.preInstalledApps || [],
      initCommands: createTemplateDto.initCommands || [],
      tags: createTemplateDto.tags || [],
      isPublic: createTemplateDto.isPublic ?? false,
      createdBy: userId,
      usageCount: 0,
    });

    return await this.templateRepository.save(template);
  }

  /**
   * 查找所有模板（支持过滤）
   */
  async findAll(
    category?: TemplateCategory,
    isPublic?: boolean,
    userId?: string,
  ): Promise<DeviceTemplate[]> {
    const queryBuilder = this.templateRepository.createQueryBuilder("template");

    if (category) {
      queryBuilder.andWhere("template.category = :category", { category });
    }

    if (isPublic !== undefined) {
      queryBuilder.andWhere("template.isPublic = :isPublic", { isPublic });
    }

    // 如果提供了 userId，返回公共模板或用户自己的模板
    if (userId) {
      queryBuilder.andWhere(
        "(template.isPublic = true OR template.createdBy = :userId)",
        { userId },
      );
    } else {
      // 否则只返回公共模板
      queryBuilder.andWhere("template.isPublic = true");
    }

    queryBuilder.orderBy("template.usageCount", "DESC");
    queryBuilder.addOrderBy("template.createdAt", "DESC");

    return await queryBuilder.getMany();
  }

  /**
   * 查找单个模板
   */
  async findOne(id: string, userId?: string): Promise<DeviceTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw BusinessErrors.templateNotFound(id);
    }

    // 权限检查：只有公共模板或自己创建的模板才能访问
    if (!template.isPublic && template.createdBy !== userId) {
      throw BusinessErrors.templateNotFound(id);
    }

    return template;
  }

  /**
   * 更新模板
   */
  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<DeviceTemplate> {
    const template = await this.findOne(id, userId);

    // 权限检查：只能更新自己创建的模板
    if (template.createdBy !== userId) {
      throw BusinessErrors.templateOperationDenied("您只能更新自己创建的模板");
    }

    Object.assign(template, updateTemplateDto);
    return await this.templateRepository.save(template);
  }

  /**
   * 删除模板
   */
  async remove(id: string, userId: string): Promise<void> {
    const template = await this.findOne(id, userId);

    // 权限检查：只能删除自己创建的模板
    if (template.createdBy !== userId) {
      throw BusinessErrors.templateOperationDenied("您只能删除自己创建的模板");
    }

    await this.templateRepository.remove(template);
    this.logger.log(`Template deleted: ${id}`);
  }

  /**
   * 从模板创建单个设备
   */
  async createDeviceFromTemplate(
    templateId: string,
    dto: CreateDeviceFromTemplateDto,
    userId: string,
  ): Promise<any> {
    const template = await this.findOne(templateId, userId);

    this.logger.log(`Creating device from template: ${template.name}`);

    // 更新使用统计
    await this.incrementUsageCount(templateId);

    // 构建设备创建 DTO（合并模板配置和用户覆盖）
    const createDeviceDto: CreateDeviceDto = {
      name: dto.deviceName || `${template.name}-${Date.now()}`,
      cpuCores: dto.cpuCores ?? template.cpuCores,
      memoryMB: dto.memoryMB ?? template.memoryMB,
      storageMB: template.storageMB,
      resolution: template.resolution,
      dpi: template.dpi,
      androidVersion: template.androidVersion,
      // Note: enableGpu, enableAudio, groupName not supported in CreateDeviceDto
      // These can be set via metadata or device update after creation
    };

    // 创建设备
    const device = await this.devicesService.create(createDeviceDto);

    // 执行模板初始化（异步）
    this.executeTemplateInit(device.id, template).catch((error) => {
      this.logger.error(
        `Template initialization failed for device ${device.id}: ${error.message}`,
      );
    });

    return device;
  }

  /**
   * 从模板批量创建设备
   */
  async batchCreateFromTemplate(
    templateId: string,
    dto: BatchCreateFromTemplateDto,
    userId: string,
  ): Promise<any> {
    const template = await this.findOne(templateId, userId);

    this.logger.log(
      `Batch creating ${dto.count} devices from template: ${template.name}`,
    );

    // 更新使用统计
    await this.incrementUsageCount(templateId, dto.count);

    // 构建批量创建 DTO
    const batchCreateDto: BatchCreateDeviceDto = {
      count: dto.count,
      namePrefix: dto.namePrefix,
      cpuCores: dto.cpuCores ?? template.cpuCores,
      memoryMB: dto.memoryMB ?? template.memoryMB,
      storageMB: template.storageMB,
      resolution: template.resolution,
      dpi: template.dpi,
      androidVersion: template.androidVersion,
      enableGpu: dto.enableGpu ?? template.enableGpu,
      enableAudio: template.enableAudio,
      groupName: dto.groupName,
      // Note: maxConcurrency is handled internally by batch-operations.service
    };

    // 批量创建设备
    const result =
      await this.batchOperationsService.batchCreate(batchCreateDto);

    // 对成功创建的设备执行模板初始化（异步）
    // 从 results 中提取成功的设备ID
    const successfulDeviceIds = Object.values(result.results)
      .filter((r) => r.success && r.data?.id)
      .map((r) => r.data.id);

    if (successfulDeviceIds.length > 0) {
      this.batchExecuteTemplateInit(successfulDeviceIds, template).catch(
        (error) => {
          this.logger.error(
            `Batch template initialization failed: ${error.message}`,
          );
        },
      );
    }

    return result;
  }

  /**
   * 获取热门模板（按使用次数排序）
   */
  async getPopularTemplates(limit: number = 10): Promise<DeviceTemplate[]> {
    return await this.templateRepository.find({
      where: { isPublic: true },
      order: { usageCount: "DESC", createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * 搜索模板
   */
  async searchTemplates(
    query: string,
    userId?: string,
  ): Promise<DeviceTemplate[]> {
    const queryBuilder = this.templateRepository.createQueryBuilder("template");

    queryBuilder.where(
      "(template.name ILIKE :query OR template.description ILIKE :query OR :query = ANY(template.tags))",
      { query: `%${query}%` },
    );

    if (userId) {
      queryBuilder.andWhere(
        "(template.isPublic = true OR template.createdBy = :userId)",
        { userId },
      );
    } else {
      queryBuilder.andWhere("template.isPublic = true");
    }

    queryBuilder.orderBy("template.usageCount", "DESC");

    return await queryBuilder.getMany();
  }

  /**
   * 增加使用次数
   */
  private async incrementUsageCount(
    templateId: string,
    count: number = 1,
  ): Promise<void> {
    await this.templateRepository.increment(
      { id: templateId },
      "usageCount",
      count,
    );
    await this.templateRepository.update(
      { id: templateId },
      { lastUsedAt: new Date() },
    );
  }

  /**
   * 执行模板初始化（安装应用、执行命令等）
   */
  private async executeTemplateInit(
    deviceId: string,
    template: DeviceTemplate,
  ): Promise<void> {
    this.logger.log(
      `Initializing device ${deviceId} from template ${template.name}`,
    );

    // 等待设备就绪
    await this.waitForDeviceReady(deviceId);

    // 安装预装应用
    if (template.preInstalledApps && template.preInstalledApps.length > 0) {
      for (const app of template.preInstalledApps) {
        try {
          await this.devicesService.installApk(deviceId, app.apkPath);
          this.logger.log(
            `Installed app: ${app.packageName} on device ${deviceId}`,
          );

          // 自动启动应用
          if (app.autoStart) {
            await this.devicesService.executeShellCommand(
              deviceId,
              `am start -n ${app.packageName}/.MainActivity`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to install app ${app.packageName}: ${error.message}`,
          );
        }
      }
    }

    // 执行初始化命令
    if (template.initCommands && template.initCommands.length > 0) {
      for (const command of template.initCommands) {
        try {
          await this.devicesService.executeShellCommand(deviceId, command);
          this.logger.log(`Executed command on device ${deviceId}: ${command}`);
        } catch (error) {
          this.logger.error(`Failed to execute command: ${error.message}`);
        }
      }
    }

    this.logger.log(`Template initialization completed for device ${deviceId}`);
  }

  /**
   * 批量执行模板初始化
   */
  private async batchExecuteTemplateInit(
    deviceIds: string[],
    template: DeviceTemplate,
  ): Promise<void> {
    this.logger.log(
      `Batch initializing ${deviceIds.length} devices from template ${template.name}`,
    );

    const promises = deviceIds.map((deviceId) =>
      this.executeTemplateInit(deviceId, template),
    );

    await Promise.allSettled(promises);
  }

  /**
   * 等待设备就绪
   */
  private async waitForDeviceReady(
    deviceId: string,
    maxWaitTime: number = 60000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const device = await this.devicesService.findOne(deviceId);
        if (device.status === "running") {
          return;
        }
      } catch (error) {
        // 继续等待
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Device ${deviceId} did not become ready in time`);
  }
}
