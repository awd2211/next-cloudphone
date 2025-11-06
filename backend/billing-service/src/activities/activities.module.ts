import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { Participation } from './entities/participation.entity';
import { CouponsModule } from '../coupons/coupons.module';

/**
 * 营销活动模块
 * 提供活动管理、参与记录、统计等功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, Participation]),
    CouponsModule, // 导入优惠券模块
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
