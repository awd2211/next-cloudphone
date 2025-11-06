import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
  imports: [
    ProxyModule,
    CacheModule.register({
      ttl: 60 * 60, // 默认1小时缓存
      max: 1000, // 最多缓存1000条记录
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
