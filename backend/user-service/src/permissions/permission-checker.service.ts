import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission, DataScopeType } from '../entities/permission.entity';
import { DataScope, ScopeType } from '../entities/data-scope.entity';
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { PermissionCacheService } from './permission-cache.service';

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  scope?: DataScopeType;
  filter?: Record<string, any>;
}

/**
 * 字段权限检查结果
 */
export interface FieldPermissionResult {
  visibleFields: string[];
  editableFields: string[];
  hiddenFields: string[];
  readOnlyFields: string[];
  requiredFields: string[];
  fieldAccessMap: Record<string, FieldAccessLevel>;
}

/**
 * 权限检查器服务
 * 负责检查用户的所有层级权限：功能、操作、数据、字段
 */
@Injectable()
export class PermissionCheckerService {
  private readonly logger = new Logger(PermissionCheckerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private permissionCacheService: PermissionCacheService
  ) {}

  /**
   * 检查功能权限（菜单/页面访问权限）
   * @param userId 用户ID
   * @param functionCode 功能代码（如 'system:user:list'）
   * @returns 是否有权限
   */
  async checkFunctionPermission(userId: string, functionCode: string): Promise<boolean> {
    try {
      const user = await this.getUserWithRoles(userId);
      if (!user) {
        return false;
      }

      // 超级管理员拥有所有权限
      if (user.isSuperAdmin) {
        return true;
      }

      // 获取用户的所有权限
      const permissions = await this.getUserPermissions(user);

      // 检查是否有匹配的权限
      return permissions.some(
        (p) => p.name === functionCode && p.isActive && this.checkConditions(p.conditions, user)
      );
    } catch (error) {
      this.logger.error(`检查功能权限失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 检查操作权限（CRUD 操作权限）
   * @param userId 用户ID
   * @param resource 资源类型（如 'user', 'device'）
   * @param action 操作类型（如 'create', 'read', 'update', 'delete'）
   * @returns 权限检查结果
   */
  async checkOperationPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult> {
    try {
      const user = await this.getUserWithRoles(userId);
      if (!user) {
        return { allowed: false, reason: '用户不存在' };
      }

      // 超级管理员拥有所有权限
      if (user.isSuperAdmin) {
        return { allowed: true, scope: DataScopeType.ALL };
      }

      // 获取用户的所有权限
      const permissions = await this.getUserPermissions(user);

      // 查找匹配的权限
      const matchedPermission = permissions.find(
        (p) =>
          p.resource === resource &&
          p.action === action &&
          p.isActive &&
          this.checkConditions(p.conditions, user)
      );

      if (!matchedPermission) {
        return {
          allowed: false,
          reason: `没有 ${resource}:${action} 权限`,
        };
      }

      return {
        allowed: true,
        scope: matchedPermission.scope,
        filter: matchedPermission.dataFilter,
      };
    } catch (error) {
      this.logger.error(`检查操作权限失败: ${error.message}`, error.stack);
      return { allowed: false, reason: '权限检查异常' };
    }
  }

  /**
   * 检查数据权限（行级权限）
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param resourceData 资源数据
   * @returns 是否有权限访问该数据
   */
  async checkDataPermission(
    userId: string,
    resourceType: string,
    resourceData: any
  ): Promise<boolean> {
    try {
      const user = await this.getUserWithRoles(userId);
      if (!user) {
        return false;
      }

      // 超级管理员拥有所有数据访问权限
      if (user.isSuperAdmin) {
        return true;
      }

      // 获取用户角色的数据范围配置
      const dataScopes = await this.getUserDataScopes(user, resourceType);

      // 如果没有配置数据范围，使用用户默认的数据范围
      if (dataScopes.length === 0) {
        return this.checkDefaultDataScope(user, resourceData);
      }

      // 按优先级排序，使用优先级最高的规则
      const sortedScopes = dataScopes.sort((a, b) => a.priority - b.priority);
      const primaryScope = sortedScopes[0];

      return this.evaluateDataScope(user, primaryScope, resourceData);
    } catch (error) {
      this.logger.error(`检查数据权限失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 检查字段权限（列级权限）
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param operation 操作类型
   * @returns 字段权限结果
   */
  async checkFieldPermission(
    userId: string,
    resourceType: string,
    operation: OperationType
  ): Promise<FieldPermissionResult> {
    try {
      const user = await this.getUserWithRoles(userId);
      if (!user) {
        return this.emptyFieldPermission();
      }

      // 超级管理员可以访问所有字段
      if (user.isSuperAdmin) {
        return {
          visibleFields: [],
          editableFields: [],
          hiddenFields: [],
          readOnlyFields: [],
          requiredFields: [],
          fieldAccessMap: {},
        };
      }

      // 获取用户角色的字段权限配置
      const fieldPermissions = await this.getUserFieldPermissions(user, resourceType, operation);

      if (fieldPermissions.length === 0) {
        return this.emptyFieldPermission();
      }

      // 合并多个角色的字段权限（取并集）
      return this.mergeFieldPermissions(fieldPermissions);
    } catch (error) {
      this.logger.error(`检查字段权限失败: ${error.message}`, error.stack);
      return this.emptyFieldPermission();
    }
  }

  /**
   * 检查用户是否拥有任意一个权限
   * @param userId 用户ID
   * @param permissionNames 权限名称列表
   * @returns 是否拥有任意一个权限
   */
  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    for (const name of permissionNames) {
      const hasPermission = await this.checkFunctionPermission(userId, name);
      if (hasPermission) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查用户是否拥有所有权限
   * @param userId 用户ID
   * @param permissionNames 权限名称列表
   * @returns 是否拥有所有权限
   */
  async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    for (const name of permissionNames) {
      const hasPermission = await this.checkFunctionPermission(userId, name);
      if (!hasPermission) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取用户（包含角色信息）
   */
  private async getUserWithRoles(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
  }

  /**
   * 获取用户的所有权限（使用缓存）
   */
  private async getUserPermissions(user: User): Promise<Permission[]> {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    // 使用缓存服务获取权限
    const cachedData = await this.permissionCacheService.getUserPermissions(user.id);

    if (!cachedData) {
      this.logger.warn(`无法获取用户 ${user.id} 的权限数据`);
      return [];
    }

    return cachedData.permissions;
  }

  /**
   * 获取用户的数据范围配置（使用缓存）
   */
  private async getUserDataScopes(user: User, resourceType: string): Promise<DataScope[]> {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    // 使用缓存服务获取数据范围
    const cachedData = await this.permissionCacheService.getUserPermissions(user.id);

    if (!cachedData) {
      return [];
    }

    return cachedData.dataScopes[resourceType] || [];
  }

  /**
   * 获取用户的字段权限配置（使用缓存）
   */
  private async getUserFieldPermissions(
    user: User,
    resourceType: string,
    operation: OperationType
  ): Promise<FieldPermission[]> {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    // 使用缓存服务获取字段权限
    const cachedData = await this.permissionCacheService.getUserPermissions(user.id);

    if (!cachedData) {
      return [];
    }

    const resourcePermissions = cachedData.fieldPermissions[resourceType];
    if (!resourcePermissions) {
      return [];
    }

    return resourcePermissions[operation] || [];
  }

  /**
   * 检查权限条件
   */
  private checkConditions(conditions: Record<string, any>, user: User): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // 这里可以实现复杂的条件检查逻辑
    // 例如：时间范围、IP限制、设备类型等
    // 简单实现：检查用户状态
    if (conditions.userStatus && user.status !== conditions.userStatus) {
      return false;
    }

    return true;
  }

  /**
   * 检查默认数据范围
   */
  private checkDefaultDataScope(user: User, resourceData: any): boolean {
    switch (user.dataScope) {
      case 'all':
        return true;
      case 'tenant':
        return resourceData.tenantId === user.tenantId;
      case 'department':
        // 需要部门层级查询，这里简化处理
        return resourceData.departmentId === user.departmentId;
      case 'self':
        return resourceData.createdBy === user.id || resourceData.userId === user.id;
      default:
        return false;
    }
  }

  /**
   * 评估数据范围规则
   */
  private evaluateDataScope(user: User, dataScope: DataScope, resourceData: any): boolean {
    switch (dataScope.scopeType) {
      case ScopeType.ALL:
        return true;

      case ScopeType.TENANT:
        return resourceData.tenantId === user.tenantId;

      case ScopeType.DEPARTMENT:
      case ScopeType.DEPARTMENT_ONLY:
        if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
          // 使用指定的部门ID
          return dataScope.departmentIds.includes(resourceData.departmentId);
        }
        // 使用用户自己的部门
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
    if (!filter) {
      return true;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        // 支持操作符：$eq, $ne, $in, $nin, $gt, $gte, $lt, $lte
        for (const [op, opValue] of Object.entries(value)) {
          if (!this.evaluateOperator(data[key], op, opValue)) {
            return false;
          }
        }
      } else {
        // 简单相等比较
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
        return typeof dataValue === 'string' && dataValue.includes(filterValue);
      default:
        return false;
    }
  }

  /**
   * 合并字段权限
   */
  private mergeFieldPermissions(permissions: FieldPermission[]): FieldPermissionResult {
    const result: FieldPermissionResult = {
      visibleFields: [],
      editableFields: [],
      hiddenFields: [],
      readOnlyFields: [],
      requiredFields: [],
      fieldAccessMap: {},
    };

    // 按优先级排序
    const sortedPermissions = permissions.sort((a, b) => a.priority - b.priority);

    for (const perm of sortedPermissions) {
      // 合并字段列表（取并集）
      if (perm.hiddenFields) {
        result.hiddenFields.push(...perm.hiddenFields);
      }
      if (perm.readOnlyFields) {
        result.readOnlyFields.push(...perm.readOnlyFields);
      }
      if (perm.writableFields) {
        result.editableFields.push(...perm.writableFields);
      }
      if (perm.requiredFields) {
        result.requiredFields.push(...perm.requiredFields);
      }

      // 合并字段访问映射（优先级高的覆盖优先级低的）
      if (perm.fieldAccessMap) {
        Object.assign(result.fieldAccessMap, perm.fieldAccessMap);
      }
    }

    // 去重
    result.hiddenFields = [...new Set(result.hiddenFields)];
    result.readOnlyFields = [...new Set(result.readOnlyFields)];
    result.editableFields = [...new Set(result.editableFields)];
    result.requiredFields = [...new Set(result.requiredFields)];

    // 计算可见字段（除了隐藏字段外的所有字段）
    // 注意：这里需要根据实际业务逻辑调整
    result.visibleFields = [...result.editableFields, ...result.readOnlyFields].filter(
      (f) => !result.hiddenFields.includes(f)
    );

    return result;
  }

  /**
   * 返回空的字段权限结果
   */
  private emptyFieldPermission(): FieldPermissionResult {
    return {
      visibleFields: [],
      editableFields: [],
      hiddenFields: [],
      readOnlyFields: [],
      requiredFields: [],
      fieldAccessMap: {},
    };
  }
}
