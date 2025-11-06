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
 * 权限初始化脚本
 * 创建默认角色、权限、数据范围和字段权限配置
 *
 * 运行方式：
 * npm run init:permissions
 * 或
 * ts-node src/scripts/init-permissions.ts
 */

/**
 * 默认权限定义
 */
const DEFAULT_PERMISSIONS = [
  // 用户管理权限
  { resource: 'user', action: 'create', description: '创建用户' },
  { resource: 'user', action: 'read', description: '查看用户' },
  { resource: 'user', action: 'update', description: '更新用户' },
  { resource: 'user', action: 'delete', description: '删除用户' },
  { resource: 'user', action: 'export', description: '导出用户数据' },

  // 设备管理权限
  { resource: 'device', action: 'create', description: '创建设备' },
  { resource: 'device', action: 'read', description: '查看设备' },
  { resource: 'device', action: 'update', description: '更新设备' },
  { resource: 'device', action: 'delete', description: '删除设备' },
  { resource: 'device', action: 'control', description: '控制设备' },
  { resource: 'device', action: 'manage', description: '管理设备（综合权限）' },
  { resource: 'device', action: 'export', description: '导出设备数据' },
  { resource: 'device', action: 'app-operate', description: '应用操作（启动/停止/清除数据）' },
  { resource: 'device', action: 'snapshot-create', description: '创建设备快照' },
  { resource: 'device', action: 'snapshot-restore', description: '恢复设备快照' },
  { resource: 'device', action: 'snapshot-delete', description: '删除设备快照' },

  // 应用管理权限
  { resource: 'app', action: 'create', description: '创建应用' },
  { resource: 'app', action: 'read', description: '查看应用' },
  { resource: 'app', action: 'update', description: '更新应用' },
  { resource: 'app', action: 'delete', description: '删除应用' },
  { resource: 'app', action: 'install', description: '安装应用' },
  { resource: 'app', action: 'uninstall', description: '卸载应用' },
  { resource: 'app', action: 'approve', description: '审批应用' },

  // 订单管理权限
  { resource: 'order', action: 'create', description: '创建订单' },
  { resource: 'order', action: 'read', description: '查看订单' },
  { resource: 'order', action: 'update', description: '更新订单' },
  { resource: 'order', action: 'cancel', description: '取消订单' },
  { resource: 'order', action: 'export', description: '导出订单数据' },

  // 账单管理权限
  { resource: 'billing', action: 'create', description: '创建账单' },
  { resource: 'billing', action: 'read', description: '查看账单' },
  { resource: 'billing', action: 'update', description: '更新账单' },
  { resource: 'billing', action: 'delete', description: '删除账单' },
  { resource: 'billing', action: 'export', description: '导出账单数据' },

  // 支付管理权限
  { resource: 'payment', action: 'create', description: '创建支付' },
  { resource: 'payment', action: 'read', description: '查看支付' },
  { resource: 'payment', action: 'refund', description: '退款' },

  // 套餐管理权限
  { resource: 'plan', action: 'create', description: '创建套餐' },
  { resource: 'plan', action: 'read', description: '查看套餐' },
  { resource: 'plan', action: 'update', description: '更新套餐' },
  { resource: 'plan', action: 'delete', description: '删除套餐' },

  // 角色权限管理
  { resource: 'role', action: 'create', description: '创建角色' },
  { resource: 'role', action: 'read', description: '查看角色' },
  { resource: 'role', action: 'update', description: '更新角色' },
  { resource: 'role', action: 'delete', description: '删除角色' },
  { resource: 'role', action: 'assign', description: '分配角色' },

  // 权限管理
  { resource: 'permission', action: 'create', description: '创建权限' },
  { resource: 'permission', action: 'read', description: '查看权限' },
  { resource: 'permission', action: 'update', description: '更新权限' },
  { resource: 'permission', action: 'delete', description: '删除权限' },
  { resource: 'permission', action: 'assign', description: '分配权限' },

  // 数据范围管理
  { resource: 'permission', action: 'dataScope-list', description: '查看数据范围配置' },
  { resource: 'permission', action: 'dataScope-create', description: '创建数据范围配置' },
  { resource: 'permission', action: 'dataScope-update', description: '更新数据范围配置' },
  { resource: 'permission', action: 'dataScope-delete', description: '删除数据范围配置' },

  // 字段权限管理
  {
    resource: 'permission',
    action: 'fieldPermission-list',
    description: '查看字段权限配置',
  },
  {
    resource: 'permission',
    action: 'fieldPermission-create',
    description: '创建字段权限配置',
  },
  {
    resource: 'permission',
    action: 'fieldPermission-update',
    description: '更新字段权限配置',
  },
  {
    resource: 'permission',
    action: 'fieldPermission-delete',
    description: '删除字段权限配置',
  },

  // 菜单权限管理
  { resource: 'permission', action: 'menu-list', description: '查看菜单权限' },
  { resource: 'permission', action: 'menu-view', description: '查看用户菜单' },

  // 审计日志权限（统一使用 audit-log 格式）
  { resource: 'audit-log', action: 'read', description: '查看审计日志' },
  { resource: 'audit-log', action: 'export', description: '导出审计日志' },
  { resource: 'audit-log', action: 'search', description: '搜索审计日志' },
  { resource: 'audit-log', action: 'user-view', description: '查看用户审计日志' },
  { resource: 'audit-log', action: 'resource-view', description: '查看资源审计日志' },
  { resource: 'audit-log', action: 'stats', description: '审计日志统计' },

  // 系统设置权限
  { resource: 'system', action: 'settings-read', description: '查看系统设置' },
  { resource: 'system', action: 'settings-update', description: '更新系统设置' },

  // 缓存管理权限
  { resource: 'permission', action: 'cache-view', description: '查看权限缓存' },
  { resource: 'permission', action: 'cache-manage', description: '管理权限缓存' },

  // ========== 新增服务权限 ==========

  // Proxy Service - 代理管理服务
  { resource: 'proxy', action: 'acquire', description: '获取代理IP' },
  { resource: 'proxy', action: 'list', description: '查看代理列表' },
  { resource: 'proxy', action: 'read', description: '查看代理详情' },
  { resource: 'proxy', action: 'assign', description: '分配代理' },
  { resource: 'proxy', action: 'release', description: '释放代理' },
  { resource: 'proxy', action: 'report', description: '报告代理状态' },
  { resource: 'proxy', action: 'stats', description: '查看代理统计' },
  { resource: 'proxy', action: 'refresh', description: '刷新代理池（管理员）' },
  { resource: 'proxy', action: 'strategy', description: '设置代理策略（管理员）' },
  { resource: 'proxy', action: 'health', description: '查看健康状态' },

  // SMS Receive Service - 短信验证码服务
  { resource: 'sms', action: 'request', description: '请求虚拟号码' },
  { resource: 'sms', action: 'read', description: '查看号码信息' },
  { resource: 'sms', action: 'cancel', description: '取消号码' },
  { resource: 'sms', action: 'batch', description: '批量号码操作' },
  { resource: 'sms', action: 'messages', description: '查看验证码消息' },
  { resource: 'sms', action: 'stats', description: '查看SMS统计' },
  { resource: 'sms', action: 'trigger-poll', description: '触发轮询（管理员）' },
  { resource: 'sms', action: 'provider-stats', description: '查看供应商统计' },

  // SMS 通知服务 - 短信发送功能 (notification-service)
  { resource: 'sms', action: 'send', description: '发送单条短信' },
  { resource: 'sms', action: 'send-batch', description: '批量发送短信' },
  { resource: 'sms', action: 'validate', description: '验证手机号格式' },

  // SMS OTP 验证码功能
  { resource: 'sms', action: 'otp-send', description: '发送OTP验证码' },
  { resource: 'sms', action: 'otp-verify', description: '验证OTP验证码' },
  { resource: 'sms', action: 'otp-active', description: '检查活跃OTP' },
  { resource: 'sms', action: 'otp-retries', description: '查看OTP重试次数' },
  { resource: 'sms', action: 'otp-stats', description: '查看OTP统计' },
  { resource: 'sms', action: 'otp-clear', description: '清除OTP（管理员）' },

  // Notification Service - 通知服务
  { resource: 'notification', action: 'create', description: '创建通知' },
  { resource: 'notification', action: 'broadcast', description: '广播通知' },
  { resource: 'notification', action: 'read', description: '查看通知' },
  { resource: 'notification', action: 'update', description: '更新通知状态' },
  { resource: 'notification', action: 'delete', description: '删除通知' },
  { resource: 'notification', action: 'batch-delete', description: '批量删除通知' },
  { resource: 'notification', action: 'stats', description: '查看通知统计' },
  { resource: 'notification', action: 'unread-count', description: '查看未读数量' },

  // Notification Preferences - 通知偏好
  { resource: 'notification', action: 'preference-read', description: '查看通知偏好' },
  { resource: 'notification', action: 'preference-update', description: '更新通知偏好' },
  { resource: 'notification', action: 'preference-reset', description: '重置通知偏好' },
  { resource: 'notification', action: 'preference-batch', description: '批量更新通知偏好' },

  // Notification Templates - 通知模板（管理员）
  { resource: 'notification', action: 'template-create', description: '创建通知模板' },
  { resource: 'notification', action: 'template-read', description: '查看通知模板' },
  { resource: 'notification', action: 'template-update', description: '更新通知模板' },
  { resource: 'notification', action: 'template-delete', description: '删除通知模板' },
  { resource: 'notification', action: 'template-toggle', description: '启用/禁用模板' },
  { resource: 'notification', action: 'template-render', description: '渲染模板' },

  // Media Service - 媒体流服务（WebRTC）
  { resource: 'media', action: 'stream-create', description: '创建媒体流' },
  { resource: 'media', action: 'stream-view', description: '查看媒体流' },
  { resource: 'media', action: 'stream-control', description: '控制媒体流' },
  { resource: 'media', action: 'stream-close', description: '关闭媒体流' },
  { resource: 'media', action: 'record-start', description: '开始屏幕录制' },
  { resource: 'media', action: 'record-stop', description: '停止屏幕录制' },
  { resource: 'media', action: 'record-list', description: '查看录制列表' },
  { resource: 'media', action: 'record-download', description: '下载录制文件' },
  { resource: 'media', action: 'stats', description: '查看媒体统计' },

  // 事件管理权限（Event Sourcing）
  { resource: 'event', action: 'read', description: '查看事件' },
  { resource: 'event', action: 'replay', description: '重放事件' },
  { resource: 'event', action: 'view-store', description: '查看事件存储' },
];

/**
 * 默认角色定义
 */
const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    code: 'super_admin',
    description: '超级管理员，拥有所有权限',
    isSuperAdmin: true,
  },
  {
    name: 'Admin',
    code: 'admin',
    description: '管理员，拥有大部分管理权限',
    isSuperAdmin: false,
  },
  {
    name: 'Device Manager',
    code: 'device_manager',
    description: '设备管理员，负责设备和应用管理',
    isSuperAdmin: false,
  },
  {
    name: 'User Manager',
    code: 'user_manager',
    description: '用户管理员，负责用户管理',
    isSuperAdmin: false,
  },
  {
    name: 'Finance Manager',
    code: 'finance_manager',
    description: '财务管理员，负责订单、账单、支付管理',
    isSuperAdmin: false,
  },
  {
    name: 'User',
    code: 'user',
    description: '普通用户，只能查看和使用自己的资源',
    isSuperAdmin: false,
  },
];

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  super_admin: ['*'], // 通配符，代表所有权限
  admin: [
    // 用户管理
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:export',
    // 设备管理
    'device:create',
    'device:read',
    'device:update',
    'device:delete',
    'device:control',
    'device:manage', // 新增：设备管理综合权限
    'device:export',
    'device:app-operate',
    'device:snapshot-create',
    'device:snapshot-restore',
    'device:snapshot-delete',
    // 应用管理
    'app:create',
    'app:read',
    'app:update',
    'app:delete',
    'app:install',
    'app:uninstall',
    'app:approve',
    // 订单管理
    'order:create',
    'order:read',
    'order:update',
    'order:cancel',
    'order:export',
    // 账单管理
    'billing:read',
    'billing:export',
    // 支付管理
    'payment:create',
    'payment:read',
    'payment:refund',
    // 套餐管理
    'plan:create',
    'plan:read',
    'plan:update',
    'plan:delete',
    // 角色权限管理
    'role:create',
    'role:read',
    'role:update',
    'role:delete',
    'role:assign',
    'permission:read',
    'permission:dataScope-list',
    'permission:fieldPermission-list',
    'permission:menu-list',
    // 审计日志（统一使用 audit-log 格式）
    'audit-log:read',
    'audit-log:export',
    'audit-log:search',
    'audit-log:user-view',
    'audit-log:resource-view',
    'audit-log:stats',
    // ========== 新增服务权限 ==========
    // Proxy Service - 代理管理
    'proxy:acquire',
    'proxy:list',
    'proxy:read',
    'proxy:assign',
    'proxy:release',
    'proxy:report',
    'proxy:stats',
    'proxy:refresh',
    'proxy:strategy',
    'proxy:health',
    // SMS Receive Service - 短信服务
    'sms:request',
    'sms:read',
    'sms:cancel',
    'sms:batch',
    'sms:messages',
    'sms:stats',
    'sms:trigger-poll',
    'sms:provider-stats',
    // SMS 发送和OTP功能
    'sms:send',
    'sms:send-batch',
    'sms:validate',
    'sms:otp-send',
    'sms:otp-verify',
    'sms:otp-active',
    'sms:otp-retries',
    'sms:otp-stats',
    'sms:otp-clear',
    // Notification Service - 通知服务
    'notification:create',
    'notification:broadcast',
    'notification:read',
    'notification:update',
    'notification:delete',
    'notification:batch-delete',
    'notification:stats',
    'notification:unread-count',
    'notification:preference-read',
    'notification:preference-update',
    'notification:preference-reset',
    'notification:preference-batch',
    'notification:template-create',
    'notification:template-read',
    'notification:template-update',
    'notification:template-delete',
    'notification:template-toggle',
    'notification:template-render',
    // Media Service - 媒体服务
    'media:stream-create',
    'media:stream-view',
    'media:stream-control',
    'media:stream-close',
    'media:record-start',
    'media:record-stop',
    'media:record-list',
    'media:record-download',
    'media:stats',
    // Event Sourcing - 事件管理
    'event:read', // 新增：查看事件
    'event:view-store', // 新增：查看事件存储
  ],
  device_manager: [
    // 设备管理完整权限
    'device:create',
    'device:read',
    'device:update',
    'device:delete',
    'device:control',
    'device:manage', // 新增：设备管理综合权限
    'device:export',
    'device:app-operate',
    'device:snapshot-create',
    'device:snapshot-restore',
    'device:snapshot-delete',
    // 应用管理权限
    'app:create',
    'app:read',
    'app:update',
    'app:delete',
    'app:install',
    'app:uninstall',
    'app:approve', // 新增：应用审批权限
    // 代理服务权限
    'proxy:acquire',
    'proxy:list',
    'proxy:read',
    'proxy:assign',
    'proxy:release',
    'proxy:report', // 新增：代理状态报告
    'proxy:stats',
    // SMS 设备短信服务权限
    'sms:request', // 新增：为设备请求短信号码
    'sms:read',
    'sms:cancel',
    'sms:batch', // 新增：批量操作
    'sms:messages',
    'sms:stats',
    // 媒体服务权限
    'media:stream-create',
    'media:stream-view',
    'media:stream-control',
    'media:stream-close', // 新增：关闭媒体流
    'media:record-start',
    'media:record-stop',
    'media:record-list',
    'media:record-download', // 新增：下载录制文件
    'media:stats', // 新增：查看媒体统计
    // 通知权限（设备相关通知）
    'notification:read',
    'notification:unread-count',
  ],
  user_manager: [
    // 用户管理完整权限
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:export',
    'user:list',
    // 角色与权限管理
    'role:create',
    'role:read',
    'role:update',
    'role:delete',
    'role:list',
    'permission:read',
    'permission:menu-list',
    'permission:menu-view',
    // 工单管理（客户支持）
    'ticket:create',
    'ticket:read',
    'ticket:update',
    'ticket:list',
    'ticket:reply',
    'ticket:stats',
    // API密钥管理
    'api-key:create',
    'api-key:read',
    'api-key:update',
    'api-key:delete',
    'api-key:revoke',
    'api-key:list',
    'api-key:stats',
    // 审计日志查看
    'audit-log:search',
    'audit-log:user-view',
    'audit-log:resource-view',
    'audit-log:stats',
    // 通知模板管理
    'notification:template-create',
    'notification:template-read',
    'notification:template-update',
    'notification:template-delete',
    'notification:template-toggle',
    'notification:list',
    'notification:create', // 可以创建系统通知
    'notification:broadcast', // 可以广播通知
    // 用户配额查看
    'quota:read',
    'quota:usage-view',
    'quota:alert-view',
    // 统计信息查看
    'stats:user-today',
    'stats:user-activity',
    'stats:user-growth',
  ],
  finance_manager: [
    // 订单管理
    'order:read',
    'order:update',
    'order:cancel',
    'order:export',
    // 账单与计费
    'billing:read',
    'billing:create',
    'billing:update',
    'billing:export',
    'billing:stats',
    'billing:orders',
    'billing:order-cancel',
    'billing:usage-view',
    'billing:usage-start',
    // 支付管理完整权限
    'payment:create',
    'payment:read',
    'payment:list',
    'payment:query',
    'payment:refund',
    'payment:refunds',
    'payment:refund-approve', // 新增：审批退款
    'payment:refund-reject', // 新增：拒绝退款
    'payment:refund-pending', // 新增：查看待处理退款
    'payment:exception-list', // 新增：异常支付查看
    'payment:sync', // 新增：同步支付状态
    'payment:export', // 新增：导出支付记录
    'payment:config', // 新增：查看支付配置
    'payment:stats',
    'payment:daily-stats',
    'payment:method-stats',
    // 发票管理
    'invoice:create',
    'invoice:read',
    'invoice:publish',
    'invoice:pay',
    'invoice:cancel',
    'invoice:list',
    'invoice:stats',
    // 余额管理
    'balance:create',
    'balance:read',
    'balance:recharge',
    'balance:consume',
    'balance:freeze',
    'balance:unfreeze',
    'balance:adjust',
    'balance:transactions',
    'balance:stats',
    // 套餐管理
    'plan:read',
    // 用量计费查看
    'metering:user-view',
    'metering:device-view',
    'metering:tenant-view',
    // 财务报表
    'report:bills',
    'report:revenue',
    'report:usage-trend',
    'report:bills-export',
    'report:revenue-export',
    'report:plan-stats',
    // 账单规则查看
    'billing-rule:read',
    'billing-rule:list',
    'billing-rule:calculate',
    // 统计仪表盘
    'stats:dashboard',
    'stats:revenue-today',
    'stats:revenue-month',
    'stats:revenue-trend',
    'stats:plan-distribution',
    // 配额查看（财务需要了解用量）
    'quota:read',
    'quota:usage-view',
    'quota:alert-view',
  ],
  user: [
    'device:read',
    'device:create', // ✅ 添加设备创建权限（SaaS 核心功能）
    'device:control',
    'app:read',
    'app:install',
    'app:uninstall',
    'order:create',
    'order:read',
    'billing:read',
    'payment:create',
    'payment:read',
    'plan:read',
    // 新增：用户可用的基本服务权限
    'proxy:acquire', // 用户可以为自己的设备获取代理
    'proxy:read',
    'sms:request', // 用户可以为自己的设备请求短信号码
    'sms:read',
    'sms:messages',
    'sms:cancel',
    'sms:otp-send', // 用户可以发送OTP验证码
    'sms:otp-verify', // 用户可以验证OTP
    'sms:otp-active', // 用户可以检查活跃OTP
    'sms:otp-retries', // 用户可以查看重试次数
    'notification:read', // 用户可以查看自己的通知
    'notification:update',
    'notification:delete',
    'notification:unread-count',
    'notification:preference-read',
    'notification:preference-update',
    'media:stream-view', // 用户可以查看自己设备的媒体流
    'media:record-start',
    'media:record-stop',
    'media:record-list',
  ],
};

/**
 * 初始化权限
 */
async function initPermissions(connection: Connection): Promise<Map<string, Permission>> {
  const permissionRepo = connection.getRepository(Permission);
  const permissionMap = new Map<string, Permission>();

  console.log('🔑 初始化权限...');

  for (const permDef of DEFAULT_PERMISSIONS) {
    const permissionName = `${permDef.resource}:${permDef.action}`;

    // 检查是否已存在
    let permission = await permissionRepo.findOne({
      where: { resource: permDef.resource, action: permDef.action },
    });

    if (!permission) {
      permission = permissionRepo.create({
        name: permissionName,
        resource: permDef.resource,
        action: permDef.action,
        description: permDef.description,
        scope: DataScopeType.TENANT,
      });
      await permissionRepo.save(permission);
      console.log(`  ✅ 创建权限: ${permissionName}`);
    } else {
      console.log(`  ⏭️  权限已存在: ${permissionName}`);
    }

    permissionMap.set(permissionName, permission);
  }

  // 🔍 加载数据库中所有其他现有权限（不在 DEFAULT_PERMISSIONS 中的权限）
  console.log('\n🔍 加载数据库中的所有现有权限...');
  const allPermissions = await permissionRepo.find();
  let loadedCount = 0;

  for (const permission of allPermissions) {
    const permissionName = `${permission.resource}:${permission.action}`;
    if (!permissionMap.has(permissionName)) {
      permissionMap.set(permissionName, permission);
      loadedCount++;
    }
  }

  if (loadedCount > 0) {
    console.log(`  ✅ 从数据库加载了 ${loadedCount} 个额外权限`);
  }
  console.log(`  📊 总计: ${permissionMap.size} 个权限可用于分配`);

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

  for (const roleDef of DEFAULT_ROLES) {
    // 检查是否已存在
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
    const permissionNames = ROLE_PERMISSIONS_MAP[roleDef.code] || [];

    if (permissionNames.includes('*')) {
      // Super Admin - 所有权限
      role.permissions = Array.from(permissionMap.values());
      console.log(`    🌟 分配所有权限 (Super Admin)`);
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
    {
      role: 'super_admin',
      resourceType: 'device',
      scopeType: ScopeType.ALL,
      description: '超级管理员可访问所有设备数据',
    },
    {
      role: 'super_admin',
      resourceType: 'user',
      scopeType: ScopeType.ALL,
      description: '超级管理员可访问所有用户数据',
    },

    // Admin - 租户数据
    {
      role: 'admin',
      resourceType: 'device',
      scopeType: ScopeType.TENANT,
      description: '管理员可访问本租户所有设备',
    },
    {
      role: 'admin',
      resourceType: 'user',
      scopeType: ScopeType.TENANT,
      description: '管理员可访问本租户所有用户',
    },
    {
      role: 'admin',
      resourceType: 'order',
      scopeType: ScopeType.TENANT,
      description: '管理员可访问本租户所有订单',
    },

    // Device Manager - 部门数据
    {
      role: 'device_manager',
      resourceType: 'device',
      scopeType: ScopeType.DEPARTMENT,
      includeSubDepartments: true,
      description: '设备管理员可访问本部门及子部门设备',
    },

    // User Manager - 部门数据
    {
      role: 'user_manager',
      resourceType: 'user',
      scopeType: ScopeType.DEPARTMENT,
      includeSubDepartments: true,
      description: '用户管理员可访问本部门及子部门用户',
    },

    // Finance Manager - 租户数据
    {
      role: 'finance_manager',
      resourceType: 'order',
      scopeType: ScopeType.TENANT,
      description: '财务管理员可访问本租户所有订单',
    },
    {
      role: 'finance_manager',
      resourceType: 'billing',
      scopeType: ScopeType.TENANT,
      description: '财务管理员可访问本租户所有账单',
    },

    // User - 本人数据
    {
      role: 'user',
      resourceType: 'device',
      scopeType: ScopeType.SELF,
      description: '普通用户只能访问自己的设备',
    },
    {
      role: 'user',
      resourceType: 'order',
      scopeType: ScopeType.SELF,
      description: '普通用户只能访问自己的订单',
    },
    {
      role: 'user',
      resourceType: 'billing',
      scopeType: ScopeType.SELF,
      description: '普通用户只能访问自己的账单',
    },
  ];

  for (const config of dataScopeConfigs) {
    const role = roleMap.get(config.role);
    if (!role) {
      console.log(`  ⚠️  角色不存在: ${config.role}`);
      continue;
    }

    // 检查是否已存在
    const existing = await dataScopeRepo.findOne({
      where: { roleId: role.id, resourceType: config.resourceType },
    });

    if (!existing) {
      const dataScope = dataScopeRepo.create({
        roleId: role.id,
        resourceType: config.resourceType,
        scopeType: config.scopeType,
        includeSubDepartments: config.includeSubDepartments ?? true,
        description: config.description,
        priority: 100,
        isActive: true,
      });
      await dataScopeRepo.save(dataScope);
      console.log(`  ✅ 创建数据范围: ${config.role} - ${config.resourceType}`);
    } else {
      console.log(`  ⏭️  数据范围已存在: ${config.role} - ${config.resourceType}`);
    }
  }
}

/**
 * 初始化字段权限配置
 */
async function initFieldPermissions(
  connection: Connection,
  roleMap: Map<string, Role>
): Promise<void> {
  const fieldPermRepo = connection.getRepository(FieldPermission);

  console.log('\n🔒 初始化字段权限配置...');

  const fieldPermConfigs = [
    // User 资源 - 普通用户查看时隐藏敏感字段
    {
      role: 'user',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt', 'twoFactorSecret'],
      readOnlyFields: ['id', 'email', 'createdAt', 'updatedAt'],
      description: '普通用户查看用户信息时的字段权限',
    },

    // User 资源 - 管理员查看时
    {
      role: 'admin',
      resourceType: 'user',
      operation: OperationType.VIEW,
      hiddenFields: ['password', 'salt'],
      readOnlyFields: ['id', 'createdAt', 'updatedAt'],
      fieldTransforms: {
        phone: { type: 'mask', pattern: '***-****-{4}' },
        email: { type: 'mask', pattern: '{3}***@***' },
      },
      description: '管理员查看用户信息时的字段权限（带脱敏）',
    },

    // Device 资源 - 普通用户创建设备
    {
      role: 'user',
      resourceType: 'device',
      operation: OperationType.CREATE,
      requiredFields: ['name', 'planId'],
      writableFields: ['name', 'planId', 'description'],
      hiddenFields: ['internalIp', 'nodeId'],
      description: '普通用户创建设备时的字段权限',
    },

    // Order 资源 - 普通用户查看订单
    {
      role: 'user',
      resourceType: 'order',
      operation: OperationType.VIEW,
      readOnlyFields: ['id', 'orderNo', 'amount', 'status', 'createdAt'],
      description: '普通用户查看订单时的字段权限',
    },

    // Order 资源 - 财务管理员导出订单
    {
      role: 'finance_manager',
      resourceType: 'order',
      operation: OperationType.EXPORT,
      // 导出时不脱敏
      description: '财务管理员导出订单时的字段权限（完整数据）',
    },
  ];

  for (const config of fieldPermConfigs) {
    const role = roleMap.get(config.role);
    if (!role) {
      console.log(`  ⚠️  角色不存在: ${config.role}`);
      continue;
    }

    // 检查是否已存在
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
      console.log(
        `  ✅ 创建字段权限: ${config.role} - ${config.resourceType} - ${config.operation}`
      );
    } else {
      console.log(
        `  ⏭️  字段权限已存在: ${config.role} - ${config.resourceType} - ${config.operation}`
      );
    }
  }
}

/**
 * 创建默认超级管理员用户
 */
async function createDefaultAdmin(
  connection: Connection,
  roleMap: Map<string, Role>
): Promise<void> {
  const userRepo = connection.getRepository(User);

  console.log('\n👤 创建默认管理员用户...');

  const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });

  if (!existingAdmin) {
    const superAdminRole = roleMap.get('super_admin');
    if (!superAdminRole) {
      console.log('  ⚠️  Super Admin 角色不存在，跳过创建管理员');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = userRepo.create({
      username: 'admin',
      email: 'admin@cloudphone.com',
      password: hashedPassword,
      phone: '13800138000',
      isSuperAdmin: true,
      dataScope: 'all',
      roles: [superAdminRole],
    });

    await userRepo.save(admin);
    console.log('  ✅ 创建管理员用户: admin / admin123');
    console.log('  ⚠️  请在生产环境中立即修改默认密码！');
  } else {
    console.log('  ⏭️  管理员用户已存在');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始初始化权限系统...\n');

  let connection: Connection | undefined;

  try {
    // 创建数据库连接
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

    // 4. 初始化字段权限配置
    await initFieldPermissions(connection, roleMap);

    // 5. 创建默认管理员
    await createDefaultAdmin(connection, roleMap);

    console.log('\n✅ 权限系统初始化完成！');
    console.log('\n📊 统计信息:');
    console.log(`  - 权限数量: ${permissionMap.size}`);
    console.log(`  - 角色数量: ${roleMap.size}`);
    console.log(`  - 数据范围配置: ${await connection.getRepository(DataScope).count()}`);
    console.log(`  - 字段权限配置: ${await connection.getRepository(FieldPermission).count()}`);

    await connection.close();
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    if (connection) {
      await connection.close();
    }
    process.exit(1);
  }
}

// 运行主函数
main();
