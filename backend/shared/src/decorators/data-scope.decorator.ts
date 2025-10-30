import { SetMetadata } from '@nestjs/common';

export const DATA_SCOPE_KEY = 'data_scope';

/**
 * 数据范围类型
 */
export enum DataScopeType {
  /**
   * 所有数据 - 管理员可见
   */
  ALL = 'all',

  /**
   * 租户数据 - 同租户可见
   */
  TENANT = 'tenant',

  /**
   * 个人数据 - 仅自己可见
   */
  SELF = 'self',

  /**
   * 自定义 - 通过 filter 函数判断
   */
  CUSTOM = 'custom',
}

/**
 * 数据范围配置
 */
export interface DataScopeConfig {
  /**
   * 数据范围类型
   */
  type: DataScopeType;

  /**
   * 资源所有者字段名（用于判断是否为用户自己的资源）
   * 默认: 'userId'
   */
  ownerField?: string;

  /**
   * 租户字段名
   * 默认: 'tenantId'
   */
  tenantField?: string;

  /**
   * 自定义过滤函数（仅当 type 为 CUSTOM 时使用）
   */
  customFilter?: (user: any, resource: any) => boolean;

  /**
   * 错误消息
   */
  errorMessage?: string;
}

/**
 * 数据范围装饰器
 *
 * @example
 * // 用户只能访问自己的资源
 * @DataScope({ type: DataScopeType.SELF })
 * @Get(':id')
 * async findOne(@Param('id') id: string) {}
 *
 * @example
 * // 管理员可访问所有，用户只能访问自己的
 * @DataScope({ type: DataScopeType.SELF, ownerField: 'userId' })
 * @Get('devices/:id')
 * async getDevice(@Param('id') id: string) {}
 */
export const DataScope = (config: DataScopeConfig | DataScopeType) => {
  // 如果传入的是类型，转换为配置对象
  const fullConfig: DataScopeConfig =
    typeof config === 'string'
      ? { type: config }
      : config;

  // 设置默认值
  if (!fullConfig.ownerField) {
    fullConfig.ownerField = 'userId';
  }
  if (!fullConfig.tenantField) {
    fullConfig.tenantField = 'tenantId';
  }
  if (!fullConfig.errorMessage) {
    fullConfig.errorMessage = '您没有权限访问此资源';
  }

  return SetMetadata(DATA_SCOPE_KEY, fullConfig);
};
