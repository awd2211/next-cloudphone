import { Module, Logger } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HuaweiProvider } from './huawei.provider';
import { HuaweiCphClient } from './huawei-cph.client';
import { ProviderConfig } from '../../entities/provider-config.entity';
import { DeviceProviderType } from '../provider.types';

/**
 * HuaweiModule
 *
 * 华为云手机 CPH Provider 模块
 *
 * Phase 1: 动态配置支持 (NEW)
 *
 * 功能：
 * - 云手机实例创建/销毁
 * - 云手机生命周期管理（启动/停止/重启）
 * - WebRTC 投屏连接信息获取
 * - 设备属性和状态查询
 * - **多账号配置支持** (NEW)
 *
 * 依赖：
 * - HuaweiCphClient - 华为 CPH SDK 客户端（动态创建，不再作为单例）
 * - HuaweiProvider - 实现 IDeviceProvider 接口
 * - ProvidersService - 通过 ModuleRef 延迟获取，避免循环依赖
 *
 * 架构改进：
 * - ✅ 使用 ModuleRef 延迟获取 ProvidersService，完全避免循环依赖
 * - HuaweiCphClient 工厂直接从数据库读取配置
 * - 配置从数据库读取，支持运行时切换不同华为云账号
 */
@Module({
  imports: [
    HttpModule, // ✅ HTTP 请求支持
    TypeOrmModule.forFeature([ProviderConfig]), // ✅ ProviderConfig 实体
  ],
  providers: [
    HuaweiProvider, // ✅ 华为云手机 Provider
    // ✅ 工厂模式：直接从数据库读取配置，避免循环依赖
    {
      provide: HuaweiCphClient,
      useFactory: async (
        httpService: HttpService,
        configRepo: Repository<ProviderConfig>,
      ) => {
        const logger = new Logger('HuaweiCphClientFactory');
        try {
          // 直接从数据库获取默认配置
          const providerConfig = await configRepo.findOne({
            where: { providerType: DeviceProviderType.HUAWEI_CPH, isDefault: true, enabled: true },
          });

          if (!providerConfig) {
            // 尝试查找任意启用的华为配置
            const anyConfig = await configRepo.findOne({
              where: { providerType: DeviceProviderType.HUAWEI_CPH, enabled: true },
            });
            if (anyConfig) {
              logger.warn('No default Huawei CPH config found, using first enabled config');
            }
          }

          const config = providerConfig?.config || {};

          // 构建 HuaweiCphConfig
          const cphConfig = {
            projectId: config.projectId || config.project_id || '',
            accessKeyId: config.accessKeyId || config.access_key_id || '',
            secretAccessKey: config.secretAccessKey || config.secret_access_key || config.accessKeySecret || '',
            region: config.region || 'cn-north-4',
            endpoint: config.endpoint || config.apiEndpoint || `https://cph.${config.region || 'cn-north-4'}.myhuaweicloud.com`,
            defaultServerId: config.defaultServerId || config.default_server_id || '',
            defaultImageId: config.defaultImageId || config.default_image_id || '',
          };

          logger.log(`HuaweiCphClient initialized with region: ${cphConfig.region}`);
          return new HuaweiCphClient(cphConfig, httpService);
        } catch (error) {
          logger.warn(`Failed to load Huawei CPH config: ${error.message}, using empty config`);
          // 如果无法获取配置，创建一个空配置的客户端（会在使用时失败并给出明确错误）
          const emptyConfig = {
            projectId: '',
            accessKeyId: '',
            secretAccessKey: '',
            region: 'cn-north-4',
            endpoint: 'https://cph.cn-north-4.myhuaweicloud.com',
            defaultServerId: '',
            defaultImageId: '',
          };
          return new HuaweiCphClient(emptyConfig, httpService);
        }
      },
      inject: [HttpService, getRepositoryToken(ProviderConfig)],
    },
  ],
  exports: [
    HuaweiProvider, // ✅ 导出给 DeviceProviderFactory
    HuaweiCphClient, // ✅ 导出给其他服务使用（如 CloudDeviceTokenService）
  ],
})
export class HuaweiModule {}
