import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IPRoyalAdapter } from './iproyal/iproyal.adapter';
import { BrightDataAdapter } from './brightdata/brightdata.adapter';
import { OxylabsAdapter } from './oxylabs/oxylabs.adapter';
import { IPIDEAAdapter } from './ipidea/ipidea.adapter';
import { ProxyAdapterManagerService } from './proxy-adapter-manager.service';
import { ProxyProvider } from '../entities/proxy-provider.entity';

/**
 * 适配器模块
 *
 * 管理所有代理供应商适配器的初始化和依赖注入
 *
 * 配置来源优先级：
 * 1. 数据库配置（通过管理后台配置）- 主要来源
 * 2. 环境变量配置 - 仅作为初始化/备用
 *
 * 使用方式：
 * - 推荐通过管理后台 /proxy/providers API 配置供应商
 * - 环境变量配置仅用于初始启动或测试
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ProxyProvider]),
  ],
  providers: [
    // 单独的适配器类（用于类型注入）
    IPRoyalAdapter,
    BrightDataAdapter,
    OxylabsAdapter,
    IPIDEAAdapter,

    // 动态适配器管理器（从数据库加载配置）
    ProxyAdapterManagerService,

    // PROXY_PROVIDERS token - 提供活跃适配器列表
    // 优先从数据库加载，如果数据库为空则从环境变量初始化
    {
      provide: 'PROXY_PROVIDERS',
      useFactory: async (
        adapterManager: ProxyAdapterManagerService,
        iproyal: IPRoyalAdapter,
        brightdata: BrightDataAdapter,
        oxylabs: OxylabsAdapter,
        ipidea: IPIDEAAdapter,
        config: ConfigService,
      ) => {
        // 优先使用数据库配置（通过管理器）
        const dbAdapters = adapterManager.getActiveAdapters();
        if (dbAdapters.length > 0) {
          console.log(`Using ${dbAdapters.length} adapter(s) from database configuration`);
          return dbAdapters;
        }

        // 回退到环境变量配置（兼容性保留）
        console.log('No database configuration found, falling back to environment variables...');
        const providers = [];

        // 初始化 IPRoyal
        if (config.get('IPROYAL_USERNAME') && config.get('IPROYAL_PASSWORD')) {
          try {
            await iproyal.initialize({
              name: 'iproyal',
              apiUrl: config.get('IPROYAL_API_URL') || 'https://resi-api.iproyal.com/v1',
              username: config.get('IPROYAL_USERNAME'),
              password: config.get('IPROYAL_PASSWORD'),
              timeout: 30000,
              maxRetries: 3,
              costPerGB: 1.75,
              enabled: true,
              priority: 70,
            });
            providers.push(iproyal);
          } catch (error) {
            console.error('Failed to initialize IPRoyal adapter:', error.message);
          }
        }

        // 初始化 Bright Data
        if (config.get('BRIGHTDATA_API_KEY') && config.get('BRIGHTDATA_USERNAME')) {
          try {
            await brightdata.initialize({
              name: 'brightdata',
              apiUrl: config.get('BRIGHTDATA_API_URL') || 'https://api.brightdata.com',
              apiKey: config.get('BRIGHTDATA_API_KEY'),
              username: config.get('BRIGHTDATA_USERNAME'),
              password: config.get('BRIGHTDATA_PASSWORD'),
              timeout: 30000,
              maxRetries: 3,
              costPerGB: parseFloat(config.get('BRIGHTDATA_COST_PER_GB') || '10'),
              enabled: true,
              priority: 100,
              extra: {
                zone: config.get('BRIGHTDATA_ZONE') || 'residential',
              },
            });
            providers.push(brightdata);
          } catch (error) {
            console.error('Failed to initialize Bright Data adapter:', error.message);
          }
        }

        // 初始化 Oxylabs
        if (config.get('OXYLABS_USERNAME') && config.get('OXYLABS_PASSWORD')) {
          try {
            await oxylabs.initialize({
              name: 'oxylabs',
              apiUrl: config.get('OXYLABS_API_URL') || 'https://api.oxylabs.io',
              username: config.get('OXYLABS_USERNAME'),
              password: config.get('OXYLABS_PASSWORD'),
              timeout: 30000,
              maxRetries: 3,
              costPerGB: parseFloat(config.get('OXYLABS_COST_PER_GB') || '12'),
              enabled: true,
              priority: 90,
              extra: {
                proxyType: config.get('OXYLABS_PROXY_TYPE') || 'residential',
              },
            });
            providers.push(oxylabs);
          } catch (error) {
            console.error('Failed to initialize Oxylabs adapter:', error.message);
          }
        }

        // 初始化 IPIDEA (家宽代理)
        if (config.get('IPIDEA_API_KEY')) {
          try {
            await ipidea.initialize({
              name: 'ipidea',
              apiUrl: config.get('IPIDEA_API_URL') || 'https://api.ipidea.net',
              apiKey: config.get('IPIDEA_API_KEY'),
              username: config.get('IPIDEA_USERNAME'),
              password: config.get('IPIDEA_PASSWORD'),
              timeout: 30000,
              maxRetries: 3,
              costPerGB: parseFloat(config.get('IPIDEA_COST_PER_GB') || '3'),
              enabled: true,
              priority: 85,
              extra: {
                proxyType: config.get('IPIDEA_PROXY_TYPE') || 'residential',
                gateway: config.get('IPIDEA_GATEWAY'),
                port: parseInt(config.get('IPIDEA_PORT') || '2336', 10),
              },
            });
            providers.push(ipidea);
          } catch (error) {
            console.error('Failed to initialize IPIDEA adapter:', error.message);
          }
        }

        if (providers.length === 0) {
          console.warn('No proxy providers initialized. Please configure providers via admin panel or environment variables.');
        } else {
          console.log(`Initialized ${providers.length} proxy provider(s) from env: ${providers.map(p => p.getName()).join(', ')}`);
        }

        return providers;
      },
      inject: [
        ProxyAdapterManagerService,
        IPRoyalAdapter,
        BrightDataAdapter,
        OxylabsAdapter,
        IPIDEAAdapter,
        ConfigService,
      ],
    },
  ],
  exports: [
    IPRoyalAdapter,
    BrightDataAdapter,
    OxylabsAdapter,
    IPIDEAAdapter,
    ProxyAdapterManagerService,
    'PROXY_PROVIDERS',
  ],
})
export class AdaptersModule {}
