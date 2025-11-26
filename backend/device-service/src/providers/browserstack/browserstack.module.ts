/**
 * BrowserStackModule - BrowserStack App Live / App Automate Provider Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrowserStackClient } from './browserstack.client';
import { BrowserStackProvider } from './browserstack.provider';

@Module({
  imports: [ConfigModule],
  providers: [BrowserStackClient, BrowserStackProvider],
  exports: [BrowserStackProvider, BrowserStackClient],
})
export class BrowserStackModule {}
