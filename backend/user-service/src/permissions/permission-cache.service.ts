import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { DataScope } from '../entities/data-scope.entity';
import { FieldPermission, OperationType } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CacheService, CacheLayer } from '../cache/cache.service';

/**
 * 缓存的用户权限数据
 */
export interface CachedUserPermissions {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: Permission[];
  dataScopes: Record<string, DataScope[]>; // 从Map改为Record以支持序列化
  fieldPermissions: Record<string, Record<OperationType, FieldPermission[]>>; // 从Map改为Record
  cachedAt: Date;
}

/**
 * 权限缓存服务（Redis版本）
 * 负责缓存权限数据以提升性能
 *
 * 优化特性：
 * - 使用Redis双层缓存（L1内存 + L2 Redis）
 * - 支持集群部署
 * - 缓存自动过期管理
 * - 支持批量失效
 */
@Injectable()
export class PermissionCacheService implements OnModuleInit {
  private readonly logger = new Logger(PermissionCacheService.name);

  // 缓存TTL（秒）
  private readonly CACHE_TTL = 300; // 5分钟

  // 是否启用缓存
  private readonly CACHE_ENABLED = true;

  // 缓存键前缀
  private readonly CACHE_PREFIX = 'permissions:user:';

  // ✅ WebSocket Gateway 引用（延迟注入，避免循环依赖）
  private gateway: any; // PermissionGateway type (避免循环import)

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
    private roleRepository: Repository<Role>,
    private cacheService: CacheService
  ) {}

  /**
   * 设置 WebSocket Gateway（延迟注入）
   */
  setGateway(gateway: any) {
    this.gateway = gateway;
    this.logger.log('WebSocket Gateway registered for permission cache service');
  }

  async onModuleInit() {
    this.logger.log('权限缓存服务已初始化（使用Redis双层缓存）');
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}`;
  }

  /**
   * 获取用户权限（优先从缓存）
   * @param userId 用户ID
   * @returns 用户权限数据
   */
  async getUserPermissions(userId: string): Promise<CachedUserPermissions | null> {
    // 检查缓存
    if (this.CACHE_ENABLED) {
      const cacheKey = this.getCacheKey(userId);
      const cached = await this.cacheService.get<CachedUserPermissions>(cacheKey, {
        layer: CacheLayer.L1_AND_L2,
      });

      if (cached) {
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
      const dataScopes =
        roleIds.length > 0
          ? await this.dataScopeRepository.find({
              where: {
                roleId: In(roleIds),
                isActive: true,
              },
            })
          : [];

      // 按资源类型分组 (使用Record而非Map以支持序列化)
      const dataScopesRecord: Record<string, DataScope[]> = {};
      dataScopes.forEach((ds) => {
        if (!dataScopesRecord[ds.resourceType]) {
          dataScopesRecord[ds.resourceType] = [];
        }
        dataScopesRecord[ds.resourceType].push(ds);
      });

      // 加载字段权限配置
      const fieldPermissions =
        roleIds.length > 0
          ? await this.fieldPermissionRepository.find({
              where: {
                roleId: In(roleIds),
                isActive: true,
              },
            })
          : [];

      // 按资源类型和操作类型分组 (使用Record而非Map)
      const fieldPermissionsRecord: Record<string, Record<OperationType, FieldPermission[]>> = {};
      fieldPermissions.forEach((fp) => {
        if (!fieldPermissionsRecord[fp.resourceType]) {
          fieldPermissionsRecord[fp.resourceType] = {} as Record<OperationType, FieldPermission[]>;
        }
        if (!fieldPermissionsRecord[fp.resourceType][fp.operation]) {
          fieldPermissionsRecord[fp.resourceType][fp.operation] = [];
        }
        fieldPermissionsRecord[fp.resourceType][fp.operation].push(fp);
      });

      const cachedData: CachedUserPermissions = {
        userId: user.id,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        roles: roleIds,
        permissions,
        dataScopes: dataScopesRecord,
        fieldPermissions: fieldPermissionsRecord,
        cachedAt: new Date(),
      };

      // 存入Redis缓存 (双层缓存)
      if (this.CACHE_ENABLED) {
        const cacheKey = this.getCacheKey(userId);
        await this.cacheService.set(cacheKey, cachedData, {
          ttl: this.CACHE_TTL,
          layer: CacheLayer.L1_AND_L2,
          randomTTL: true, // 防止缓存雪崩
        });
        this.logger.debug(`已缓存用户 ${userId} 的权限到Redis`);
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
  async invalidateCache(userId?: string): Promise<void> {
    if (userId) {
      const cacheKey = this.getCacheKey(userId);
      await this.cacheService.del(cacheKey);
      this.logger.debug(`已清除用户 ${userId} 的权限缓存`);

      // ✅ 推送 WebSocket 通知
      if (this.gateway) {
        const newPermissions = await this.getUserPermissions(userId);
        if (newPermissions) {
          await this.gateway.notifyUserPermissionChanged(userId, newPermissions, '权限已更新');
        }
      }
    } else {
      // 使用模式匹配删除所有权限缓存
      const deletedCount = await this.cacheService.delPattern(`${this.CACHE_PREFIX}*`);
      this.logger.log(`已清空所有权限缓存 (共 ${deletedCount} 条)`);
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

    const affectedUsers = users.filter((user) => user.roles?.some((r) => r.id === roleId));

    const invalidationPromises = affectedUsers.map((user) => this.invalidateCache(user.id));

    await Promise.all(invalidationPromises);

    this.logger.debug(
      `已清除角色 ${roleId} 相关的所有权限缓存 (共 ${affectedUsers.length} 个用户)`
    );

    // ✅ 推送角色级别的 WebSocket 通知
    if (this.gateway) {
      await this.gateway.notifyRolePermissionChanged(roleId, `角色权限已更新，影响 ${affectedUsers.length} 个用户`);
    }
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

    const invalidationPromises = users.map((user) => this.invalidateCache(user.id));

    await Promise.all(invalidationPromises);

    this.logger.debug(`已清除租户 ${tenantId} 的所有权限缓存 (共 ${users.length} 个用户)`);
  }

  /**
   * 预热缓存（批量加载用户权限）
   * @param userIds 用户ID列表
   */
  async warmupCache(userIds: string[]): Promise<void> {
    this.logger.log(`开始预热 ${userIds.length} 个用户的权限缓存`);

    // 并发加载，但限制并发数量避免压垮数据库
    const chunkSize = 10;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      await Promise.all(chunk.map((userId) => this.loadAndCacheUserPermissions(userId)));
    }

    this.logger.log(`权限缓存预热完成`);
  }

  /**
   * 预热活跃用户缓存
   * @param limit 限制数量
   */
  async warmupActiveUsersCache(limit: number = 100): Promise<void> {
    const activeUsers = await this.userRepository.find({
      where: { status: 'active' as any },
      select: ['id', 'lastLoginAt'], // ✅ 添加排序字段到 select 避免 DISTINCT 别名问题
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
  getCacheStats() {
    const stats = this.cacheService.getStats();

    return {
      ...stats,
      enabled: this.CACHE_ENABLED,
      ttl: this.CACHE_TTL,
      prefix: this.CACHE_PREFIX,
    };
  }
}
