/**
 * 黑名单模块
 *
 * 提供访客封禁管理功能
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blacklist } from '../entities/blacklist.entity';
import { BlacklistController } from './blacklist.controller';
import { BlacklistService } from './blacklist.service';

@Module({
  imports: [TypeOrmModule.forFeature([Blacklist])],
  controllers: [BlacklistController],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
