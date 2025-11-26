/**
 * TencentModule - 腾讯云云游戏 GS Provider Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TencentGsClient } from './tencent-gs.client';
import { TencentProvider } from './tencent.provider';

@Module({
  imports: [ConfigModule],
  providers: [TencentGsClient, TencentProvider],
  exports: [TencentProvider, TencentGsClient],
})
export class TencentModule {}
