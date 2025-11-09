import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller';
import { CacheWarmupService } from './cache-warmup.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission]),
    forwardRef(() => PermissionsModule), // ✅ 使用 forwardRef 打破循环依赖
  ],
  controllers: [CacheController],
  providers: [
    CacheService,
    CacheWarmupService, // ✅ 注册缓存预热服务
  ],
  exports: [CacheService, CacheWarmupService],
})
export class CacheModule {}
