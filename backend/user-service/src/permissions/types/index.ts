/**
 * 权限系统类型定义
 * 用于替代any类型,提供更强的类型安全
 */

import { FieldAccessLevel } from '../../entities/field-permission.entity';

/**
 * 数据库过滤器值类型
 * 支持常见的数据库查询值类型
 */
export type FilterValue = string | number | boolean | Date | null | FilterValue[];

/**
 * 数据范围过滤器
 * 用于定义数据访问范围的查询条件
 */
export interface DataScopeFilter {
  /**
   * 字段名到值的映射
   * 例如: { userId: "123", status: "active", createdAt: { $gt: Date } }
   */
  [fieldName: string]: FilterValue | { [operator: string]: FilterValue };
}

/**
 * 字段转换类型枚举
 */
export enum FieldTransformType {
  MASK = 'mask',
  HASH = 'hash',
  REMOVE = 'remove',
  REPLACE = 'replace',
}

/**
 * 字段脱敏转换配置
 */
export interface MaskTransform {
  type: FieldTransformType.MASK;
  /**
   * 脱敏模式
   * 例如: "***-****-{4}" 表示保留后4位,其余用*替换
   */
  pattern: string;
}

/**
 * 字段哈希转换配置
 */
export interface HashTransform {
  type: FieldTransformType.HASH;
  /**
   * 哈希算法,默认SHA256
   */
  algorithm?: 'MD5' | 'SHA1' | 'SHA256';
}

/**
 * 字段移除转换配置
 */
export interface RemoveTransform {
  type: FieldTransformType.REMOVE;
}

/**
 * 字段替换转换配置
 */
export interface ReplaceTransform {
  type: FieldTransformType.REPLACE;
  /**
   * 替换的固定值
   */
  value: string;
}

/**
 * 字段转换规则联合类型
 */
export type FieldTransform = MaskTransform | HashTransform | RemoveTransform | ReplaceTransform;

/**
 * 字段转换规则映射
 * 字段名到转换规则的映射
 */
export interface FieldTransformMap {
  [fieldName: string]: FieldTransform;
}

/**
 * 字段访问控制映射
 * 字段名到访问级别的映射
 */
export interface FieldAccessMap {
  [fieldName: string]: FieldAccessLevel;
}

/**
 * TypeORM Where 查询条件基础类型
 */
export interface WhereCondition {
  [key: string]: FilterValue | { [operator: string]: FilterValue };
}

/**
 * 数据范围查询条件
 * 用于构建数据范围的TypeORM查询条件
 */
export interface DataScopeWhereCondition {
  roleId?: string;
  resourceType?: string;
  isActive?: boolean;
  [key: string]: FilterValue | { [operator: string]: FilterValue } | undefined;
}

/**
 * 字段权限查询条件
 * 用于构建字段权限的TypeORM查询条件
 */
export interface FieldPermissionWhereCondition {
  roleId?: string;
  resourceType?: string;
  operation?: string;
  isActive?: boolean;
  [key: string]: FilterValue | { [operator: string]: FilterValue } | undefined;
}

/**
 * 带认证用户信息的请求接口
 * 扩展Express Request,添加user属性
 */
export interface AuthenticatedRequest {
  user?: {
    id: string;
    username: string;
    email?: string;
    tenantId?: string;
    roles?: string[];
    permissions?: string[];
    isSuperAdmin?: boolean;
  };
  [key: string]: unknown;
}
