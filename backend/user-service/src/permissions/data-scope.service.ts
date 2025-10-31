import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { DataScope, ScopeType } from '../entities/data-scope.entity';
import { User } from '../entities/user.entity';
import { Department } from '../entities/department.entity';

/**
 * 数据范围过滤器
 */
export interface DataScopeFilter {
  whereClause: string;
  parameters: Record<string, any>;
}

/**
 * 数据范围服务
 * 负责将数据权限规则应用到数据库查询中
 */
@Injectable()
export class DataScopeService {
  private readonly logger = new Logger(DataScopeService.name);

  constructor(
    @InjectRepository(DataScope)
    private dataScopeRepository: Repository<DataScope>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>
  ) {}

  /**
   * 获取用户对特定资源的数据范围过滤器
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @returns 数据范围过滤器
   */
  async getDataScopeFilter(userId: string, resourceType: string): Promise<DataScopeFilter | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        return null;
      }

      // 超级管理员无需过滤
      if (user.isSuperAdmin) {
        return null;
      }

      // 获取用户角色的数据范围配置
      const roleIds = user.roles?.map((r) => r.id) || [];
      if (roleIds.length === 0) {
        // 没有角色，使用用户默认数据范围
        return await this.buildDefaultScopeFilter(user, resourceType);
      }

      const dataScopes = await this.dataScopeRepository.find({
        where: {
          roleId: roleIds as any,
          resourceType,
          isActive: true,
        },
        order: {
          priority: 'ASC',
        },
      });

      if (dataScopes.length === 0) {
        // 没有配置，使用默认范围
        return await this.buildDefaultScopeFilter(user, resourceType);
      }

      // 使用优先级最高的数据范围
      const primaryScope = dataScopes[0];
      return await this.buildScopeFilter(user, primaryScope, resourceType);
    } catch (error) {
      this.logger.error(`获取数据范围过滤器失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 将数据范围应用到查询构建器
   * @param queryBuilder 查询构建器
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param alias 表别名（默认为资源类型）
   */
  async applyScopeToQuery<T extends Record<string, any>>(
    queryBuilder: SelectQueryBuilder<T>,
    userId: string,
    resourceType: string,
    alias?: string
  ): Promise<SelectQueryBuilder<T>> {
    const filter = await this.getDataScopeFilter(userId, resourceType);
    if (!filter) {
      return queryBuilder;
    }

    const tableAlias = alias || resourceType;

    // 使用 andWhere 和 Brackets 避免干扰现有查询条件
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where(this.replaceAlias(filter.whereClause, tableAlias), filter.parameters);
      })
    );

    return queryBuilder;
  }

  /**
   * 检查用户是否可以访问特定数据行
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param resourceData 资源数据
   * @returns 是否可以访问
   */
  async checkRowAccess(userId: string, resourceType: string, resourceData: any): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        return false;
      }

      // 超级管理员可以访问所有数据
      if (user.isSuperAdmin) {
        return true;
      }

      // 获取数据范围配置
      const roleIds = user.roles?.map((r) => r.id) || [];
      const dataScopes = await this.dataScopeRepository.find({
        where: {
          roleId: roleIds as any,
          resourceType,
          isActive: true,
        },
        order: {
          priority: 'ASC',
        },
      });

      if (dataScopes.length === 0) {
        return this.checkDefaultRowAccess(user, resourceData);
      }

      // 使用优先级最高的规则
      const primaryScope = dataScopes[0];
      return this.evaluateScopeRule(user, primaryScope, resourceData);
    } catch (error) {
      this.logger.error(`检查行访问权限失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取部门及其所有子部门ID列表
   * @param departmentId 部门ID
   * @returns 部门ID列表（包含自身和所有子部门）
   */
  async getDepartmentWithChildren(departmentId: string): Promise<string[]> {
    const result = [departmentId];

    try {
      const children = await this.departmentRepository.find({
        where: { parentId: departmentId, isActive: true },
      });

      for (const child of children) {
        const descendants = await this.getDepartmentWithChildren(child.id);
        result.push(...descendants);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch department children: ${error.message}`);
    }

    return result;
  }

  /**
   * 构建默认数据范围过滤器
   */
  private async buildDefaultScopeFilter(
    user: User,
    resourceType: string
  ): Promise<DataScopeFilter | null> {
    const alias = resourceType;

    switch (user.dataScope) {
      case 'all':
        return null; // 无需过滤

      case 'tenant':
        return {
          whereClause: `${alias}.tenantId = :tenantId`,
          parameters: { tenantId: user.tenantId },
        };

      case 'department':
        // 包含本部门及所有子部门数据
        return await this.buildDepartmentFilterLegacy(user, alias, true);

      case 'self':
        return {
          whereClause: `(${alias}.createdBy = :userId OR ${alias}.userId = :userId)`,
          parameters: { userId: user.id },
        };

      default:
        return null;
    }
  }

  /**
   * 构建数据范围过滤器
   */
  private async buildScopeFilter(
    user: User,
    dataScope: DataScope,
    resourceType: string
  ): Promise<DataScopeFilter | null> {
    const alias = resourceType;

    switch (dataScope.scopeType) {
      case ScopeType.ALL:
        return null; // 无需过滤

      case ScopeType.TENANT:
        return {
          whereClause: `${alias}.tenantId = :tenantId`,
          parameters: { tenantId: user.tenantId },
        };

      case ScopeType.DEPARTMENT:
      case ScopeType.DEPARTMENT_ONLY:
        return await this.buildDepartmentFilter(user, dataScope, alias);

      case ScopeType.SELF:
        return {
          whereClause: `(${alias}.createdBy = :userId OR ${alias}.userId = :userId)`,
          parameters: { userId: user.id },
        };

      case ScopeType.CUSTOM:
        return this.buildCustomFilter(dataScope.filter, alias);

      default:
        return null;
    }
  }

  /**
   * 构建部门过滤器
   */
  private async buildDepartmentFilter(
    user: User,
    dataScope: DataScope,
    alias: string
  ): Promise<DataScopeFilter> {
    const departmentIds =
      dataScope.departmentIds && dataScope.departmentIds.length > 0
        ? dataScope.departmentIds
        : [user.departmentId];

    if (dataScope.includeSubDepartments) {
      // 递归查询所有子部门
      const allDepartmentIds = await this.getAllSubDepartmentIds(departmentIds);
      return {
        whereClause: `${alias}.departmentId IN (:...departmentIds)`,
        parameters: { departmentIds: allDepartmentIds },
      };
    } else {
      return {
        whereClause: `${alias}.departmentId IN (:...departmentIds)`,
        parameters: { departmentIds },
      };
    }
  }

  /**
   * 递归获取部门及其所有子部门的ID列表
   */
  private async getAllSubDepartmentIds(departmentIds: string[]): Promise<string[]> {
    const allIds = new Set<string>(departmentIds);
    const queue = [...departmentIds];

    while (queue.length > 0) {
      const currentId = queue.shift();

      // 查询当前部门的所有子部门
      const subDepartments = await this.departmentRepository.find({
        where: { parentId: currentId },
        select: ['id'],
      });

      // 将子部门ID添加到集合和队列中
      for (const dept of subDepartments) {
        if (!allIds.has(dept.id)) {
          allIds.add(dept.id);
          queue.push(dept.id);
        }
      }
    }

    return Array.from(allIds);
  }

  /**
   * 构建部门过滤器（同步版本，用于简单场景）
   */
  private async buildDepartmentFilterLegacy(
    user: User,
    alias: string,
    includeSubDepartments: boolean
  ): Promise<DataScopeFilter> {
    if (includeSubDepartments) {
      // 递归获取所有子部门
      const allDepartmentIds = await this.getAllSubDepartmentIds([user.departmentId]);
      return {
        whereClause: `${alias}.departmentId IN (:...departmentIds)`,
        parameters: { departmentIds: allDepartmentIds },
      };
    } else {
      return {
        whereClause: `${alias}.departmentId = :departmentId`,
        parameters: { departmentId: user.departmentId },
      };
    }
  }

  /**
   * 构建自定义过滤器
   */
  private buildCustomFilter(filter: Record<string, any>, alias: string): DataScopeFilter | null {
    if (!filter || Object.keys(filter).length === 0) {
      return null;
    }

    const conditions: string[] = [];
    const parameters: Record<string, any> = {};
    let paramIndex = 0;

    for (const [field, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        // 处理操作符
        for (const [op, opValue] of Object.entries(value)) {
          const paramName = `param${paramIndex++}`;
          const condition = this.buildOperatorCondition(alias, field, op, paramName);
          if (condition) {
            conditions.push(condition);
            parameters[paramName] = opValue;
          }
        }
      } else {
        // 简单相等比较
        const paramName = `param${paramIndex++}`;
        conditions.push(`${alias}.${field} = :${paramName}`);
        parameters[paramName] = value;
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    return {
      whereClause: conditions.join(' AND '),
      parameters,
    };
  }

  /**
   * 构建操作符条件
   */
  private buildOperatorCondition(
    alias: string,
    field: string,
    operator: string,
    paramName: string
  ): string | null {
    const column = `${alias}.${field}`;

    switch (operator) {
      case '$eq':
        return `${column} = :${paramName}`;
      case '$ne':
        return `${column} != :${paramName}`;
      case '$in':
        return `${column} IN (:...${paramName})`;
      case '$nin':
        return `${column} NOT IN (:...${paramName})`;
      case '$gt':
        return `${column} > :${paramName}`;
      case '$gte':
        return `${column} >= :${paramName}`;
      case '$lt':
        return `${column} < :${paramName}`;
      case '$lte':
        return `${column} <= :${paramName}`;
      case '$like':
        return `${column} LIKE :${paramName}`;
      case '$ilike':
        return `${column} ILIKE :${paramName}`;
      case '$between':
        return `${column} BETWEEN :${paramName}Start AND :${paramName}End`;
      default:
        this.logger.warn(`不支持的操作符: ${operator}`);
        return null;
    }
  }

  /**
   * 评估数据范围规则
   */
  private evaluateScopeRule(user: User, dataScope: DataScope, resourceData: any): boolean {
    switch (dataScope.scopeType) {
      case ScopeType.ALL:
        return true;

      case ScopeType.TENANT:
        return resourceData.tenantId === user.tenantId;

      case ScopeType.DEPARTMENT:
      case ScopeType.DEPARTMENT_ONLY:
        if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
          return dataScope.departmentIds.includes(resourceData.departmentId);
        }
        return resourceData.departmentId === user.departmentId;

      case ScopeType.SELF:
        return resourceData.createdBy === user.id || resourceData.userId === user.id;

      case ScopeType.CUSTOM:
        return this.evaluateCustomFilter(dataScope.filter, resourceData);

      default:
        return false;
    }
  }

  /**
   * 评估自定义过滤条件
   */
  private evaluateCustomFilter(filter: Record<string, any>, data: any): boolean {
    if (!filter || Object.keys(filter).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        for (const [op, opValue] of Object.entries(value)) {
          if (!this.evaluateOperator(data[key], op, opValue)) {
            return false;
          }
        }
      } else {
        if (data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 评估操作符
   */
  private evaluateOperator(dataValue: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case '$eq':
        return dataValue === filterValue;
      case '$ne':
        return dataValue !== filterValue;
      case '$in':
        return Array.isArray(filterValue) && filterValue.includes(dataValue);
      case '$nin':
        return Array.isArray(filterValue) && !filterValue.includes(dataValue);
      case '$gt':
        return dataValue > filterValue;
      case '$gte':
        return dataValue >= filterValue;
      case '$lt':
        return dataValue < filterValue;
      case '$lte':
        return dataValue <= filterValue;
      case '$like':
      case '$ilike':
        return (
          typeof dataValue === 'string' &&
          dataValue.toLowerCase().includes(filterValue.toLowerCase())
        );
      default:
        return false;
    }
  }

  /**
   * 检查默认行访问权限
   */
  private checkDefaultRowAccess(user: User, resourceData: any): boolean {
    switch (user.dataScope) {
      case 'all':
        return true;
      case 'tenant':
        return resourceData.tenantId === user.tenantId;
      case 'department':
        return resourceData.departmentId === user.departmentId;
      case 'self':
        return resourceData.createdBy === user.id || resourceData.userId === user.id;
      default:
        return false;
    }
  }

  /**
   * 替换别名占位符
   */
  private replaceAlias(whereClause: string, newAlias: string): string {
    // 这个方法假设 whereClause 中使用的是默认别名
    // 如果需要更复杂的别名替换，可以使用正则表达式
    return whereClause;
  }
}
