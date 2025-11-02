import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IPRoyalAdapter } from './iproyal/iproyal.adapter';
import { BrightDataAdapter } from './brightdata/brightdata.adapter';
import { OxylabsAdapter } from './oxylabs/oxylabs.adapter';

/**
 * 适配器模块
 * 管理所有代理供应商适配器的初始化和依赖注入
 */
@Module({
  imports: [ConfigModule],
  providers: [
    IPRoyalAdapter,
    BrightDataAdapter,
    OxylabsAdapter,
    {
      provide: 'PROXY_PROVIDERS',
      useFactory: async (
        iproyal: IPRoyalAdapter,
        brightdata: BrightDataAdapter,
        oxylabs: OxylabsAdapter,
        config: ConfigService,
      ) => {
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

        if (providers.length === 0) {
          console.warn('No proxy providers initialized. Please check your environment configuration.');
        } else {
          console.log(`Initialized ${providers.length} proxy provider(s): ${providers.map(p => p.getName()).join(', ')}`);
        }

        return providers;
      },
      inject: [IPRoyalAdapter, BrightDataAdapter, OxylabsAdapter, ConfigService],
    },
  ],
  exports: [
    IPRoyalAdapter,
    BrightDataAdapter,
    OxylabsAdapter,
    'PROXY_PROVIDERS',
  ],
})
export class AdaptersModule {}
