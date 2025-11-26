/**
 * AwsModule - AWS Device Farm Provider Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsDeviceFarmClient } from './aws-device-farm.client';
import { AwsProvider } from './aws.provider';

@Module({
  imports: [ConfigModule],
  providers: [AwsDeviceFarmClient, AwsProvider],
  exports: [AwsProvider, AwsDeviceFarmClient],
})
export class AwsModule {}
