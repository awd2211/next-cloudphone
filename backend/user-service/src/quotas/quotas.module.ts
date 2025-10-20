import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service';
import { QuotasController } from './quotas.controller';
import { Quota } from '../entities/quota.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quota]), AuthModule],
  controllers: [QuotasController],
  providers: [QuotasService],
  exports: [QuotasService],
})
export class QuotasModule {}
