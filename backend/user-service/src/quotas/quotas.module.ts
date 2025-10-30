import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service';
import { QuotasController } from './quotas.controller';
import { QuotasInternalController } from './quotas-internal.controller';
import { Quota } from '../entities/quota.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quota]), AuthModule],
  controllers: [QuotasController, QuotasInternalController], // ✅ 添加内部控制器
  providers: [QuotasService],
  exports: [QuotasService],
})
export class QuotasModule {}
