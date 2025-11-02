import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { DataScope } from '../entities/data-scope.entity';
import { FieldPermission, OperationType } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

/**
 * 缓存的用户权限数据
 */
export interface CachedUserPermissions {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: Permission[];
  dataScopes: Map<string, DataScope[]>;
  fieldPermissions: Map<string, Map<OperationType, FieldPermission[]>>;
  cachedAt: Date;
}

/**
 * 权限缓存服务
 * 负责缓存权限数据以提升性能
 */
@Injectable()
export class PermissionCacheService implements OnModuleInit {
  private readonly logger = new Logger(PermissionCacheService.name);

  // 内存缓存（生产环境应使用 Redis）
  private userPermissionsCache = new Map<string, CachedUserPermissions>();

  // 缓存TTL（秒）
  private readonly CACHE_TTL = 300; // 5分钟

  // 是否启用缓存
  private readonly CACHE_ENABLED = true;

  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(DataScope)
    private dataScopeRepository: Repository<DataScope>,
    @InjectRepository(FieldPermission)
    private fieldPermissionRepository: Repository<FieldPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>
  ) {}

  async onModuleInit() {
    this.logger.log('权限缓存服务已初始化');
    // 启动缓存清理定时任务
    this.startCacheCleanup();
  }

  /**
   * 获取用户权限（优先从缓存）
   * @param userId 用户ID
   * @returns 用户权限数据
   */
  async getUserPermissions(userId: string): Promise<CachedUserPermissions | null> {
    // 检查缓存
    if (this.CACHE_ENABLED) {
      const cached = this.userPermissionsCache.get(userId);
      if (cached && this.isCacheValid(cached.cachedAt)) {
        this.logger.debug(`从缓存加载用户 ${userId} 的权限`);
        return cached;
      }
    }

    // 缓存未命中，从数据库加载
    return this.loadAndCacheUserPermissions(userId);
  }

  /**
   * 从数据库加载并缓存用户权限
   * @param userId 用户ID
   * @returns 用户权限数据
   */
  async loadAndCacheUserPermissions(userId: string): Promise<CachedUserPermissions | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        return null;
      }

      const roleIds = user.roles?.map((r) => r.id) || [];
      const roles = await this.roleRepository.find({
        where: { id: In(roleIds) },
        relations: ['permissions'],
      });

      // 收集所有权限
      const permissionMap = new Map<string, Permission>();
      roles.forEach((role) => {
        role.permissions?.forEach((permission) => {
          permissionMap.set(permission.id, permission);
        });
      });
      const permissions = Array.from(permissionMap.values());

      // 加载数据范围配置
      const dataScopes = roleIds.length > 0
        ? await this.dataScopeRepository.find({
            where: {
              roleId: In(roleIds),
              isActive: true,
            },
          })
        : [];

      // 按资源类型分组
      const dataScopesMap = new Map<string, DataScope[]>();
      dataScopes.forEach((ds) => {
        if (!dataScopesMap.has(ds.resourceType)) {
          dataScopesMap.set(ds.resourceType, []);
        }
        dataScopesMap.get(ds.resourceType)!.push(ds);
      });

      // 加载字段权限配置
      const fieldPermissions = roleIds.length > 0
        ? await this.fieldPermissionRepository.find({
            where: {
              roleId: In(roleIds),
              isActive: true,
            },
          })
        : [];

      // 按资源类型和操作类型分组
      const fieldPermissionsMap = new Map<string, Map<OperationType, FieldPermission[]>>();
      fieldPermissions.forEach((fp) => {
        if (!fieldPermissionsMap.has(fp.resourceType)) {
          fieldPermissionsMap.set(fp.resourceType, new Map());
        }
        const resourceMap = fieldPermissionsMap.get(fp.resourceType)!;
        if (!resourceMap.has(fp.operation)) {
          resourceMap.set(fp.operation, []);
        }
        resourceMap.get(fp.operation)!.push(fp);
      });

      const cachedData: CachedUserPermissions = {
        userId: user.id,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        roles: roleIds,
        permissions,
        dataScopes: dataScopesMap,
        fieldPermissions: fieldPermissionsMap,
        cachedAt: new Date(),
      };

      // 存入缓存
      if (this.CACHE_ENABLED) {
        this.userPermissionsCache.set(userId, cachedData);
        this.logger.debug(`已缓存用户 ${userId} 的权限`);
      }

      return cachedData;
    } catch (error) {
      this.logger.error(`加载用户权限失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 使缓存失效
   * @param userId 用户ID（如果不提供，则清空所有缓存）
   */
  invalidateCache(userId?: string): void {
    if (userId) {
      this.userPermissionsCache.delete(userId);
      this.logger.debug(`已清除用户 ${userId} 的权限缓存`);
    } else {
      this.userPermissionsCache.clear();
      this.logger.log('已清空所有权限缓存');
    }
  }

  /**
   * 使角色相关的所有用户缓存失效
   * @param roleId 角色ID
   */
  async invalidateCacheByRole(roleId: string): Promise<void> {
    const users = await this.userRepository.find({
      relations: ['roles'],
    });

    users.forEach((user) => {
      if (user.roles?.some((r) => r.id === roleId)) {
        this.invalidateCache(user.id);
      }
    });

    this.logger.debug(`已清除角色 ${roleId} 相关的所有权限缓存`);
  }

  /**
   * 使租户相关的所有用户缓存失效
   * @param tenantId 租户ID
   */
  async invalidateCacheByTenant(tenantId: string): Promise<void> {
    const users = await this.userRepository.find({
      where: { tenantId },
      select: ['id'],
    });

    users.forEach((user) => {
      this.invalidateCache(user.id);
    });

    this.logger.debug(`已清除租户 ${tenantId} 的所有权限缓存`);
  }

  /**
   * 预热缓存（批量加载用户权限）
   * @param userIds 用户ID列表
   */
  async warmupCache(userIds: string[]): Promise<void> {
    this.logger.log(`开始预热 ${userIds.length} 个用户的权限缓存`);

    const promises = userIds.map((userId) => this.loadAndCacheUserPermissions(userId));

    await Promise.all(promises);

    this.logger.log(`权限缓存预热完成`);
  }

  /**
   * 预热活跃用户缓存
   * @param limit 限制数量
   */
  async warmupActiveUsersCache(limit: number = 100): Promise<void> {
    const activeUsers = await this.userRepository.find({
      where: { status: 'active' as any },
      select: ['id'],
      order: { lastLoginAt: 'DESC' },
      take: limit,
    });

    const userIds = activeUsers.map((u) => u.id);
    await this.warmupCache(userIds);
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getCacheStats(): {
    size: number;
    enabled: boolean;
    ttl: number;
  } {
    return {
      size: this.userPermissionsCache.size,
      enabled: this.CACHE_ENABLED,
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * 检查缓存是否有效
   * @param cachedAt 缓存时间
   * @returns 是否有效
   */
  private isCacheValid(cachedAt: Date): boolean {
    const now = new Date();
    const diff = (now.getTime() - cachedAt.getTime()) / 1000;
    return diff < this.CACHE_TTL;
  }

  /**
   * 启动缓存清理定时任务
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    this.userPermissionsCache.forEach((cached, userId) => {
      const diff = (now.getTime() - cached.cachedAt.getTime()) / 1000;
      if (diff >= this.CACHE_TTL) {
        this.userPermissionsCache.delete(userId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger.debug(`已清理 ${cleanedCount} 个过期权限缓存`);
    }
  }

  /**
   * 导出缓存数据（用于调试）
   * @returns 缓存数据快照
   */
  exportCache(): Array<{
    userId: string;
    tenantId: string;
    rolesCount: number;
    permissionsCount: number;
    cachedAt: Date;
  }> {
    const snapshot: Array<any> = [];

    this.userPermissionsCache.forEach((cached) => {
      snapshot.push({
        userId: cached.userId,
        tenantId: cached.tenantId,
        rolesCount: cached.roles.length,
        permissionsCount: cached.permissions.length,
        cachedAt: cached.cachedAt,
      });
    });

    return snapshot;
  }
}
