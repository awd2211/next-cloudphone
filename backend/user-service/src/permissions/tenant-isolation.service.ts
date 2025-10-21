import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * 租户上下文
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  isSuperAdmin: boolean;
  allowCrossTenant: boolean;
}

/**
 * 租户隔离服务
 * 负责多租户数据隔离和跨租户访问控制
 */
@Injectable()
export class TenantIsolationService {
  private readonly logger = new Logger(TenantIsolationService.name);

  // 存储当前请求的租户上下文（实际应用中应使用 AsyncLocalStorage 或 ClsService）
  private tenantContextMap = new Map<string, TenantContext>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 设置租户上下文
   * @param requestId 请求ID
   * @param context 租户上下文
   */
  setTenantContext(requestId: string, context: TenantContext): void {
    this.tenantContextMap.set(requestId, context);
  }

  /**
   * 获取租户上下文
   * @param requestId 请求ID
   * @returns 租户上下文
   */
  getTenantContext(requestId: string): TenantContext | undefined {
    return this.tenantContextMap.get(requestId);
  }

  /**
   * 清除租户上下文
   * @param requestId 请求ID
   */
  clearTenantContext(requestId: string): void {
    this.tenantContextMap.delete(requestId);
  }

  /**
   * 应用租户过滤器到查询构建器
   * @param queryBuilder 查询构建器
   * @param userId 用户ID
   * @param alias 表别名
   * @param tenantField 租户字段名（默认为 'tenantId'）
   * @returns 应用过滤后的查询构建器
   */
  async applyTenantFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    userId: string,
    alias?: string,
    tenantField: string = 'tenantId',
  ): Promise<SelectQueryBuilder<T>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    // 超级管理员无需租户过滤
    if (user.isSuperAdmin) {
      return queryBuilder;
    }

    // 应用租户过滤
    const tableAlias = alias || queryBuilder.alias;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where(`${tableAlias}.${tenantField} = :tenantId`, {
          tenantId: user.tenantId,
        });
      }),
    );

    return queryBuilder;
  }

  /**
   * 检查跨租户访问权限
   * @param userId 用户ID
   * @param targetTenantId 目标租户ID
   * @returns 是否允许跨租户访问
   */
  async checkCrossTenantAccess(
    userId: string,
    targetTenantId: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // 超级管理员可以跨租户访问
    if (user.isSuperAdmin) {
      return true;
    }

    // 访问自己的租户数据
    if (user.tenantId === targetTenantId) {
      return true;
    }

    // 普通用户不允许跨租户访问
    return false;
  }

  /**
   * 检查用户是否为超级管理员
   * @param userId 用户ID
   * @returns 是否为超级管理员
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'isSuperAdmin'],
    });

    return user?.isSuperAdmin || false;
  }

  /**
   * 获取用户的租户ID
   * @param userId 用户ID
   * @returns 租户ID
   */
  async getUserTenantId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    return user?.tenantId || null;
  }

  /**
   * 验证数据所属租户
   * @param userId 用户ID
   * @param data 数据对象
   * @param tenantField 租户字段名（默认为 'tenantId'）
   * @throws ForbiddenException 如果用户无权访问该租户数据
   */
  async validateDataTenant(
    userId: string,
    data: any,
    tenantField: string = 'tenantId',
  ): Promise<void> {
    if (!data || !data[tenantField]) {
      return; // 数据没有租户信息，跳过验证
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    // 超级管理员可以访问所有租户数据
    if (user.isSuperAdmin) {
      return;
    }

    // 检查租户匹配
    if (user.tenantId !== data[tenantField]) {
      throw new ForbiddenException('无权访问其他租户的数据');
    }
  }

  /**
   * 验证数据数组所属租户
   * @param userId 用户ID
   * @param dataArray 数据数组
   * @param tenantField 租户字段名（默认为 'tenantId'）
   * @throws ForbiddenException 如果用户无权访问任何一条租户数据
   */
  async validateDataArrayTenant(
    userId: string,
    dataArray: any[],
    tenantField: string = 'tenantId',
  ): Promise<void> {
    if (!dataArray || dataArray.length === 0) {
      return;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    // 超级管理员可以访问所有租户数据
    if (user.isSuperAdmin) {
      return;
    }

    // 检查所有数据是否属于同一租户
    const invalidData = dataArray.find(
      (data) => data[tenantField] && data[tenantField] !== user.tenantId,
    );

    if (invalidData) {
      throw new ForbiddenException('无权访问其他租户的数据');
    }
  }

  /**
   * 自动设置数据的租户ID
   * @param userId 用户ID
   * @param data 数据对象
   * @param tenantField 租户字段名（默认为 'tenantId'）
   * @returns 设置租户ID后的数据
   */
  async setDataTenant(
    userId: string,
    data: any,
    tenantField: string = 'tenantId',
  ): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId', 'isSuperAdmin'],
    });

    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    // 如果数据已经有租户ID
    if (data[tenantField]) {
      // 超级管理员可以指定任意租户ID
      if (user.isSuperAdmin) {
        return data;
      }

      // 普通用户只能使用自己的租户ID
      if (data[tenantField] !== user.tenantId) {
        throw new ForbiddenException('无权为其他租户创建数据');
      }

      return data;
    }

    // 自动设置为当前用户的租户ID
    return {
      ...data,
      [tenantField]: user.tenantId,
    };
  }

  /**
   * 批量设置数据的租户ID
   * @param userId 用户ID
   * @param dataArray 数据数组
   * @param tenantField 租户字段名（默认为 'tenantId'）
   * @returns 设置租户ID后的数据数组
   */
  async setDataArrayTenant(
    userId: string,
    dataArray: any[],
    tenantField: string = 'tenantId',
  ): Promise<any[]> {
    if (!dataArray || dataArray.length === 0) {
      return dataArray;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId', 'isSuperAdmin'],
    });

    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    return dataArray.map((data) => {
      // 如果数据已经有租户ID
      if (data[tenantField]) {
        // 超级管理员可以指定任意租户ID
        if (user.isSuperAdmin) {
          return data;
        }

        // 普通用户只能使用自己的租户ID
        if (data[tenantField] !== user.tenantId) {
          throw new ForbiddenException('无权为其他租户创建数据');
        }

        return data;
      }

      // 自动设置为当前用户的租户ID
      return {
        ...data,
        [tenantField]: user.tenantId,
      };
    });
  }

  /**
   * 获取租户统计信息
   * @param tenantId 租户ID
   * @returns 租户统计信息
   */
  async getTenantStats(tenantId: string): Promise<{
    userCount: number;
    activeUserCount: number;
  }> {
    const userCount = await this.userRepository.count({
      where: { tenantId },
    });

    const activeUserCount = await this.userRepository.count({
      where: {
        tenantId,
        status: 'active' as any,
      },
    });

    return {
      userCount,
      activeUserCount,
    };
  }

  /**
   * 检查租户是否存在
   * @param tenantId 租户ID
   * @returns 租户是否存在
   */
  async tenantExists(tenantId: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { tenantId },
    });

    return count > 0;
  }

  /**
   * 获取用户可访问的租户列表
   * @param userId 用户ID
   * @returns 租户ID列表
   */
  async getAccessibleTenants(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId', 'isSuperAdmin'],
    });

    if (!user) {
      return [];
    }

    // 超级管理员可以访问所有租户
    if (user.isSuperAdmin) {
      // TODO: 返回所有租户列表
      // 这需要一个 Tenant 实体和仓库
      return [];
    }

    // 普通用户只能访问自己的租户
    return user.tenantId ? [user.tenantId] : [];
  }
}
