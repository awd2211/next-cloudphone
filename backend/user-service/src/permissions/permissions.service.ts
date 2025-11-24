import { Injectable, NotFoundException, ConflictException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CacheService, CacheLayer } from '../cache/cache.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @Optional() private cacheService: CacheService
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // 检查权限名是否已存在
    const existingPermission = await this.permissionsRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new ConflictException(`权限 ${createPermissionDto.name} 已存在`);
    }

    const permission = this.permissionsRepository.create(createPermissionDto);
    const savedPermission = await this.permissionsRepository.save(permission);

    // ✅ 优化: 清除权限列表缓存
    await this.clearPermissionListCache();

    return savedPermission;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    resource?: string
  ): Promise<{
    data: Permission[];
    total: number;
    page: number;
    limit: number;
    stats: { totalResources: number; resourceBreakdown: Record<string, number> };
  }> {
    // ✅ 优化: 限制单次查询最大数量
    const safeLimit = Math.min(limit || 20, 100);
    const skip = (page - 1) * safeLimit;

    // ✅ 优化: 构建缓存键
    const cacheKey = `permission:list:page${page}:limit${safeLimit}:resource${resource || 'all'}`;

    // ✅ 优化: 尝试从缓存获取
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<{
          data: Permission[];
          total: number;
          page: number;
          limit: number;
          stats: { totalResources: number; resourceBreakdown: Record<string, number> };
        }>(cacheKey, { layer: CacheLayer.L2_ONLY });

        if (cached) {
          this.logger.debug(`权限列表缓存命中 - 页码: ${page}`);
          return cached;
        }
      } catch (error) {
        this.logger.warn(`获取权限列表缓存失败: ${error.message}`);
      }
    }

    const where: any = {};
    if (resource) {
      where.resource = resource;
    }

    // ✅ 优化: 并行查询分页数据和统计数据
    const [paginatedResult, resourceStats] = await Promise.all([
      this.permissionsRepository.findAndCount({
        where,
        skip,
        take: safeLimit,
        order: { createdAt: 'DESC' },
      }),
      // 统计各资源的权限数量
      this.permissionsRepository
        .createQueryBuilder('permission')
        .select('permission.resource', 'resource')
        .addSelect('COUNT(*)', 'count')
        .groupBy('permission.resource')
        .getRawMany(),
    ]);

    const [data, total] = paginatedResult;

    // 构建资源分布统计
    const resourceBreakdown: Record<string, number> = {};
    resourceStats.forEach((item: { resource: string; count: string }) => {
      resourceBreakdown[item.resource] = parseInt(item.count, 10);
    });

    const result = {
      data,
      total,
      page,
      limit: safeLimit,
      stats: {
        totalResources: Object.keys(resourceBreakdown).length,
        resourceBreakdown,
      },
    };

    // ✅ 优化: 写入缓存 (30秒 TTL)
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, result, { ttl: 30, layer: CacheLayer.L2_ONLY });
        this.logger.debug(`权限列表已缓存 - TTL: 30s`);
      } catch (error) {
        this.logger.warn(`写入权限列表缓存失败: ${error.message}`);
      }
    }

    return result;
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`权限 #${id} 不存在`);
    }

    return permission;
  }

  async findByName(name: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { name },
    });

    if (!permission) {
      throw new NotFoundException(`权限 ${name} 不存在`);
    }

    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`权限 #${id} 不存在`);
    }

    // Note: name, resource, and action cannot be updated (immutable identifiers per DTO)

    Object.assign(permission, updatePermissionDto);
    const savedPermission = await this.permissionsRepository.save(permission);

    // ✅ 优化: 清除权限列表缓存
    await this.clearPermissionListCache();

    return savedPermission;
  }

  async remove(id: string): Promise<void> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`权限 #${id} 不存在`);
    }

    await this.permissionsRepository.remove(permission);

    // ✅ 优化: 清除权限列表缓存
    await this.clearPermissionListCache();
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return await this.permissionsRepository.find({
      where: { resource },
    });
  }

  async bulkCreate(createPermissionDtos: CreatePermissionDto[]): Promise<Permission[]> {
    const permissions = createPermissionDtos.map((dto) => this.permissionsRepository.create(dto));
    const savedPermissions = await this.permissionsRepository.save(permissions);

    // ✅ 优化: 清除权限列表缓存
    await this.clearPermissionListCache();

    return savedPermissions;
  }

  /**
   * 清除权限列表缓存
   * ✅ 优化: 数据变更时自动清除所有相关缓存
   */
  private async clearPermissionListCache(): Promise<void> {
    if (!this.cacheService) return;

    try {
      // 清除所有权限列表缓存 (支持不同的分页、资源组合)
      const pattern = 'permission:list:*';

      // 使用 CacheService 的批量删除方法
      if (typeof (this.cacheService as any).delPattern === 'function') {
        await (this.cacheService as any).delPattern(pattern);
        this.logger.debug(`权限列表缓存已清除 (pattern: ${pattern})`);
      } else {
        this.logger.warn('CacheService 不支持 pattern 删除');
      }
    } catch (error) {
      this.logger.error(`清除权限列表缓存失败: ${error.message}`, error.stack);
    }
  }
}
