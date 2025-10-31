import { createConnection, Connection } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { DataScope, ScopeType } from '../entities/data-scope.entity';
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { DataScopeType } from '../entities/permission.entity';
import * as bcrypt from 'bcryptjs';

/**
 * 定制化权限初始化脚本
 * 基于实际业务需求：B2B + B2C + 代理商 + 开发者
 *
 * 运行方式：
 * npm run init:permissions:custom
 */

/**
 * 权限定义 - 按业务模块分组
 */
const PERMISSIONS = {
  // ==================== 用户管理 ====================
  user: [
    { action: 'create', description: '创建用户' },
    { action: 'read', description: '查看用户' },
    { action: 'read_sensitive', description: '查看用户敏感信息（完整手机号、邮箱等）' },
    { action: 'update', description: '更新用户信息' },
    { action: 'delete', description: '删除用户' },
    { action: 'ban', description: '禁用/启用用户账号' },
    { action: 'reset_password', description: '重置用户密码' },
    { action: 'export', description: '导出用户数据' },
  ],

  // ==================== 设备管理 ====================
  device: [
    { action: 'create', description: '创建设备' },
    { action: 'read', description: '查看设备' },
    { action: 'update', description: '更新设备配置' },
    { action: 'delete', description: '删除设备' },
    { action: 'control', description: '控制设备（启动/停止/重启）' },
    { action: 'console', description: '访问设备控制台（VNC/ADB）' },
    { action: 'export', description: '导出设备数据' },
  ],

  // ==================== 应用管理 ====================
  app: [
    { action: 'create', description: '上传应用' },
    { action: 'read', description: '查看应用' },
    { action: 'update', description: '更新应用' },
    { action: 'delete', description: '删除应用' },
    { action: 'install', description: '安装应用到设备' },
    { action: 'uninstall', description: '卸载应用' },
    { action: 'export', description: '导出应用列表' },
  ],

  // ==================== 订单管理 ====================
  order: [
    { action: 'create', description: '创建订单' },
    { action: 'read', description: '查看订单' },
    { action: 'update', description: '更新订单' },
    { action: 'cancel', description: '取消订单' },
    { action: 'export', description: '导出订单数据' },
  ],

  // ==================== 账单管理 ====================
  billing: [
    { action: 'create', description: '创建账单' },
    { action: 'read', description: '查看账单' },
    { action: 'read_all', description: '查看所有用户账单（财务）' },
    { action: 'update', description: '修改账单状态' },
    { action: 'delete', description: '删除账单' },
    { action: 'export', description: '导出账单数据（不脱敏）' },
  ],

  // ==================== 支付管理 ====================
  payment: [
    { action: 'create', description: '创建支付' },
    { action: 'read', description: '查看支付记录' },
    { action: 'refund', description: '退款' },
    { action: 'approve_refund', description: '审批退款申请' },
    { action: 'export', description: '导出支付数据' },
  ],

  // ==================== 套餐管理 ====================
  plan: [
    { action: 'create', description: '创建套餐' },
    { action: 'read', description: '查看套餐' },
    { action: 'update', description: '更新套餐' },
    { action: 'delete', description: '删除套餐' },
    { action: 'set_price', description: '设置套餐价格' },
  ],

  // ==================== 工单系统 ====================
  ticket: [
    { action: 'create', description: '创建工单' },
    { action: 'read', description: '查看工单' },
    { action: 'update', description: '更新工单' },
    { action: 'assign', description: '分配工单' },
    { action: 'close', description: '关闭工单' },
    { action: 'export', description: '导出工单数据' },
  ],

  // ==================== 代理商管理 ====================
  agent: [
    { action: 'create', description: '创建代理商' },
    { action: 'read', description: '查看代理商' },
    { action: 'update', description: '更新代理商信息' },
    { action: 'delete', description: '删除代理商' },
    { action: 'set_pricing', description: '设置代理商价格策略' },
  ],

  // ==================== 代理商客户管理 ====================
  agent_customer: [
    { action: 'create', description: '创建客户账号' },
    { action: 'read', description: '查看客户信息' },
    { action: 'update', description: '更新客户信息' },
    { action: 'assign_resource', description: '分配资源给客户' },
  ],

  // ==================== 分润管理 ====================
  commission: [
    { action: 'read', description: '查看分润记录' },
    { action: 'read_all', description: '查看所有代理商分润（财务）' },
    { action: 'withdraw', description: '申请提现' },
    { action: 'approve_withdraw', description: '审批提现申请' },
    { action: 'export', description: '导出分润数据' },
  ],

  // ==================== API 密钥管理 ====================
  api_key: [
    { action: 'create', description: '创建 API 密钥' },
    { action: 'read', description: '查看 API 密钥' },
    { action: 'delete', description: '删除 API 密钥' },
    { action: 'rotate', description: '轮换 API 密钥' },
  ],

  // ==================== API 配额管理 ====================
  api_quota: [
    { action: 'read', description: '查看 API 配额' },
    { action: 'update', description: '更新 API 配额' },
  ],

  // ==================== API 调用日志 ====================
  api_log: [
    { action: 'read', description: '查看 API 调用日志' },
    { action: 'export', description: '导出 API 调用日志' },
  ],

  // ==================== Webhook 管理 ====================
  webhook: [
    { action: 'create', description: '创建 Webhook' },
    { action: 'read', description: '查看 Webhook' },
    { action: 'update', description: '更新 Webhook' },
    { action: 'delete', description: '删除 Webhook' },
    { action: 'test', description: '测试 Webhook' },
  ],

  // ==================== 数据分析 ====================
  analytics: [
    { action: 'read_basic', description: '查看基础数据分析' },
    { action: 'read_advanced', description: '查看高级数据分析' },
    { action: 'read_financial', description: '查看财务数据分析' },
    { action: 'export', description: '导出分析报表' },
  ],

  // ==================== 系统管理 ====================
  system: [
    { action: 'settings_read', description: '查看系统设置' },
    { action: 'settings_update', description: '更新系统设置' },
    { action: 'node_manage', description: '管理设备节点' },
    { action: 'monitor', description: '系统监控' },
  ],

  // ==================== 角色权限管理 ====================
  role: [
    { action: 'create', description: '创建角色' },
    { action: 'read', description: '查看角色' },
    { action: 'update', description: '更新角色' },
    { action: 'delete', description: '删除角色' },
    { action: 'assign', description: '分配角色' },
  ],

  permission: [
    { action: 'create', description: '创建权限' },
    { action: 'read', description: '查看权限' },
    { action: 'update', description: '更新权限' },
    { action: 'delete', description: '删除权限' },
    { action: 'dataScope:list', description: '查看数据范围配置' },
    { action: 'dataScope:create', description: '创建数据范围配置' },
    { action: 'dataScope:update', description: '更新数据范围配置' },
    { action: 'dataScope:delete', description: '删除数据范围配置' },
    { action: 'fieldPermission:list', description: '查看字段权限配置' },
    { action: 'fieldPermission:create', description: '创建字段权限配置' },
    { action: 'fieldPermission:update', description: '更新字段权限配置' },
    { action: 'fieldPermission:delete', description: '删除字段权限配置' },
    { action: 'menu:list', description: '查看菜单权限' },
    { action: 'cache:view', description: '查看权限缓存' },
    { action: 'cache:manage', description: '管理权限缓存' },
  ],

  // ==================== 审计日志 ====================
  audit_log: [
    { action: 'read', description: '查看审计日志' },
    { action: 'export', description: '导出审计日志' },
  ],
};

/**
 * 角色定义
 */
const ROLES = [
  {
    code: 'super_admin',
    name: 'Super Admin',
    description: '超级管理员 - 拥有所有权限，用于平台初始化和紧急维护',
    isSuperAdmin: true,
  },
  {
    code: 'platform_admin',
    name: 'Platform Admin',
    description: '平台管理员 - 负责平台日常运营管理',
    isSuperAdmin: false,
  },
  {
    code: 'finance_manager',
    name: 'Finance Manager',
    description: '财务管理员 - 负责财务数据、账单、分润管理',
    isSuperAdmin: false,
  },
  {
    code: 'operations_manager',
    name: 'Operations Manager',
    description: '运维管理员 - 负责系统运维、设备节点管理',
    isSuperAdmin: false,
  },
  {
    code: 'customer_service',
    name: 'Customer Service',
    description: '客服人员 - 处理用户工单、提供技术支持',
    isSuperAdmin: false,
  },
  {
    code: 'data_analyst',
    name: 'Data Analyst',
    description: '数据分析师 - 查看运营数据、生成分析报表',
    isSuperAdmin: false,
  },
  {
    code: 'agent',
    name: 'Agent',
    description: '代理商 - 管理下级客户、查看分润数据',
    isSuperAdmin: false,
  },
  {
    code: 'developer',
    name: 'Developer',
    description: '开发者 - 通过 API 接入使用云手机服务',
    isSuperAdmin: false,
  },
  {
    code: 'enterprise_user',
    name: 'Enterprise User',
    description: '企业用户 - 企业客户，可管理多个设备',
    isSuperAdmin: false,
  },
  {
    code: 'individual_user',
    name: 'Individual User',
    description: '个人用户 - 个人客户，使用自己的设备',
    isSuperAdmin: false,
  },
];

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],

  platform_admin: [
    // 用户管理
    'user:create',
    'user:read',
    'user:read_sensitive',
    'user:update',
    'user:delete',
    'user:ban',
    'user:reset_password',
    'user:export',
    // 设备管理
    'device:create',
    'device:read',
    'device:update',
    'device:delete',
    'device:control',
    'device:console',
    'device:export',
    // 应用管理
    'app:create',
    'app:read',
    'app:update',
    'app:delete',
    'app:install',
    'app:uninstall',
    'app:export',
    // 订单管理
    'order:read',
    'order:update',
    'order:cancel',
    'order:export',
    // 账单管理
    'billing:read',
    'billing:read_all',
    'billing:export',
    // 支付管理
    'payment:read',
    'payment:refund',
    'payment:export',
    // 套餐管理
    'plan:create',
    'plan:read',
    'plan:update',
    'plan:delete',
    'plan:set_price',
    // 工单管理
    'ticket:read',
    'ticket:update',
    'ticket:assign',
    'ticket:close',
    'ticket:export',
    // 代理商管理
    'agent:create',
    'agent:read',
    'agent:update',
    'agent:delete',
    'agent:set_pricing',
    // 分润管理
    'commission:read_all',
    'commission:approve_withdraw',
    'commission:export',
    // 数据分析
    'analytics:read_basic',
    'analytics:read_advanced',
    'analytics:read_financial',
    'analytics:export',
    // 系统管理
    'system:settings_read',
    'system:settings_update',
    'system:node_manage',
    'system:monitor',
    // 角色权限
    'role:create',
    'role:read',
    'role:update',
    'role:delete',
    'role:assign',
    'permission:read',
    'permission:dataScope:list',
    'permission:fieldPermission:list',
    // 审计日志
    'audit_log:read',
    'audit_log:export',
  ],

  finance_manager: [
    // 查看用户（用于对账）
    'user:read',
    'user:read_sensitive',
    // 订单管理
    'order:read',
    'order:export',
    // 账单管理（核心）
    'billing:read',
    'billing:read_all',
    'billing:update',
    'billing:export',
    // 支付管理（核心）
    'payment:read',
    'payment:refund',
    'payment:approve_refund',
    'payment:export',
    // 分润管理（核心）
    'commission:read_all',
    'commission:approve_withdraw',
    'commission:export',
    // 财务数据分析
    'analytics:read_financial',
    'analytics:export',
    // 审计日志
    'audit_log:read',
    'audit_log:export',
  ],

  operations_manager: [
    // 设备管理（核心）
    'device:read',
    'device:update',
    'device:control',
    'device:console',
    'device:export',
    // 应用管理
    'app:read',
    'app:update',
    'app:install',
    'app:uninstall',
    // 系统管理（核心）
    'system:settings_read',
    'system:settings_update',
    'system:node_manage',
    'system:monitor',
    // 数据分析
    'analytics:read_basic',
    'analytics:read_advanced',
    // 审计日志
    'audit_log:read',
    'audit_log:export',
  ],

  customer_service: [
    // 用户管理（查看+操作）
    'user:read',
    'user:update',
    'user:ban',
    'user:reset_password',
    // 设备管理（查看+操作）
    'device:read',
    'device:update',
    'device:control',
    // 工单管理（核心）
    'ticket:create',
    'ticket:read',
    'ticket:update',
    'ticket:assign',
    'ticket:close',
    // 订单查看
    'order:read',
    // 账单查看
    'billing:read',
    // 基础数据分析
    'analytics:read_basic',
  ],

  data_analyst: [
    // 查看用户数据
    'user:read',
    'user:export',
    // 查看设备数据
    'device:read',
    'device:export',
    // 查看订单数据
    'order:read',
    'order:export',
    // 查看账单数据
    'billing:read',
    'billing:export',
    // 数据分析（核心）
    'analytics:read_basic',
    'analytics:read_advanced',
    'analytics:read_financial',
    'analytics:export',
  ],

  agent: [
    // 客户管理（核心）
    'agent_customer:create',
    'agent_customer:read',
    'agent_customer:update',
    'agent_customer:assign_resource',
    // 查看客户设备
    'device:read',
    // 查看客户订单
    'order:read',
    // 分润管理（核心）
    'commission:read',
    'commission:withdraw',
    // 套餐查看（用于销售）
    'plan:read',
    // 查看自己的数据分析
    'analytics:read_basic',
  ],

  developer: [
    // API 密钥管理（核心）
    'api_key:create',
    'api_key:read',
    'api_key:delete',
    'api_key:rotate',
    // API 配额查看
    'api_quota:read',
    // API 日志
    'api_log:read',
    'api_log:export',
    // Webhook 管理（核心）
    'webhook:create',
    'webhook:read',
    'webhook:update',
    'webhook:delete',
    'webhook:test',
    // 设备管理（通过API）
    'device:create',
    'device:read',
    'device:update',
    'device:delete',
    'device:control',
    // 应用管理
    'app:read',
    'app:install',
    'app:uninstall',
  ],

  enterprise_user: [
    // 设备管理
    'device:create',
    'device:read',
    'device:update',
    'device:delete',
    'device:control',
    'device:console',
    // 应用管理
    'app:read',
    'app:install',
    'app:uninstall',
    // 订单管理
    'order:create',
    'order:read',
    'order:cancel',
    // 账单查看
    'billing:read',
    // 支付
    'payment:create',
    'payment:read',
    // 套餐查看
    'plan:read',
    // 工单
    'ticket:create',
    'ticket:read',
  ],

  individual_user: [
    // 设备管理（限制数量）
    'device:create',
    'device:read',
    'device:update',
    'device:control',
    'device:console',
    // 应用管理
    'app:read',
    'app:install',
    'app:uninstall',
    // 订单管理
    'order:create',
    'order:read',
    // 账单查看
    'billing:read',
    // 支付
    'payment:create',
    'payment:read',
    // 套餐查看
    'plan:read',
    // 工单
    'ticket:create',
    'ticket:read',
  ],
};

/**
 * 初始化权限
 */
async function initPermissions(connection: Connection): Promise<Map<string, Permission>> {
  const permissionRepo = connection.getRepository(Permission);
  const permissionMap = new Map<string, Permission>();

  console.log('🔑 初始化权限...');

  for (const [resource, actions] of Object.entries(PERMISSIONS)) {
    for (const { action, description } of actions) {
      const permissionName = `${resource}:${action}`;

      let permission = await permissionRepo.findOne({
        where: { resource, action },
      });

      if (!permission) {
        permission = permissionRepo.create({
          name: permissionName,
          resource,
          action,
          description,
          scope: DataScopeType.TENANT,
        });
        await permissionRepo.save(permission);
        console.log(`  ✅ 创建权限: ${permissionName}`);
      } else {
        console.log(`  ⏭️  权限已存在: ${permissionName}`);
      }

      permissionMap.set(permissionName, permission);
    }
  }

  console.log(`\n📊 共创建/检查 ${permissionMap.size} 个权限`);
  return permissionMap;
}

/**
 * 初始化角色
 */
async function initRoles(
  connection: Connection,
  permissionMap: Map<string, Permission>
): Promise<Map<string, Role>> {
  const roleRepo = connection.getRepository(Role);
  const roleMap = new Map<string, Role>();

  console.log('\n👥 初始化角色...');

  for (const roleDef of ROLES) {
    let role = await roleRepo.findOne({ where: { name: roleDef.name } });

    if (!role) {
      role = roleRepo.create({
        name: roleDef.name,
        description: roleDef.description,
        permissions: [],
      });
      console.log(`  ✅ 创建角色: ${roleDef.name}`);
    } else {
      console.log(`  ⏭️  角色已存在: ${roleDef.name}`);
    }

    // 分配权限
    const permissionNames = ROLE_PERMISSIONS[roleDef.code] || [];

    if (permissionNames.includes('*')) {
      role.permissions = Array.from(permissionMap.values());
      console.log(`    🌟 分配所有权限 (${role.permissions.length} 个)`);
    } else {
      role.permissions = permissionNames
        .map((name) => permissionMap.get(name))
        .filter((p) => p !== undefined) as Permission[];
      console.log(`    📝 分配 ${role.permissions.length} 个权限`);
    }

    await roleRepo.save(role);
    roleMap.set(roleDef.code, role);
  }

  return roleMap;
}

/**
 * 初始化数据范围配置
 */
async function initDataScopes(connection: Connection, roleMap: Map<string, Role>): Promise<void> {
  const dataScopeRepo = connection.getRepository(DataScope);

  console.log('\n📊 初始化数据范围配置...');

  const dataScopeConfigs = [
    // Super Admin - 全部数据
    { role: 'super_admin', resourceType: 'device', scopeType: ScopeType.ALL },
    { role: 'super_admin', resourceType: 'user', scopeType: ScopeType.ALL },
    { role: 'super_admin', resourceType: 'order', scopeType: ScopeType.ALL },
    { role: 'super_admin', resourceType: 'billing', scopeType: ScopeType.ALL },

    // Platform Admin - 租户数据
    { role: 'platform_admin', resourceType: 'device', scopeType: ScopeType.TENANT },
    { role: 'platform_admin', resourceType: 'user', scopeType: ScopeType.TENANT },
    { role: 'platform_admin', resourceType: 'order', scopeType: ScopeType.TENANT },
    { role: 'platform_admin', resourceType: 'billing', scopeType: ScopeType.TENANT },

    // Finance Manager - 租户数据（财务需要全局视图）
    { role: 'finance_manager', resourceType: 'order', scopeType: ScopeType.TENANT },
    { role: 'finance_manager', resourceType: 'billing', scopeType: ScopeType.TENANT },
    { role: 'finance_manager', resourceType: 'payment', scopeType: ScopeType.TENANT },
    { role: 'finance_manager', resourceType: 'commission', scopeType: ScopeType.TENANT },

    // Operations Manager - 租户数据
    { role: 'operations_manager', resourceType: 'device', scopeType: ScopeType.TENANT },

    // Customer Service - 租户数据（需要协助所有用户）
    { role: 'customer_service', resourceType: 'user', scopeType: ScopeType.TENANT },
    { role: 'customer_service', resourceType: 'device', scopeType: ScopeType.TENANT },
    { role: 'customer_service', resourceType: 'ticket', scopeType: ScopeType.TENANT },

    // Data Analyst - 租户数据
    { role: 'data_analyst', resourceType: 'user', scopeType: ScopeType.TENANT },
    { role: 'data_analyst', resourceType: 'device', scopeType: ScopeType.TENANT },
    { role: 'data_analyst', resourceType: 'order', scopeType: ScopeType.TENANT },

    // Agent - 本人数据（只能看自己的客户）
    { role: 'agent', resourceType: 'agent_customer', scopeType: ScopeType.SELF },
    {
      role: 'agent',
      resourceType: 'device',
      scopeType: ScopeType.CUSTOM,
      filter: { agentId: '$userId' }, // 自定义过滤器，只看自己客户的设备
      description: '代理商只能查看自己客户的设备',
    },
    {
      role: 'agent',
      resourceType: 'order',
      scopeType: ScopeType.CUSTOM,
      filter: { agentId: '$userId' },
      description: '代理商只能查看自己客户的订单',
    },
    { role: 'agent', resourceType: 'commission', scopeType: ScopeType.SELF },

    // Developer - 本人数据
    { role: 'developer', resourceType: 'device', scopeType: ScopeType.SELF },
    { role: 'developer', resourceType: 'api_key', scopeType: ScopeType.SELF },
    { role: 'developer', resourceType: 'webhook', scopeType: ScopeType.SELF },

    // Enterprise User - 本人数据
    { role: 'enterprise_user', resourceType: 'device', scopeType: ScopeType.SELF },
    { role: 'enterprise_user', resourceType: 'order', scopeType: ScopeType.SELF },
    { role: 'enterprise_user', resourceType: 'billing', scopeType: ScopeType.SELF },

    // Individual User - 本人数据
    { role: 'individual_user', resourceType: 'device', scopeType: ScopeType.SELF },
    { role: 'individual_user', resourceType: 'order', scopeType: ScopeType.SELF },
    { role: 'individual_user', resourceType: 'billing', scopeType: ScopeType.SELF },
  ];

  for (const config of dataScopeConfigs) {
    const role = roleMap.get(config.role);
    if (!role) continue;

    const existing = await dataScopeRepo.findOne({
      where: { roleId: role.id, resourceType: config.resourceType },
    });

    if (!existing) {
      const dataScope = dataScopeRepo.create({
        roleId: role.id,
        resourceType: config.resourceType,
        scopeType: config.scopeType,
        filter: config.filter,
        description: config.description,
        priority: 100,
        isActive: true,
      });
      await dataScopeRepo.save(dataScope);
      console.log(`  ✅ ${config.role} - ${config.resourceType} (${config.scopeType})`);
    }
  }
}

/**
 * 字段权限配置接口
 */
interface FieldPermConfig {
  role: string;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldTransforms?: Record<string, any>;
  description?: string;
}

/**
 * 初始化字段权限配置（分级脱敏）
 */
async function initFieldPermissions(
  connection: Connection,
  roleMap: Map<string, Role>
): Promise<void> {
  const fieldPermRepo = connection.getRepository(FieldPermission);

  console.log('\n🔒 初始化字段权限配置（分级脱敏）...');

  const fieldPermConfigs: FieldPermConfig[] = [
    // ==================== 用户信息 - 分级脱敏 ====================

    // Super Admin - 查看完整信息
    {
      role: 'super_admin',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt'],
      description: '超级管理员查看用户（完整信息）',
    },

    // Platform Admin - 查看完整信息
    {
      role: 'platform_admin',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt'],
      description: '平台管理员查看用户（完整信息）',
    },

    // Finance Manager - 部分脱敏
    {
      role: 'finance_manager',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt', 'twoFactorSecret'],
      fieldTransforms: {
        phone: { type: 'mask', pattern: '{3}****{4}' }, // 138****5678
      },
      description: '财务管理员查看用户（手机号部分脱敏）',
    },

    // Customer Service - 更多脱敏
    {
      role: 'customer_service',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt', 'twoFactorSecret'],
      fieldTransforms: {
        phone: { type: 'mask', pattern: '***-****-{4}' }, // ***-****-5678
        email: { type: 'mask', pattern: '{3}***@***' }, // use***@***
        idCard: { type: 'mask', pattern: '{6}********{4}' }, // 110101********1234
      },
      description: '客服查看用户（敏感信息脱敏）',
    },

    // Data Analyst - 完全脱敏
    {
      role: 'data_analyst',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt', 'twoFactorSecret'],
      fieldTransforms: {
        phone: { type: 'hash' }, // ***HASHED***
        email: { type: 'hash' }, // ***HASHED***
        idCard: { type: 'hash' }, // ***HASHED***
        realName: { type: 'hash' }, // ***HASHED***
      },
      description: '数据分析师查看用户（完全脱敏）',
    },

    // Agent - 查看自己客户，部分脱敏
    {
      role: 'agent',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt', 'twoFactorSecret'],
      fieldTransforms: {
        phone: { type: 'mask', pattern: '***-****-{4}' },
        email: { type: 'mask', pattern: '{3}***@***' },
      },
      description: '代理商查看客户（敏感信息脱敏）',
    },

    // ==================== 财务数据 - 导出不脱敏 ====================

    // Finance Manager - 导出完整数据
    {
      role: 'finance_manager',
      resourceType: 'billing',
      operation: OperationType.EXPORT,
      description: '财务管理员导出账单（完整数据，不脱敏）',
    },

    {
      role: 'finance_manager',
      resourceType: 'order',
      operation: OperationType.EXPORT,
      description: '财务管理员导出订单（完整数据，不脱敏）',
    },

    // ==================== 设备信息 ====================

    // Individual User - 创建设备
    {
      role: 'individual_user',
      resourceType: 'device',
      operation: OperationType.CREATE,
      requiredFields: ['name', 'planId'],
      writableFields: ['name', 'planId', 'description'],
      hiddenFields: ['internalIp', 'nodeId', 'containerId'],
      description: '个人用户创建设备',
    },

    // Operations Manager - 查看设备完整信息
    {
      role: 'operations_manager',
      resourceType: 'device',
      operation: OperationType.VIEW,
      description: '运维管理员查看设备（包含内部信息）',
    },

    // Enterprise User - 查看设备（隐藏内部信息）
    {
      role: 'enterprise_user',
      resourceType: 'device',
      operation: OperationType.VIEW,
      hiddenFields: ['internalIp', 'nodeId', 'containerId'],
      description: '企业用户查看设备（隐藏内部信息）',
    },
  ];

  for (const config of fieldPermConfigs) {
    const role = roleMap.get(config.role);
    if (!role) continue;

    const existing = await fieldPermRepo.findOne({
      where: {
        roleId: role.id,
        resourceType: config.resourceType,
        operation: config.operation,
      },
    });

    if (!existing) {
      const fieldPerm = fieldPermRepo.create({
        roleId: role.id,
        resourceType: config.resourceType,
        operation: config.operation,
        hiddenFields: config.hiddenFields,
        readOnlyFields: config.readOnlyFields,
        writableFields: config.writableFields,
        requiredFields: config.requiredFields,
        fieldTransforms: config.fieldTransforms,
        description: config.description,
        priority: 100,
        isActive: true,
      });
      await fieldPermRepo.save(fieldPerm);
      console.log(`  ✅ ${config.role} - ${config.resourceType} - ${config.operation}`);
    }
  }
}

/**
 * 创建测试账号
 */
async function createTestAccounts(
  connection: Connection,
  roleMap: Map<string, Role>
): Promise<void> {
  const userRepo = connection.getRepository(User);

  console.log('\n👤 创建测试账号...');

  const testAccounts = [
    {
      username: 'admin',
      email: 'admin@cloudphone.com',
      password: 'admin123',
      phone: '13800138000',
      role: 'super_admin',
      isSuperAdmin: true,
    },
    {
      username: 'platform_admin',
      email: 'platform@cloudphone.com',
      password: 'platform123',
      phone: '13800138001',
      role: 'platform_admin',
    },
    {
      username: 'finance',
      email: 'finance@cloudphone.com',
      password: 'finance123',
      phone: '13800138002',
      role: 'finance_manager',
    },
    {
      username: 'operations',
      email: 'ops@cloudphone.com',
      password: 'ops123',
      phone: '13800138003',
      role: 'operations_manager',
    },
    {
      username: 'support',
      email: 'support@cloudphone.com',
      password: 'support123',
      phone: '13800138004',
      role: 'customer_service',
    },
    {
      username: 'analyst',
      email: 'analyst@cloudphone.com',
      password: 'analyst123',
      phone: '13800138005',
      role: 'data_analyst',
    },
    {
      username: 'agent001',
      email: 'agent001@cloudphone.com',
      password: 'agent123',
      phone: '13800138006',
      role: 'agent',
    },
    {
      username: 'developer',
      email: 'dev@cloudphone.com',
      password: 'dev123',
      phone: '13800138007',
      role: 'developer',
    },
    {
      username: 'enterprise_user',
      email: 'enterprise@cloudphone.com',
      password: 'enterprise123',
      phone: '13800138008',
      role: 'enterprise_user',
    },
    {
      username: 'user',
      email: 'user@cloudphone.com',
      password: 'user123',
      phone: '13800138009',
      role: 'individual_user',
    },
  ];

  for (const account of testAccounts) {
    const existing = await userRepo.findOne({ where: { username: account.username } });

    if (!existing) {
      const role = roleMap.get(account.role);
      if (!role) continue;

      const hashedPassword = await bcrypt.hash(account.password, 10);

      const user = userRepo.create({
        username: account.username,
        email: account.email,
        password: hashedPassword,
        phone: account.phone,
        isSuperAdmin: account.isSuperAdmin || false,
        dataScope: account.isSuperAdmin ? 'all' : 'tenant',
        roles: [role],
      });

      await userRepo.save(user);
      console.log(`  ✅ ${account.username} / ${account.password} (${role.name})`);
    } else {
      console.log(`  ⏭️  ${account.username} 已存在`);
    }
  }

  console.log('\n⚠️  请在生产环境中立即修改所有测试账号的密码！');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始初始化定制化权限系统...\n');
  console.log('业务场景：B2B + B2C + 代理商 + 开发者');
  console.log('组织架构：扁平化（无部门层级）');
  console.log('数据安全：分级脱敏\n');

  let connection: Connection | undefined;

  try {
    connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'cloudphone_user',
      entities: [Permission, Role, DataScope, FieldPermission, User],
      synchronize: false,
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 初始化权限
    const permissionMap = await initPermissions(connection);

    // 2. 初始化角色并分配权限
    const roleMap = await initRoles(connection, permissionMap);

    // 3. 初始化数据范围配置
    await initDataScopes(connection, roleMap);

    // 4. 初始化字段权限配置（分级脱敏）
    await initFieldPermissions(connection, roleMap);

    // 5. 创建测试账号
    await createTestAccounts(connection, roleMap);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 定制化权限系统初始化完成！');
    console.log('='.repeat(60));
    console.log('\n📊 统计信息:');
    console.log(`  - 权限数量: ${permissionMap.size}`);
    console.log(`  - 角色数量: ${roleMap.size}`);
    console.log(`  - 数据范围配置: ${await connection.getRepository(DataScope).count()}`);
    console.log(`  - 字段权限配置: ${await connection.getRepository(FieldPermission).count()}`);
    console.log(`  - 测试账号数: 10 个`);

    console.log('\n📝 测试账号列表:');
    console.log('  1. admin / admin123 (Super Admin)');
    console.log('  2. platform_admin / platform123 (Platform Admin)');
    console.log('  3. finance / finance123 (Finance Manager)');
    console.log('  4. operations / ops123 (Operations Manager)');
    console.log('  5. support / support123 (Customer Service)');
    console.log('  6. analyst / analyst123 (Data Analyst)');
    console.log('  7. agent001 / agent123 (Agent)');
    console.log('  8. developer / dev123 (Developer)');
    console.log('  9. enterprise_user / enterprise123 (Enterprise User)');
    console.log('  10. user / user123 (Individual User)');

    await connection.close();
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    if (connection) {
      await connection.close();
    }
    process.exit(1);
  }
}

main();
