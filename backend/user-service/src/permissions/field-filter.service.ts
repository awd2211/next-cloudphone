import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldPermission, FieldAccessLevel, OperationType } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';

/**
 * 字段列表信息
 */
export interface FieldLists {
  visible: string[];
  editable: string[];
  hidden: string[];
  readOnly: string[];
  required: string[];
}

/**
 * 字段过滤服务
 * 负责根据字段权限过滤数据和应用数据脱敏
 */
@Injectable()
export class FieldFilterService {
  private readonly logger = new Logger(FieldFilterService.name);

  constructor(
    @InjectRepository(FieldPermission)
    private fieldPermissionRepository: Repository<FieldPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 过滤单个对象的字段
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param data 原始数据
   * @param operation 操作类型
   * @returns 过滤后的数据
   */
  async filterFields(
    userId: string,
    resourceType: string,
    data: any,
    operation: OperationType = OperationType.VIEW,
  ): Promise<any> {
    if (!data) {
      return data;
    }

    const user = await this.getUserWithRoles(userId);
    if (!user) {
      return {};
    }

    // 超级管理员可以访问所有字段
    if (user.isSuperAdmin) {
      return data;
    }

    const fieldPermissions = await this.getFieldPermissions(
      user,
      resourceType,
      operation,
    );

    if (fieldPermissions.length === 0) {
      return data;
    }

    const merged = this.mergeFieldPermissions(fieldPermissions);
    return this.applyFieldFilter(data, merged, operation);
  }

  /**
   * 过滤对象数组的字段
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param dataArray 原始数据数组
   * @param operation 操作类型
   * @returns 过滤后的数据数组
   */
  async filterFieldsArray(
    userId: string,
    resourceType: string,
    dataArray: any[],
    operation: OperationType = OperationType.VIEW,
  ): Promise<any[]> {
    if (!dataArray || dataArray.length === 0) {
      return dataArray;
    }

    const user = await this.getUserWithRoles(userId);
    if (!user) {
      return [];
    }

    // 超级管理员可以访问所有字段
    if (user.isSuperAdmin) {
      return dataArray;
    }

    const fieldPermissions = await this.getFieldPermissions(
      user,
      resourceType,
      operation,
    );

    if (fieldPermissions.length === 0) {
      return dataArray;
    }

    const merged = this.mergeFieldPermissions(fieldPermissions);
    return dataArray.map((data) => this.applyFieldFilter(data, merged, operation));
  }

  /**
   * 获取可见字段列表
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param operation 操作类型
   * @returns 可见字段列表
   */
  async getVisibleFields(
    userId: string,
    resourceType: string,
    operation: OperationType = OperationType.VIEW,
  ): Promise<string[]> {
    const fieldLists = await this.getFieldLists(userId, resourceType, operation);
    return fieldLists.visible;
  }

  /**
   * 获取可编辑字段列表
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param operation 操作类型
   * @returns 可编辑字段列表
   */
  async getEditableFields(
    userId: string,
    resourceType: string,
    operation: OperationType = OperationType.UPDATE,
  ): Promise<string[]> {
    const fieldLists = await this.getFieldLists(userId, resourceType, operation);
    return fieldLists.editable;
  }

  /**
   * 获取所有字段列表信息
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param operation 操作类型
   * @returns 字段列表信息
   */
  async getFieldLists(
    userId: string,
    resourceType: string,
    operation: OperationType,
  ): Promise<FieldLists> {
    const user = await this.getUserWithRoles(userId);
    if (!user) {
      return this.emptyFieldLists();
    }

    // 超级管理员可以访问所有字段
    if (user.isSuperAdmin) {
      return {
        visible: [],
        editable: [],
        hidden: [],
        readOnly: [],
        required: [],
      };
    }

    const fieldPermissions = await this.getFieldPermissions(
      user,
      resourceType,
      operation,
    );

    if (fieldPermissions.length === 0) {
      return this.emptyFieldLists();
    }

    const merged = this.mergeFieldPermissions(fieldPermissions);

    // 从合并的权限中提取字段列表
    const hiddenFields = merged.hiddenFields || [];
    const readOnlyFields = merged.readOnlyFields || [];
    const writableFields = merged.writableFields || [];
    const requiredFields = merged.requiredFields || [];

    // 计算可见字段（非隐藏字段）
    const visibleFields = [...writableFields, ...readOnlyFields].filter(
      (f) => !hiddenFields.includes(f),
    );

    return {
      visible: [...new Set(visibleFields)],
      editable: writableFields,
      hidden: hiddenFields,
      readOnly: readOnlyFields,
      required: requiredFields,
    };
  }

  /**
   * 验证字段访问权限
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @param fieldName 字段名
   * @param accessLevel 访问级别
   * @param operation 操作类型
   * @returns 是否有权限
   */
  async validateFieldAccess(
    userId: string,
    resourceType: string,
    fieldName: string,
    accessLevel: FieldAccessLevel,
    operation: OperationType,
  ): Promise<boolean> {
    const user = await this.getUserWithRoles(userId);
    if (!user) {
      return false;
    }

    // 超级管理员拥有所有字段权限
    if (user.isSuperAdmin) {
      return true;
    }

    const fieldPermissions = await this.getFieldPermissions(
      user,
      resourceType,
      operation,
    );

    if (fieldPermissions.length === 0) {
      return true; // 无限制
    }

    const merged = this.mergeFieldPermissions(fieldPermissions);
    const fieldAccessMap = merged.fieldAccessMap || {};

    // 检查字段访问映射
    if (fieldAccessMap[fieldName]) {
      return this.checkAccessLevel(fieldAccessMap[fieldName], accessLevel);
    }

    // 检查字段列表
    switch (accessLevel) {
      case FieldAccessLevel.HIDDEN:
        return !merged.hiddenFields?.includes(fieldName);
      case FieldAccessLevel.READ:
        return (
          !merged.hiddenFields?.includes(fieldName) &&
          (merged.readOnlyFields?.includes(fieldName) ||
            merged.writableFields?.includes(fieldName))
        );
      case FieldAccessLevel.WRITE:
        return merged.writableFields?.includes(fieldName);
      case FieldAccessLevel.REQUIRED:
        return merged.requiredFields?.includes(fieldName);
      default:
        return true;
    }
  }

  /**
   * 应用字段转换（数据脱敏）
   * @param data 原始数据
   * @param fieldTransforms 转换规则
   * @returns 转换后的数据
   */
  private applyFieldTransforms(
    data: any,
    fieldTransforms: Record<string, any>,
  ): any {
    if (!fieldTransforms || Object.keys(fieldTransforms).length === 0) {
      return data;
    }

    const transformed = { ...data };

    for (const [field, transform] of Object.entries(fieldTransforms)) {
      if (transformed[field] === undefined || transformed[field] === null) {
        continue;
      }

      const value = String(transformed[field]);

      switch (transform.type) {
        case 'mask':
          transformed[field] = this.maskField(value, transform.pattern);
          break;
        case 'hash':
          transformed[field] = '***HASHED***';
          break;
        case 'remove':
          delete transformed[field];
          break;
        case 'replace':
          transformed[field] = transform.value || '***';
          break;
        default:
          // 未知类型，保持原值
          break;
      }
    }

    return transformed;
  }

  /**
   * 字段脱敏
   * @param value 原始值
   * @param pattern 脱敏模式 (例如: "{3}***@***" 表示保留前3位，中间和后面用***替换)
   * @returns 脱敏后的值
   */
  private maskField(value: string, pattern: string): string {
    if (!pattern) {
      return '***';
    }

    // 解析模式：{n} 表示保留前n位，{-n} 表示保留后n位
    const regex = /\{(-?\d+)\}/g;
    let result = pattern;
    let match;

    while ((match = regex.exec(pattern)) !== null) {
      const num = parseInt(match[1], 10);
      let replacement = '';

      if (num > 0) {
        // 保留前n位
        replacement = value.substring(0, num);
      } else if (num < 0) {
        // 保留后n位
        replacement = value.substring(value.length + num);
      }

      result = result.replace(match[0], replacement);
    }

    return result;
  }

  /**
   * 应用字段过滤
   */
  private applyFieldFilter(
    data: any,
    fieldPermission: FieldPermission,
    operation: OperationType,
  ): any {
    const filtered = { ...data };
    const hiddenFields = fieldPermission.hiddenFields || [];
    const fieldAccessMap = fieldPermission.fieldAccessMap || {};

    // 移除隐藏字段
    hiddenFields.forEach((field) => {
      delete filtered[field];
    });

    // 应用字段访问映射
    Object.entries(fieldAccessMap).forEach(([field, accessLevel]) => {
      if (accessLevel === FieldAccessLevel.HIDDEN) {
        delete filtered[field];
      }
    });

    // 应用字段转换（数据脱敏）
    if (fieldPermission.fieldTransforms && operation === OperationType.VIEW) {
      return this.applyFieldTransforms(filtered, fieldPermission.fieldTransforms);
    }

    return filtered;
  }

  /**
   * 获取用户（包含角色）
   */
  private async getUserWithRoles(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
  }

  /**
   * 获取字段权限配置
   */
  private async getFieldPermissions(
    user: User,
    resourceType: string,
    operation: OperationType,
  ): Promise<FieldPermission[]> {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    const roleIds = user.roles.map((r) => r.id);
    return this.fieldPermissionRepository.find({
      where: {
        roleId: roleIds as any,
        resourceType,
        operation,
        isActive: true,
      },
      order: {
        priority: 'ASC',
      },
    });
  }

  /**
   * 合并字段权限
   */
  private mergeFieldPermissions(permissions: FieldPermission[]): FieldPermission {
    if (permissions.length === 0) {
      return {
        hiddenFields: [],
        readOnlyFields: [],
        writableFields: [],
        requiredFields: [],
        fieldAccessMap: {},
      } as unknown as FieldPermission;
    }

    // 使用优先级最高的（第一个）作为基础
    const base = permissions[0];
    const merged: FieldPermission = {
      ...base,
      hiddenFields: [],
      readOnlyFields: [],
      writableFields: [],
      requiredFields: [],
      fieldAccessMap: {},
    };

    // 合并所有权限（取并集）
    permissions.forEach((perm) => {
      if (perm.hiddenFields) {
        merged.hiddenFields.push(...perm.hiddenFields);
      }
      if (perm.readOnlyFields) {
        merged.readOnlyFields.push(...perm.readOnlyFields);
      }
      if (perm.writableFields) {
        merged.writableFields.push(...perm.writableFields);
      }
      if (perm.requiredFields) {
        merged.requiredFields.push(...perm.requiredFields);
      }
      if (perm.fieldAccessMap) {
        Object.assign(merged.fieldAccessMap, perm.fieldAccessMap);
      }
      if (perm.fieldTransforms) {
        if (!merged.fieldTransforms) {
          merged.fieldTransforms = {};
        }
        Object.assign(merged.fieldTransforms, perm.fieldTransforms);
      }
    });

    // 去重
    merged.hiddenFields = [...new Set(merged.hiddenFields)];
    merged.readOnlyFields = [...new Set(merged.readOnlyFields)];
    merged.writableFields = [...new Set(merged.writableFields)];
    merged.requiredFields = [...new Set(merged.requiredFields)];

    return merged;
  }

  /**
   * 检查访问级别
   */
  private checkAccessLevel(
    current: FieldAccessLevel,
    required: FieldAccessLevel,
  ): boolean {
    const levels = {
      [FieldAccessLevel.HIDDEN]: 0,
      [FieldAccessLevel.READ]: 1,
      [FieldAccessLevel.WRITE]: 2,
      [FieldAccessLevel.REQUIRED]: 3,
    };

    return levels[current] >= levels[required];
  }

  /**
   * 返回空的字段列表
   */
  private emptyFieldLists(): FieldLists {
    return {
      visible: [],
      editable: [],
      hidden: [],
      readOnly: [],
      required: [],
    };
  }
}
