/**
 * GenymotionModule - Genymotion Cloud Provider Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenymotionClient } from './genymotion.client';
import { GenymotionProvider } from './genymotion.provider';

@Module({
  imports: [ConfigModule],
  providers: [GenymotionClient, GenymotionProvider],
  exports: [GenymotionProvider, GenymotionClient],
})
export class GenymotionModule {}
