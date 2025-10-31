import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpClientModule, ServiceTokenService } from '@cloudphone/shared';
import { QuotaClientService } from './quota-client.service';
import { QuotaCacheService } from './quota-cache.service';
import { QuotaGuard } from './quota.guard';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [HttpClientModule, ConfigModule, CacheModule],
  providers: [
    QuotaClientService,
    QuotaCacheService,
    QuotaGuard,
    ServiceTokenService, // ✅ 添加服务 Token 生成器
  ],
  exports: [QuotaClientService, QuotaCacheService, QuotaGuard],
})
export class QuotaModule {}
