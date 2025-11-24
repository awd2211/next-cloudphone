import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CacheService, CacheLayer } from '../cache/cache.service';
import { PermissionCacheService } from '../permissions/permission-cache.service';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @Optional() private cacheService: CacheService,
    private permissionCacheService: PermissionCacheService
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // 检查角色名是否已存在
    const existingRole = await this.rolesRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException(`角色 ${createRoleDto.name} 已存在`);
    }

    // 获取权限
    let permissions: Permission[] = [];
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      permissions = await this.permissionsRepository.find({
        where: { id: In(createRoleDto.permissionIds) },
      });
    }

    const role = this.rolesRepository.create({
      ...createRoleDto,
      permissions,
    });

    const savedRole = await this.rolesRepository.save(role);

    // ✅ 优化: 清除角色列表缓存
    await this.clearRoleListCache();

    return savedRole;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    tenantId?: string,
    options?: { includePermissions?: boolean }
  ): Promise<{
    data: Role[];
    total: number;
    page: number;
    limit: number;
    stats: { systemRoles: number; customRoles: number };
  }> {
    // ✅ 优化: 限制单次查询最大数量
    const safeLimit = Math.min(limit || 20, 100);
    const skip = (page - 1) * safeLimit;
    const includePerms = options?.includePermissions ?? false;

    // ✅ 优化: 构建缓存键
    const cacheKey = `role:list:page${page}:limit${safeLimit}:tenant${tenantId || 'all'}:perms${includePerms}`;

    // ✅ 优化: 尝试从缓存获取
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<{
          data: Role[];
          total: number;
          page: number;
          limit: number;
          stats: { systemRoles: number; customRoles: number };
        }>(cacheKey, { layer: CacheLayer.L2_ONLY });

        if (cached) {
          this.logger.debug(`角色列表缓存命中 - 页码: ${page}`);
          return cached;
        }
      } catch (error) {
        this.logger.warn(`获取角色列表缓存失败: ${error.message}`);
      }
    }

    // 查询数据库
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // ✅ 优化: 按需加载 permissions 关系
    const relations = includePerms ? ['permissions'] : [];

    // 并行查询：分页数据 + 统计数据
    const [paginatedResult, systemRolesCount] = await Promise.all([
      this.rolesRepository.findAndCount({
        where,
        skip,
        take: safeLimit,
        relations,
        order: { createdAt: 'DESC' },
      }),
      // 统计系统角色数量
      this.rolesRepository.count({
        where: { ...where, isSystem: true },
      }),
    ]);

    const [data, total] = paginatedResult;
    const customRoles = total - systemRolesCount;

    const result = {
      data,
      total,
      page,
      limit: safeLimit,
      stats: {
        systemRoles: systemRolesCount,
        customRoles,
      },
    };

    // ✅ 优化: 写入缓存 (30秒 TTL)
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, result, { ttl: 30, layer: CacheLayer.L2_ONLY });
        this.logger.debug(`角色列表已缓存 - TTL: 30s`);
      } catch (error) {
        this.logger.warn(`写入角色列表缓存失败: ${error.message}`);
      }
    }

    return result;
  }

  async findOne(id: string): Promise<Role> {
    // 先从缓存获取
    const cacheKey = `role:${id}`;
    if (this.cacheService) {
      const cached = await this.cacheService.get<Role>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 缓存未命中，查询数据库
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`角色 #${id} 不存在`);
    }

    // 存入缓存，10分钟过期（角色变化不频繁）
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, role, { ttl: 600 });
    }

    return role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`角色 ${name} 不存在`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`角色 #${id} 不存在`);
    }

    // 系统角色不允许修改
    if (role.isSystem) {
      throw new BadRequestException('系统角色不允许修改');
    }

    // 并行化：同时检查角色名重复和获取权限（性能优化）
    const tasks: Promise<any>[] = [];

    // 检查角色名是否重复
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      tasks.push(
        this.rolesRepository.findOne({
          where: { name: updateRoleDto.name },
        })
      );
    } else {
      tasks.push(Promise.resolve(null));
    }

    // 更新权限
    if (updateRoleDto.permissionIds) {
      tasks.push(
        this.permissionsRepository.find({
          where: { id: In(updateRoleDto.permissionIds) },
        })
      );
    } else {
      tasks.push(Promise.resolve(null));
    }

    const [existingRole, permissions] = await Promise.all(tasks);

    if (existingRole) {
      throw new ConflictException(`角色 ${updateRoleDto.name} 已存在`);
    }

    if (permissions) {
      role.permissions = permissions;
    }

    Object.assign(role, updateRoleDto);

    // 清除角色缓存
    if (this.cacheService) {
      await this.cacheService.del(`role:${id}`);
    }

    // ✅ 优化: 清除角色列表缓存
    await this.clearRoleListCache();

    // 清除该角色相关的所有用户权限缓存
    await this.permissionCacheService.invalidateCacheByRole(id);

    return await this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException(`角色 #${id} 不存在`);
    }

    // 系统角色不允许删除
    if (role.isSystem) {
      throw new BadRequestException('系统角色不允许删除');
    }

    // 检查是否有用户使用该角色
    if (role.users && role.users.length > 0) {
      throw new BadRequestException('该角色下还有用户，无法删除');
    }

    // 清除该角色相关的所有用户权限缓存
    await this.permissionCacheService.invalidateCacheByRole(id);

    // ✅ 优化: 清除角色列表缓存
    await this.clearRoleListCache();

    await this.rolesRepository.remove(role);
  }

  async addPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`角色 #${roleId} 不存在`);
    }

    const newPermissions = await this.permissionsRepository.find({
      where: { id: In(permissionIds) },
    });

    // 合并权限（去重）
    const existingPermissionIds = new Set(role.permissions.map((p) => p.id));
    const permissionsToAdd = newPermissions.filter((p) => !existingPermissionIds.has(p.id));

    role.permissions = [...role.permissions, ...permissionsToAdd];

    // 清除该角色相关的所有用户权限缓存
    await this.permissionCacheService.invalidateCacheByRole(roleId);

    return await this.rolesRepository.save(role);
  }

  async removePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`角色 #${roleId} 不存在`);
    }

    const permissionIdsSet = new Set(permissionIds);
    role.permissions = role.permissions.filter((p) => !permissionIdsSet.has(p.id));

    // 清除该角色相关的所有用户权限缓存
    await this.permissionCacheService.invalidateCacheByRole(roleId);

    return await this.rolesRepository.save(role);
  }

  /**
   * 清除角色列表缓存
   * ✅ 优化: 数据变更时自动清除所有相关缓存
   */
  private async clearRoleListCache(): Promise<void> {
    if (!this.cacheService) return;

    try {
      // 清除所有角色列表缓存 (支持不同的分页、租户、权限组合)
      const pattern = 'role:list:*';

      // 使用 CacheService 的批量删除方法
      if (typeof (this.cacheService as any).delPattern === 'function') {
        await (this.cacheService as any).delPattern(pattern);
        this.logger.debug(`角色列表缓存已清除 (pattern: ${pattern})`);
      } else {
        this.logger.warn('CacheService 不支持 pattern 删除');
      }
    } catch (error) {
      this.logger.error(`清除角色列表缓存失败: ${error.message}`, error.stack);
    }
  }
}
