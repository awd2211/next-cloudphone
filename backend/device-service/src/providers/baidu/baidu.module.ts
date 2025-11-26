/**
 * BaiduModule - 百度智能云云手机 BAC Provider Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaiduBacClient } from './baidu-bac.client';
import { BaiduProvider } from './baidu.provider';

@Module({
  imports: [ConfigModule],
  providers: [BaiduBacClient, BaiduProvider],
  exports: [BaiduProvider, BaiduBacClient],
})
export class BaiduModule {}
