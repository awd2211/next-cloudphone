/**
 * React Query Hooks 统一导出
 *
 * 所有带 Zod 验证的 React Query hooks
 */

// ============================================================================
// 第一批核心 Query Hooks
// ============================================================================

// 应用管理
export * from './useApps';

// 工单系统
export * from './useTickets';

// 审计日志
export * from './useAudit';

// 模板管理
export * from './useTemplatesQuery';

// 缓存管理
export * from './useCache';

// ============================================================================
// 第二批 Query Hooks
// ============================================================================

// 订单管理
export * from './useOrders';

// 数据范围
export * from './useDataScopes';

// 菜单权限
export * from './useMenus';

// 事件溯源
export * from './useEvents';

// 设备提供商
export * from './useProviders';

// GPU 资源管理
export * from './useGPU';

// 支付后台管理
export * from './usePaymentAdmin';

// ============================================================================
// 第三批 Query Hooks
// ============================================================================

// 设备快照
export * from './useSnapshots';

// 统计数据
export * from './useStats';

// 调度器
export * from './useSchedulers';

// 生命周期管理
export * from './useLifecycle';

// 队列管理
export * from './useQueues';

// 双因素认证
export * from './useTwoFactor';

// ============================================================================
// 其他已存在的 Query Hooks
// ============================================================================

// 权限管理
export * from './useFieldPermissions';

// 通知系统
export * from './useNotifications';

// 通知模板管理
export * from './useNotificationTemplates';

// 配额管理
export * from './useQuotas';

// ============================================================================
// 核心业务 Query Hooks（新增）
// ============================================================================

// 设备管理
export * from './useDevices';

// 用户管理
export * from './useUsers';

// 角色权限管理
export * from './useRoles';

// 使用记录与计量
export * from './useUsage';

// 计费规则与账单
export * from './useBilling';

// API 密钥管理
export * from './useApiKeys';

// 物理设备管理
export * from './usePhysicalDevices';

// ============================================================================
// 系统管理与监控 Query Hooks (新增)
// ============================================================================

// 故障转移管理
export * from './useFailoverManagement';

// 通知中心
export * from './useNotificationCenter';

// 实时配额监控
export * from './useRealtimeQuota';

// 状态恢复
export * from './useStateRecovery';

// 统计仪表盘
export * from './useStatsDashboard';

// ============================================================================
// 工具函数 (从 utils 导入)
// ============================================================================

export { useValidatedQuery, useValidatedMutation, ensureArray, safeGet } from '../utils/useValidatedQuery';
