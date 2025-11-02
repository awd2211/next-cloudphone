import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CacheService } from '../cache/cache.service';
import { PermissionCacheService } from '../permissions/permission-cache.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @Optional() private cacheService: CacheService,
    private permissionCacheService: PermissionCacheService,
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

    return await this.rolesRepository.save(role);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    tenantId?: string
  ): Promise<{ data: Role[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [data, total] = await this.rolesRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['permissions'],
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
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
}
