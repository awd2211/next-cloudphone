/**
 * 角色权限配置
 *
 * 自动生成于: 2025-11-24
 * 来源: database/migrations/20251124_update_new_roles_permissions.sql
 *
 * 此文件定义了系统中所有角色的权限、数据范围和菜单访问配置
 */

export interface RoleStats {
  permissions: number;
  dataScopes: number;
  fieldPermissions: number;
  menus: number;
  users: number;
}

export interface RoleConfig {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  stats: RoleStats;
  category: 'admin' | 'operation' | 'business' | 'support' | 'partner' | 'api';
}

/**
 * 系统角色列表
 * 按权限级别从高到低排序
 */
export const SYSTEM_ROLES: readonly RoleConfig[] = [
  // === 管理员角色 ===
  {
    id: '8e65da65-0596-46f1-bab1-93cf1cb240c2',
    name: 'super_admin',
    description: '超级管理员 - 拥有系统所有权限，可以管理所有资源、配置和系统设置',
    isSystem: true,
    category: 'admin',
    stats: { permissions: 796, dataScopes: 7, fieldPermissions: 9, menus: 66, users: 2 }
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'tenant_admin',
    description: '租户管理员 - 管理本租户的所有资源和用户',
    isSystem: true,
    category: 'admin',
    stats: { permissions: 366, dataScopes: 7, fieldPermissions: 8, menus: 42, users: 1 }
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'admin',
    description: '系统管理员',
    isSystem: true,
    category: 'admin',
    stats: { permissions: 261, dataScopes: 7, fieldPermissions: 5, menus: 56, users: 1 }
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'department_admin',
    description: '部门管理员 - 管理本部门的资源',
    isSystem: true,
    category: 'admin',
    stats: { permissions: 66, dataScopes: 7, fieldPermissions: 4, menus: 22, users: 1 }
  },

  // === 运维角色 ===
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'devops',
    description: '运维工程师 - 负责系统运维和监控',
    isSystem: true,
    category: 'operation',
    stats: { permissions: 147, dataScopes: 7, fieldPermissions: 4, menus: 14, users: 1 }
  },
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-555555555555',
    name: 'scheduler_admin',
    description: '调度管理员 - 管理集群调度和资源分配',
    isSystem: true,
    category: 'operation',
    stats: { permissions: 13, dataScopes: 7, fieldPermissions: 2, menus: 11, users: 0 }
  },
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-444444444444',
    name: 'device_operator',
    description: '设备操作员 - 执行设备日常运维操作',
    isSystem: true,
    category: 'operation',
    stats: { permissions: 12, dataScopes: 7, fieldPermissions: 3, menus: 7, users: 0 }
  },
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-333333333333',
    name: 'proxy_manager',
    description: '代理管理员 - 管理代理服务器资源',
    isSystem: true,
    category: 'operation',
    stats: { permissions: 13, dataScopes: 7, fieldPermissions: 2, menus: 10, users: 0 }
  },

  // === 业务角色 ===
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-777777777777',
    name: 'app_manager',
    description: '应用管理员 - 管理应用商店和APK资源',
    isSystem: true,
    category: 'business',
    stats: { permissions: 13, dataScopes: 7, fieldPermissions: 3, menus: 10, users: 0 }
  },
  {
    id: '1734ffc3-7d1d-47ac-8ffe-1117c9a28d19',
    name: 'finance',
    description: '财务专员 - 管理账单、支付和财务报表',
    isSystem: true,
    category: 'business',
    stats: { permissions: 96, dataScopes: 7, fieldPermissions: 7, menus: 2, users: 1 }
  },
  {
    id: '97f2a6e3-aa27-40e9-9233-4d307deb269c',
    name: 'accountant',
    description: '会计 - 查看财务数据和报表',
    isSystem: true,
    category: 'business',
    stats: { permissions: 5, dataScopes: 7, fieldPermissions: 4, menus: 2, users: 1 }
  },
  {
    id: '3e133192-bddf-4bdd-8306-6f4a13f0dd41',
    name: 'auditor',
    description: '审核专员 - 负责应用审核和内容审核',
    isSystem: true,
    category: 'business',
    stats: { permissions: 10, dataScopes: 7, fieldPermissions: 4, menus: 2, users: 1 }
  },
  {
    id: '6515124a-74e8-4072-9fba-5ec37f9a41e1',
    name: 'data_analyst',
    description: '数据分析师 - 访问数据报表和分析工具',
    isSystem: true,
    category: 'business',
    stats: { permissions: 164, dataScopes: 7, fieldPermissions: 10, menus: 2, users: 1 }
  },
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-666666666666',
    name: 'content_editor',
    description: '内容编辑 - 管理CMS内容和营销活动',
    isSystem: true,
    category: 'business',
    stats: { permissions: 9, dataScopes: 7, fieldPermissions: 1, menus: 4, users: 0 }
  },
  {
    id: '55799ed1-3615-4711-84b1-7d5bc4f38b6b',
    name: 'developer',
    description: '开发者 - 应用开发者，可以上传和管理应用',
    isSystem: true,
    category: 'business',
    stats: { permissions: 13, dataScopes: 7, fieldPermissions: 4, menus: 2, users: 1 }
  },

  // === 客户支持角色 ===
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-222222222222',
    name: 'live_chat_supervisor',
    description: '客服主管 - 管理客服团队和监控服务质量',
    isSystem: true,
    category: 'support',
    stats: { permissions: 20, dataScopes: 7, fieldPermissions: 2, menus: 8, users: 1 }
  },
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-111111111111',
    name: 'live_chat_agent',
    description: '客服坐席 - 在线客服系统的坐席人员，处理实时聊天和工单',
    isSystem: true,
    category: 'support',
    stats: { permissions: 19, dataScopes: 7, fieldPermissions: 4, menus: 7, users: 5 }
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'customer_service',
    description: '客服专员 - 提供客户支持服务',
    isSystem: true,
    category: 'support',
    stats: { permissions: 19, dataScopes: 7, fieldPermissions: 4, menus: 2, users: 1 }
  },

  // === 合作伙伴和API ===
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-888888888888',
    name: 'partner',
    description: '合作伙伴 - 渠道合作伙伴，可分销资源',
    isSystem: true,
    category: 'partner',
    stats: { permissions: 7, dataScopes: 7, fieldPermissions: 3, menus: 8, users: 0 }
  },
  {
    id: 'b1a2c3d4-e5f6-4789-abcd-999999999999',
    name: 'api_user',
    description: 'API用户 - 通过API集成的第三方系统',
    isSystem: true,
    category: 'api',
    stats: { permissions: 16, dataScopes: 7, fieldPermissions: 2, menus: 7, users: 0 }
  },

  // === 普通用户角色 ===
  {
    id: '43369eb5-5a86-4e7a-bf0c-771e259a019d',
    name: 'vip_user',
    description: 'VIP用户 - 享有更高配额和优先支持',
    isSystem: true,
    category: 'business',
    stats: { permissions: 125, dataScopes: 7, fieldPermissions: 6, menus: 37, users: 1 }
  },
  {
    id: 'd931b01a-96ea-4413-88af-b18d785ac2c1',
    name: 'enterprise_user',
    description: '企业用户 - 企业员工，共享企业资源',
    isSystem: true,
    category: 'business',
    stats: { permissions: 77, dataScopes: 7, fieldPermissions: 3, menus: 20, users: 1 }
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'user',
    description: '普通用户',
    isSystem: true,
    category: 'business',
    stats: { permissions: 88, dataScopes: 7, fieldPermissions: 10, menus: 22, users: 4 }
  },
  {
    id: '14cf4aef-9a9b-4ecc-92b0-06eb34b92a4b',
    name: 'readonly_user',
    description: '只读用户 - 只能查看数据，不能修改',
    isSystem: true,
    category: 'business',
    stats: { permissions: 144, dataScopes: 7, fieldPermissions: 3, menus: 2, users: 2 }
  },
  {
    id: 'a23d1b5c-bb7a-4006-8dda-8a6663c5f05c',
    name: 'test_user',
    description: '测试用户 - 用于测试环境，有限的权限',
    isSystem: true,
    category: 'business',
    stats: { permissions: 10, dataScopes: 7, fieldPermissions: 2, menus: 2, users: 1 }
  },
  {
    id: '80c380ae-1889-438b-be39-f58f2b6616c1',
    name: 'guest',
    description: '访客 - 临时访问权限，仅可浏览公开内容',
    isSystem: true,
    category: 'business',
    stats: { permissions: 2, dataScopes: 7, fieldPermissions: 2, menus: 2, users: 2 }
  },
] as const;

/**
 * 新增的9个角色（2025-11-23）
 */
export const NEW_ROLES = [
  'live_chat_agent',
  'live_chat_supervisor',
  'proxy_manager',
  'device_operator',
  'scheduler_admin',
  'content_editor',
  'app_manager',
  'partner',
  'api_user',
] as const;

/**
 * 角色分类
 */
export const ROLE_CATEGORIES = {
  admin: '管理员',
  operation: '运维',
  business: '业务',
  support: '客户支持',
  partner: '合作伙伴',
  api: 'API集成',
} as const;

/**
 * 数据范围类型
 */
export const DATA_SCOPE_TYPES = {
  all: '全部数据',
  tenant: '本租户数据',
  department: '本部门及子部门数据',
  department_only: '仅本部门数据',
  self: '仅本人数据',
  custom: '自定义过滤',
} as const;

/**
 * 获取角色配置
 */
export function getRoleConfig(roleName: string): RoleConfig | undefined {
  return SYSTEM_ROLES.find(role => role.name === roleName);
}

/**
 * 获取角色描述
 */
export function getRoleDescription(roleName: string): string {
  const role = getRoleConfig(roleName);
  return role?.description || roleName;
}

/**
 * 检查是否为新角色
 */
export function isNewRole(roleName: string): boolean {
  return NEW_ROLES.includes(roleName as any);
}

/**
 * 按分类获取角色
 */
export function getRolesByCategory(category: keyof typeof ROLE_CATEGORIES): RoleConfig[] {
  return SYSTEM_ROLES.filter(role => role.category === category);
}

/**
 * 角色权限级别（用于UI显示优先级）
 */
export function getRolePriority(roleName: string): number {
  const index = SYSTEM_ROLES.findIndex(role => role.name === roleName);
  return index >= 0 ? index : 999;
}
