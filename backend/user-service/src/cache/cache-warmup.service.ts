import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from './cache.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

/**
 * 缓存预热服务
 * 
 * 应用启动时预热常用数据到缓存
 */
@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private cacheService: CacheService,
  ) {}

  async onModuleInit() {
    // 延迟5秒后预热，等待所有服务初始化完成
    setTimeout(() => {
      this.warmupCache().catch(err => {
        this.logger.error(`Cache warmup failed: ${err.message}`);
      });
    }, 5000);
  }

  /**
   * 预热缓存
   */
  private async warmupCache() {
    this.logger.log('🔥 Starting cache warmup...');
    
    const startTime = Date.now();
    
    try {
      // 并行预热
      await Promise.all([
        this.warmupRoles(),
        this.warmupPermissions(),
      ]);
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Cache warmup completed in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Cache warmup error: ${error.message}`, error.stack);
    }
  }

  /**
   * 预热角色数据
   */
  private async warmupRoles() {
    try {
      const roles = await this.roleRepository.find({
        relations: ['permissions'],
        take: 100,  // 最多预热100个角色
      });
      
      for (const role of roles) {
        const cacheKey = `role:${role.id}`;
        await this.cacheService.set(cacheKey, role, { ttl: 600 });  // 10分钟
      }
      
      this.logger.log(`  ✅ Warmed up ${roles.length} roles`);
    } catch (error) {
      this.logger.warn(`Failed to warmup roles: ${error.message}`);
    }
  }

  /**
   * 预热权限数据
   */
  private async warmupPermissions() {
    try {
      const permissions = await this.permissionRepository.find({
        take: 200,  // 最多预热200个权限
      });
      
      for (const permission of permissions) {
        const cacheKey = `permission:${permission.id}`;
        await this.cacheService.set(cacheKey, permission, { ttl: 600 });
      }
      
      this.logger.log(`  ✅ Warmed up ${permissions.length} permissions`);
    } catch (error) {
      this.logger.warn(`Failed to warmup permissions: ${error.message}`);
    }
  }

  /**
   * 手动触发预热
   */
  async manualWarmup(): Promise<void> {
    this.logger.log('Manual cache warmup triggered');
    await this.warmupCache();
  }

  /**
   * 清除所有缓存并重新预热
   */
  async clearAndWarmup(): Promise<void> {
    this.logger.log('Clearing cache and rewarming...');
    
    // 清除所有缓存
    await this.cacheService.delPattern('user:*');
    await this.cacheService.delPattern('role:*');
    await this.cacheService.delPattern('permission:*');
    
    // 重新预热
    await this.warmupCache();
  }
}

