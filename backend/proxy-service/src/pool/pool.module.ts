import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProxyPoolManager } from './pool-manager.service';
import { AdaptersModule } from '../adapters/adapters.module';
import { ProxyUsage } from '../entities/proxy-usage.entity';

/**
 * Pool模块
 * 管理代理池相关的服务和依赖
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ProxyUsage]),
    AdaptersModule,
  ],
  providers: [ProxyPoolManager],
  exports: [ProxyPoolManager],
})
export class PoolModule {}
