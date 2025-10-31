import { Module } from '@nestjs/common';
import { RedroidProvider } from './redroid.provider';
import { DockerModule } from '../../docker/docker.module';
import { AdbModule } from '../../adb/adb.module';

/**
 * RedroidModule
 *
 * Redroid Provider 模块，封装 Docker + ADB 的云手机实现
 */
@Module({
  imports: [
    DockerModule, // 提供 DockerService
    AdbModule, // 提供 AdbService
  ],
  providers: [RedroidProvider],
  exports: [RedroidProvider],
})
export class RedroidModule {}
