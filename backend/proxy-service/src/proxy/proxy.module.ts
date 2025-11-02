import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProxyController } from './controllers/proxy.controller';
import { ProxyService } from './services/proxy.service';
import { PoolModule } from '../pool/pool.module';
import { ProxyUsage } from '../entities/proxy-usage.entity';
import { ProxyProvider } from '../entities/proxy-provider.entity';
import { ProxyHealth } from '../entities/proxy-health.entity';
import { ProxySession } from '../entities/proxy-session.entity';
import { CostRecord } from '../entities/cost-record.entity';

/**
 * Proxy模块
 * 整合代理业务相关的所有组件
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ProxyProvider,
      ProxyUsage,
      ProxyHealth,
      ProxySession,
      CostRecord,
    ]),
    PoolModule,
  ],
  controllers: [ProxyController],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
